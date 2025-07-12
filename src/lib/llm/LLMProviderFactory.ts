import { LLMProvider as LLMProviderType } from '@/types/llm';
import { GeminiService } from './GeminiService';
import { CustomEndpointService } from './CustomEndpointService';
import { LLMProvider, ExtractionResult } from './types';
import { Category } from '@/types';
import { sanitizeTextForLLM } from '@/utils/dataSanitization';
import { transactionPromptBuilder } from './PromptTemplateService';

// Azure OpenAI Service implementation
export class AzureOpenAIService implements LLMProvider {
  private apiKey: string;
  private resourceName: string;
  private deploymentName: string;
  private apiVersion: string;
  private modelName: string;

  constructor(config: {
    api_key: string;
    azure_resource_name: string;
    azure_deployment_name: string;
    azure_api_version: string;
    model_name?: string;
  }) {
    this.apiKey = config.api_key;
    this.resourceName = config.azure_resource_name;
    this.deploymentName = config.azure_deployment_name;
    this.apiVersion = config.azure_api_version;
    this.modelName = config.model_name || 'gpt-4o-mini';
  }

  async extractTransactions(pageText: string, userCategories: Category[] = []): Promise<ExtractionResult> {
    // Log user categories for debugging
    console.log('🎯 AZURE OPENAI SERVICE - User categories received:', userCategories.length);
    if (userCategories.length > 0) {
      console.log('🎯 AZURE OPENAI SERVICE - Category names:', userCategories.map(cat => cat.name));
    } else {
      console.log('⚠️ AZURE OPENAI SERVICE - No user categories provided, using default examples');
    }

    // Sanitize the input text to protect sensitive information
    const sanitizationResult = sanitizeTextForLLM(pageText);
    const sanitizedPageText = sanitizationResult.sanitizedText;
    
    // Log sanitization summary
    if (sanitizationResult.detectedPatterns.length > 0) {
      console.log('🔐 Sanitized sensitive data before sending to Azure OpenAI');
      console.log('🔐 Sanitization summary:', sanitizationResult.summary);
    }

    // Build prompt using centralized template service
    const prompt = transactionPromptBuilder.buildTransactionExtractionPrompt(
      sanitizedPageText,
      userCategories
    );

    console.log('🔷 AZURE OPENAI - Complete prompt being sent:');
    console.log('=' .repeat(100));
    console.log(prompt);
    console.log('=' .repeat(100));

    const endpoint = `https://${this.resourceName}.openai.azure.com/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

    console.log('🔷 AZURE OPENAI - Sending to endpoint:', endpoint);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Azure OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      console.log('🔷 AZURE OPENAI - Raw response received:');
      console.log('-' .repeat(50));
      console.log(text);
      console.log('-' .repeat(50));

      if (!text) {
        throw new Error('No response from Azure OpenAI API');
      }

      const usage = {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0
      };

      // Parse the JSON response
      let parsedResponse;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : text;
        parsedResponse = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse Azure OpenAI response as JSON:', text);
        return {
          transactions: [],
          usage,
          securityBreakdown: sanitizationResult.summary
        };
      }

      const transactions = Array.isArray(parsedResponse.transactions) 
        ? parsedResponse.transactions
            .map((txn: any) => {
              const amount = parseFloat(txn.amount) || 0;
              const transaction_type = amount > 0 ? 'income' : 'expense';
              
              return {
                ...txn,
                category: txn.suggested_category || txn.category || 'Uncategorized',
                currency: txn.currency || 'INR', // Default to INR for Indian bank statements
                type: transaction_type, // Legacy field for compatibility
                transaction_type: transaction_type, // New field for database
                amount: amount
              };
            })
            .filter((transaction: any) => this.isValidTransaction(transaction))
        : [];

      return {
        transactions,
        usage,
        securityBreakdown: sanitizationResult.summary
      };
    } catch (error) {
      console.error('Error calling Azure OpenAI API:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testPrompt = transactionPromptBuilder.buildConnectionTestPrompt();
      const endpoint = `https://${this.resourceName}.openai.azure.com/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: testPrompt }
          ],
          max_tokens: 50,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error?.message || `HTTP ${response.status}` 
        };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        return { success: false, error: 'No response from Azure OpenAI API' };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private isValidTransaction(transaction: any): boolean {
    // Accept transactions even if currency is missing; default to 'INR' if not present
    if (transaction && typeof transaction.currency !== 'string') {
      transaction.currency = 'INR';
    }
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
    return !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  }
}

// OpenAI Service implementation
export class OpenAIService implements LLMProvider {
  private apiKey: string;
  private modelName: string;
  private endpoint: string;

  constructor(config: {
    api_key: string;
    model_name: string;
    api_endpoint?: string;
  }) {
    this.apiKey = config.api_key;
    this.modelName = config.model_name;
    this.endpoint = config.api_endpoint || 'https://api.openai.com/v1';
  }

  async extractTransactions(pageText: string, userCategories: Category[] = []): Promise<ExtractionResult> {
    // Log user categories for debugging
    console.log('🎯 OPENAI SERVICE - User categories received:', userCategories.length);
    if (userCategories.length > 0) {
      console.log('🎯 OPENAI SERVICE - Category names:', userCategories.map(cat => cat.name));
    } else {
      console.log('⚠️ OPENAI SERVICE - No user categories provided, using default examples');
    }

    // Sanitize the input text to protect sensitive information
    const sanitizationResult = sanitizeTextForLLM(pageText);
    const sanitizedPageText = sanitizationResult.sanitizedText;
    
    // Log sanitization summary
    if (sanitizationResult.detectedPatterns.length > 0) {
      console.log('🔐 Sanitized sensitive data before sending to OpenAI');
      console.log('🔐 Sanitization summary:', sanitizationResult.summary);
    }

    // Build prompt using centralized template service
    const prompt = transactionPromptBuilder.buildTransactionExtractionPrompt(
      sanitizedPageText,
      userCategories
    );

    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error('No response from OpenAI API');
      }

      const usage = {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0
      };

      // Parse the JSON response
      let parsedResponse;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : text;
        parsedResponse = JSON.parse(jsonText);
      } catch (parseError) {
        return {
          transactions: [],
          usage,
          securityBreakdown: sanitizationResult.summary
        };
      }

      const transactions = Array.isArray(parsedResponse.transactions) 
        ? parsedResponse.transactions
            .map((txn: any) => {
              const amount = parseFloat(txn.amount) || 0;
              const transaction_type = amount > 0 ? 'income' : 'expense';
              
              return {
                ...txn,
                category: txn.suggested_category || txn.category || 'Uncategorized',
                currency: txn.currency || 'INR', // Default to INR for Indian bank statements
                type: transaction_type, // Legacy field for compatibility
                transaction_type: transaction_type, // New field for database
                amount: amount
              };
            })
            .filter((transaction: any) => this.isValidTransaction(transaction))
        : [];

      return {
        transactions,
        usage,
        securityBreakdown: sanitizationResult.summary
      };
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testPrompt = transactionPromptBuilder.buildConnectionTestPrompt();
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'user', content: testPrompt }
          ],
          max_tokens: 50,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error?.message || `HTTP ${response.status}` 
        };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        return { success: false, error: 'No response from OpenAI API' };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private isValidTransaction(transaction: any): boolean {
    // Accept transactions even if currency is missing; default to 'INR' if not present
    if (transaction && typeof transaction.currency !== 'string') {
      transaction.currency = 'INR';
    }
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
    return !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  }
}

// Factory function to create LLM provider instances
export function createLLMProvider(config: LLMProviderType): LLMProvider {
  console.log('🏭 FACTORY - Creating LLM provider:', config.provider_type);
  
  switch (config.provider_type) {
    case 'gemini':
      if (!config.api_key) {
        throw new Error('API key is required for Gemini provider');
      }
      return new GeminiService(config.api_key, config.model_name);

    case 'azure_openai':
      if (!config.api_key || !config.azure_resource_name || !config.azure_deployment_name || !config.azure_api_version) {
        throw new Error('API key, resource name, deployment name, and API version are required for Azure OpenAI provider');
      }
      return new AzureOpenAIService({
        api_key: config.api_key,
        azure_resource_name: config.azure_resource_name,
        azure_deployment_name: config.azure_deployment_name,
        azure_api_version: config.azure_api_version,
        model_name: config.model_name
      });

    case 'openai':
      if (!config.api_key || !config.model_name) {
        throw new Error('API key and model name are required for OpenAI provider');
      }
      return new OpenAIService({
        api_key: config.api_key,
        model_name: config.model_name,
        api_endpoint: config.api_endpoint
      });

    case 'custom':
      if (!config.api_endpoint) {
        throw new Error('API endpoint is required for custom provider');
      }
      return new CustomEndpointService({
        endpoint: config.api_endpoint,
        api_key: config.api_key
      });

    default:
      throw new Error(`Unsupported provider type: ${config.provider_type}`);
  }
}
