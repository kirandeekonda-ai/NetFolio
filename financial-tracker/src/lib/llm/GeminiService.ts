import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, ExtractionResult, Transaction, LLMUsage } from './types';

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

  async extractTransactions(pageText: string): Promise<ExtractionResult> {
    const prompt = `
    Extract bank transactions from the following text. Return ONLY valid JSON with this exact structure:
    {
      "transactions": [
        {
          "date": "YYYY-MM-DD",
          "description": "transaction description",
          "amount": number (positive for credits, negative for debits),
          "suggested_category": "suggested category name based on description (e.g., food, transport, utilities, etc.)"
        }
      ]
    }

    Text to analyze:
    ${pageText}

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

      // Validate the response structure
      const transactions: Transaction[] = Array.isArray(parsedResponse.transactions) 
        ? parsedResponse.transactions.filter((transaction: any) => this.isValidTransaction(transaction))
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
      typeof transaction.category === 'string' &&
      typeof transaction.amount === 'number' &&
      typeof transaction.currency === 'string' &&
      this.isValidDate(transaction.date)
    );
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && Boolean(dateString.match(/^\d{4}-\d{2}-\d{2}$/));
  }
}
