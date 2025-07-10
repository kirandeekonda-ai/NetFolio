import { LLMProvider, ExtractionResult } from './types';
import { Category } from '@/types';
import { sanitizeTextForLLM } from '@/utils/dataSanitization';
import { transactionPromptBuilder } from './PromptTemplateService';

/**
 * Custom Endpoint Service for development purposes
 * Implements the same LLMProvider interface but calls your custom hosted endpoint
 */
export class CustomEndpointService implements LLMProvider {
  private endpoint: string;
  private apiKey?: string;

  constructor(config: {
    endpoint: string;
    api_key?: string;
  }) {
    this.endpoint = config.endpoint;
    this.apiKey = config.api_key;
  }

  async extractTransactions(pageText: string, userCategories: Category[] = []): Promise<ExtractionResult> {
    // Log user categories for debugging
    console.log('🎯 CUSTOM ENDPOINT SERVICE - User categories received:', userCategories.length);
    if (userCategories.length > 0) {
      console.log('🎯 CUSTOM ENDPOINT SERVICE - Category names:', userCategories.map(cat => cat.name));
    } else {
      console.log('⚠️ CUSTOM ENDPOINT SERVICE - No user categories provided, using default examples');
    }

    // Sanitize the input text to protect sensitive information
    const sanitizationResult = sanitizeTextForLLM(pageText);
    const sanitizedPageText = sanitizationResult.sanitizedText;
    
    // Log sanitization summary
    if (sanitizationResult.detectedPatterns.length > 0) {
      console.log('🔐 Sanitized sensitive data before sending to Custom Endpoint');
      console.log('🔐 Sanitization summary:', sanitizationResult.summary);
    }

    // Build prompt using centralized template service
    const prompt = transactionPromptBuilder.buildTransactionExtractionPrompt(
      sanitizedPageText,
      userCategories
    );

    try {
      console.log('=== PROMPT SENT TO CUSTOM ENDPOINT ===');
      console.log('Endpoint:', this.endpoint);
      console.log('Prompt:', prompt);
      console.log('=== END OF PROMPT ===');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if provided
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: prompt
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Custom endpoint error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const text = data.response;

      console.log('=== RESPONSE FROM CUSTOM ENDPOINT ===');
      console.log('Raw response:', data);
      console.log('Extracted text:', text);
      console.log('=== END OF RESPONSE ===');

      if (!text) {
        throw new Error('No response from custom endpoint');
      }

      // Mock usage data since custom endpoint doesn't provide it
      const usage = {
        prompt_tokens: prompt.length / 4, // Rough estimate
        completion_tokens: text.length / 4, // Rough estimate
      };

      // Parse the JSON response
      let parsedResponse;
      try {
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : text;
        parsedResponse = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse custom endpoint response as JSON:', text);
        // Return empty transactions if parsing fails
        return {
          transactions: [],
          usage
        };
      }

      // Validate and transform the response
      const transactions = parsedResponse.transactions || [];
      const validTransactions = transactions.map((tx: any) => {
        const amount = parseFloat(tx.amount) || 0;
        const transaction_type = amount > 0 ? 'income' : 'expense';
        
        return {
          date: tx.date || new Date().toISOString().split('T')[0],
          description: tx.description || 'Unknown transaction',
          category: tx.suggested_category || tx.category || 'Uncategorized',
          amount: amount,
          currency: tx.currency || 'INR', // Default to INR for Indian bank statements
          type: transaction_type, // Legacy field for compatibility
          transaction_type: transaction_type, // New field for database
        };
      });

      return {
        transactions: validTransactions,
        usage
      };

    } catch (error) {
      console.error('Custom endpoint service error:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Testing connection to custom endpoint:', this.endpoint);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: transactionPromptBuilder.buildConnectionTestPrompt()
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const data = await response.json();
      
      if (data.response) {
        console.log('Custom endpoint test successful:', data.response);
        return { success: true };
      } else {
        return {
          success: false,
          error: 'No response field in custom endpoint response'
        };
      }

    } catch (error) {
      console.error('Custom endpoint test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
