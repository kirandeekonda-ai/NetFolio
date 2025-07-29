/**
 * LLM Service Implementation
 * 
 * Standardized service layer that wraps existing LLM provider implementations
 * with consistent error handling, logging, and provider abstraction.
 */

import { LoggingService } from '../logging/LoggingService';
import { createLLMProvider } from '@/lib/llm/LLMProviderFactory';
import { LLMProvider as ExistingLLMProvider } from '@/lib/llm/types';
import { Category } from '@/types';
import {
  LLMServiceInterface,
  LLMProvider,
  LLMConfig,
  TransactionExtractionResult,
  BalanceExtractionResult
} from './types';

class LLMServiceImpl implements LLMServiceInterface {
  private logger = LoggingService.setContext('LLMService');
  private currentProvider: LLMProvider = 'gemini';
  private config: LLMConfig | null = null;
  private providerInstance: ExistingLLMProvider | null = null;

  constructor() {
    this.logger.info('LLM service initialized');
  }

  // Configuration methods
  setProvider(provider: LLMProvider): void {
    this.logger.info('Setting LLM provider', { provider });
    this.currentProvider = provider;
    this.providerInstance = null; // Reset instance to force re-initialization
  }

  setConfig(config: LLMConfig): void {
    this.logger.info('Setting LLM config', { provider: config.provider, model: config.model });
    this.config = config;
    this.currentProvider = config.provider;
    this.providerInstance = null; // Reset instance to force re-initialization
  }

  getAvailableProviders(): LLMProvider[] {
    return ['gemini', 'openai', 'azure-openai', 'custom'];
  }

  // Transaction extraction methods
  async extractTransactionsFromText(text: string, userCategories: Category[] = []): Promise<TransactionExtractionResult> {
    try {
      this.logger.debug('Extracting transactions from text', { 
        provider: this.currentProvider,
        textLength: text.length,
        categoryCount: userCategories.length
      });

      const startTime = Date.now();
      const provider = await this.getProviderInstance();
      
      if (!provider) {
        throw new Error('No LLM provider configured');
      }

      const result = await provider.extractTransactions(text, userCategories);
      const processingTime = Date.now() - startTime;

      // Transform to our standardized result format
      const standardResult: TransactionExtractionResult = {
        transactions: result.transactions.map(t => ({
          date: t.date,
          amount: t.amount,
          description: t.description,
          type: t.amount >= 0 ? 'credit' : 'debit',
          category: t.category
        })),
        confidence: result.balance_data?.balance_confidence || 85, // Default confidence if not provided
        totalTransactions: result.transactions.length,
        processingTime
      };

      this.logger.info('Successfully extracted transactions from text', {
        provider: this.currentProvider,
        transactionCount: standardResult.totalTransactions,
        processingTime,
        confidence: standardResult.confidence
      });

      return standardResult;
    } catch (error) {
      this.logger.error('Failed to extract transactions from text', error as Error, {
        provider: this.currentProvider,
        textLength: text.length
      });
      throw new Error(`Transaction extraction failed: ${(error as Error).message}`);
    }
  }

  async extractTransactionsFromPDF(pdfBuffer: Buffer): Promise<TransactionExtractionResult> {
    try {
      this.logger.debug('Extracting transactions from PDF', { 
        provider: this.currentProvider,
        bufferSize: pdfBuffer.length
      });

      // For PDF processing, we would need to extract text first
      // This is a placeholder - in the actual implementation, you'd:
      // 1. Use pdfjs-dist or similar to extract text from PDF
      // 2. Then call extractTransactionsFromText
      
      throw new Error('PDF transaction extraction not yet implemented in service layer');
    } catch (error) {
      this.logger.error('Failed to extract transactions from PDF', error as Error, {
        provider: this.currentProvider,
        bufferSize: pdfBuffer.length
      });
      throw error;
    }
  }

  // Balance extraction methods
  async extractBalanceFromText(text: string): Promise<BalanceExtractionResult> {
    try {
      this.logger.debug('Extracting balance from text', { 
        provider: this.currentProvider,
        textLength: text.length
      });

      const provider = await this.getProviderInstance();
      
      if (!provider) {
        throw new Error('No LLM provider configured');
      }

      // Use transaction extraction to get balance data
      const result = await provider.extractTransactions(text, []);
      
      if (!result.balance_data) {
        throw new Error('No balance data found in text');
      }

      const balanceResult: BalanceExtractionResult = {
        balance: result.balance_data.closing_balance || result.balance_data.current_balance || 0,
        confidence: result.balance_data.balance_confidence,
        extractedText: result.balance_data.balance_extraction_notes
      };

      this.logger.info('Successfully extracted balance from text', {
        provider: this.currentProvider,
        balance: balanceResult.balance,
        confidence: balanceResult.confidence
      });

      return balanceResult;
    } catch (error) {
      this.logger.error('Failed to extract balance from text', error as Error, {
        provider: this.currentProvider,
        textLength: text.length
      });
      throw new Error(`Balance extraction failed: ${(error as Error).message}`);
    }
  }

  async extractBalanceFromPDF(pdfBuffer: Buffer): Promise<BalanceExtractionResult> {
    try {
      this.logger.debug('Extracting balance from PDF', { 
        provider: this.currentProvider,
        bufferSize: pdfBuffer.length
      });

      // Similar to PDF transaction extraction - placeholder for now
      throw new Error('PDF balance extraction not yet implemented in service layer');
    } catch (error) {
      this.logger.error('Failed to extract balance from PDF', error as Error, {
        provider: this.currentProvider,
        bufferSize: pdfBuffer.length
      });
      throw error;
    }
  }

  // Health check methods
  async testConnection(): Promise<boolean> {
    try {
      this.logger.debug('Testing LLM provider connection', { provider: this.currentProvider });

      const provider = await this.getProviderInstance();
      
      if (!provider) {
        this.logger.warn('No LLM provider configured for connection test');
        return false;
      }

      const testResult = await provider.testConnection();
      
      this.logger.info('LLM provider connection test completed', {
        provider: this.currentProvider,
        success: testResult.success,
        error: testResult.error
      });

      return testResult.success;
    } catch (error) {
      this.logger.error('LLM provider connection test failed', error as Error, {
        provider: this.currentProvider
      });
      return false;
    }
  }

  async getProviderStatus(): Promise<{ provider: LLMProvider; available: boolean; latency?: number }> {
    try {
      const startTime = Date.now();
      const available = await this.testConnection();
      const latency = available ? Date.now() - startTime : undefined;

      return {
        provider: this.currentProvider,
        available,
        latency
      };
    } catch (error) {
      this.logger.error('Failed to get provider status', error as Error);
      return {
        provider: this.currentProvider,
        available: false
      };
    }
  }

  // Private helper methods
  private async getProviderInstance(): Promise<ExistingLLMProvider | null> {
    try {
      if (this.providerInstance) {
        return this.providerInstance;
      }

      if (!this.config) {
        this.logger.warn('No LLM config set, cannot create provider instance');
        return null;
      }

      // Use the existing createLLMProvider function to create provider instances
      this.providerInstance = createLLMProvider({
        provider: this.mapProviderName(this.currentProvider),
        api_key: this.config.apiKey,
        endpoint: this.config.endpoint,
        model_name: this.config.model,
        // Add other config mappings as needed
      } as any);

      this.logger.info('Created LLM provider instance', { provider: this.currentProvider });
      return this.providerInstance;
    } catch (error) {
      this.logger.error('Failed to create LLM provider instance', error as Error, {
        provider: this.currentProvider
      });
      return null;
    }
  }

  private mapProviderName(provider: LLMProvider): string {
    // Map our service layer provider names to existing provider names
    switch (provider) {
      case 'gemini':
        return 'google-gemini';
      case 'openai':
        return 'openai';
      case 'azure-openai':
        return 'azure-openai';
      case 'custom':
        return 'custom-endpoint';
      default:
        return 'google-gemini';
    }
  }
}

// Export singleton instance
export const LLMService = new LLMServiceImpl();

// Export class for testing and custom instances
export { LLMServiceImpl };
