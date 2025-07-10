import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, ExtractionResult, Transaction, LLMUsage } from './types';
import { Category } from '@/types';
import { sanitizeTextForLLM } from '@/utils/dataSanitization';

export class GeminiService implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-2.0-flash") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    // Use Gemini 2.0 Flash model
    this.model = this.genAI.getGenerativeModel({ 
      model: this.modelName
    });
  }

  async extractTransactions(pageText: string, userCategories: Category[] = []): Promise<ExtractionResult> {
    // Log user categories for debugging
    console.log('🎯 GEMINI SERVICE - User categories received:', userCategories.length);
    if (userCategories.length > 0) {
      console.log('🎯 GEMINI SERVICE - Category names:', userCategories.map(cat => cat.name));
    } else {
      console.log('⚠️ GEMINI SERVICE - No user categories provided, using default examples');
    }

    // Sanitize the input text to protect sensitive information
    const sanitizationResult = sanitizeTextForLLM(pageText);
    const sanitizedPageText = sanitizationResult.sanitizedText;
    
    // Log sanitization summary
    if (sanitizationResult.detectedPatterns.length > 0) {
      console.log('🔐 Sanitized sensitive data before sending to Gemini LLM');
      console.log('🔐 Sanitization summary:', sanitizationResult.summary);
    }

    // Build suggested category description based on user categories
    let categoriesDescription = "automatically classified category based on description";
    if (userCategories.length > 0) {
      const categoryNames = userCategories.map(cat => cat.name).join(', ');
      categoriesDescription = `one of the user's preferred categories: ${categoryNames}`;
    } else {
      categoriesDescription += " (e.g., food, transport, insurance, interest, transfer, etc.)";
    }

    // Build categorization guidelines based on user categories
    let categorizationGuidelines = "";
    if (userCategories.length > 0) {
      categorizationGuidelines = `3. **Smart Categorization**: ONLY use the user's preferred categories listed above. Match transactions to the most appropriate category from the user's list based on the transaction description.`;
    } else {
      categorizationGuidelines = `3. **Smart Categorization**: Analyze transaction descriptions to suggest appropriate categories:
       - Shopping/retail transactions → "shopping"
       - Food delivery, restaurants → "food"
       - Transportation, fuel, parking → "transport"
       - Utility bills, phone bills → "utilities"
       - ATM withdrawals → "cash_withdrawal"
       - Salary deposits → "salary"
       - Investment transactions → "investment"
       - Insurance payments → "insurance"
       - Transfer between accounts → "transfer"
       - Interest earned → "interest"
       - Fees and charges → "fees"`;
    }

    const prompt = `
    Analyze the bank statement or transaction data provided below and extract individual transactions. Your goal is to create a structured list of financial transactions with accurate categorization.

    Return ONLY valid JSON with the following structure:

    {
      "transactions": [
        {
          "date": "YYYY-MM-DD",
          "description": "transaction description (cleaned and readable)",
          "amount": number (positive for credits, negative for debits),
          "suggested_category": "${categoriesDescription}"
        }
      ]
    }

    Critical Guidelines:
    1. **Credit/Debit Detection**: Use balance changes to determine transaction direction. If balance increases, the transaction is a credit (positive amount). If balance decreases, it's a debit (negative amount).
    
    2. **Description Cleaning**: Remove unnecessary codes, reference numbers, and redundant information. Make descriptions human-readable and concise.
    
    ${categorizationGuidelines}
    
    4. **Data Filtering**: 
       - Ignore opening/closing balance entries
       - Skip summary rows and totals
       - Focus only on individual transaction line items
    
    5. **Multi-line Handling**: If transaction data spans multiple lines (common in Indian bank statements), merge them into a single coherent entry.
    
    6. **Date Formatting**: Convert all dates to YYYY-MM-DD format regardless of the source format.

    Text to analyze:
    ${sanitizedPageText}

    Return ONLY the JSON object, no additional text or formatting.
    `;

    try {
      console.log(`Calling Gemini API with model: ${this.modelName}`);
      console.log('=== PROMPT SENT TO GEMINI LLM ===');
      console.log(prompt);
      console.log('=== END OF PROMPT ===');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('=== RESPONSE FROM GEMINI LLM ===');
      console.log(text);
      console.log('=== END OF RESPONSE ===');
      
      // Extract usage information
      const usage: LLMUsage = {
        prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount || 0
      };

      // Parse the JSON response
      let parsedResponse;
      try {
        // Clean the response text to extract only JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : text;
        parsedResponse = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse Gemini response as JSON:', text);
        return {
          transactions: [],
          usage
        };
      }

      // Map Gemini response to internal Transaction format
      const transactions: Transaction[] = Array.isArray(parsedResponse.transactions)
        ? parsedResponse.transactions.map((txn: any) => {
            console.log(`[DEBUG] Raw transaction from Gemini:`, {
              description: txn.description,
              amount: txn.amount,
              amountType: typeof txn.amount
            });
            
            // Determine transaction type based on amount sign
            const transaction_type = txn.amount > 0 ? 'income' : 'expense';
            
            const mappedTransaction = {
              ...txn,
              category: txn.suggested_category || txn.category || 'Uncategorized',
              currency: txn.currency || 'INR', // Default to INR for Indian bank statements
              type: transaction_type, // Legacy field for compatibility
              transaction_type: transaction_type, // New field for database
            };
            
            console.log(`[DEBUG] Mapped transaction:`, {
              description: mappedTransaction.description,
              amount: mappedTransaction.amount,
              amountType: typeof mappedTransaction.amount,
              type: mappedTransaction.type
            });
            
            return mappedTransaction;
          }).filter((transaction: any) => this.isValidTransaction(transaction))
        : [];

      return {
        transactions,
        usage
      };
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      console.error('Model used:', this.modelName);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Provide more specific error information
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('API_KEY') || error.message.includes('401')) {
          errorMessage = 'Invalid API key. Please check your GEMINI_API_KEY environment variable.';
        } else if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Network error: Unable to connect to Gemini API. Please check your internet connection and firewall settings.';
        } else if (error.message.includes('quota') || error.message.includes('429')) {
          errorMessage = 'API quota exceeded. Please check your Gemini API usage limits.';
        } else if (error.message.includes('permission') || error.message.includes('403')) {
          errorMessage = 'Permission denied. Please verify your API key has the necessary permissions.';
        } else if (error.message.includes('404') || error.message.includes('not found')) {
          errorMessage = `Model "${this.modelName}" not found. Please check if the model name is correct.`;
        } else if (error.message.includes('400')) {
          errorMessage = 'Bad request. Please check your API request format.';
        } else {
          errorMessage = `API Error: ${error.message}`;
        }
      }
      
      // Throw a more descriptive error for the UI to handle
      throw new Error(errorMessage);
    }
  }

  /**
   * Test the API connection and validate the API key
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Testing connection with model: ${this.modelName}`);
      const testPrompt = "Say hello";
      const result = await this.model.generateContent(testPrompt);
      const response = await result.response;
      const text = await response.text(); // Just to ensure the response is valid
      
      console.log('Connection test successful, response:', text.substring(0, 100));
      return { success: true };
    } catch (error) {
      console.error('Connection test failed:', error);
      console.error('Model used:', this.modelName);
      
      let errorMessage = 'Connection test failed';
      if (error instanceof Error) {
        if (error.message.includes('API_KEY') || error.message.includes('401')) {
          errorMessage = 'Invalid API key';
        } else if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
          errorMessage = 'Network connection failed - unable to reach Google AI servers';
        } else if (error.message.includes('404') || error.message.includes('not found')) {
          errorMessage = `Model "${this.modelName}" not found`;
        } else if (error.message.includes('403')) {
          errorMessage = 'API access forbidden - check your API key permissions';
        } else if (error.message.includes('429')) {
          errorMessage = 'Rate limit exceeded';
        } else {
          errorMessage = `Connection error: ${error.message}`;
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }

  private isValidTransaction(transaction: any): transaction is Transaction {
    return (
      transaction &&
      typeof transaction.date === 'string' &&
      typeof transaction.description === 'string' &&
      typeof transaction.amount === 'number' &&
      this.isValidDate(transaction.date)
    );
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && Boolean(dateString.match(/^\d{4}-\d{2}-\d{2}$/));
  }
}
