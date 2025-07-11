/**
 * Enhanced LLM Service with automatic provider switching
 * Supports both production LLM providers and development custom endpoint
 */

import { LLMProvider as LLMProviderType } from '@/types/llm';
import { LLMProvider, ExtractionResult } from './types';
import { Category } from '@/types';
import { createLLMProvider } from './LLMProviderFactory';
import { getActiveLLMProvider, getLLMLoggingConfig } from './config';

export class EnhancedLLMService {
  private provider: LLMProvider;
  private config: LLMProviderType;
  private loggingConfig = getLLMLoggingConfig();

  constructor(userLLMProvider?: LLMProviderType) {
    // Get the active provider (custom endpoint or production)
    this.config = getActiveLLMProvider(userLLMProvider);
    
    // Create the actual provider instance
    this.provider = createLLMProvider(this.config);
  }

  /**
   * Extract transactions with automatic provider switching
   */
  async extractTransactions(pageText: string, userCategories?: Category[]): Promise<ExtractionResult> {
    try {
      const result = await this.provider.extractTransactions(pageText, userCategories);
      
      return result;
    } catch (error) {
      this.logError('Transaction extraction failed:', error);
      throw error;
    }
  }

  /**
   * Test connection with current provider
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.provider.testConnection();
      
      if (!result.success) {
        this.logError('Connection test failed:', result.error);
      }
      
      return result;
    } catch (error) {
      this.logError('Connection test error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get information about the current provider
   */
  getProviderInfo(): {
    type: string;
    name: string;
    endpoint?: string;
    isCustomEndpoint: boolean;
  } {
    return {
      type: this.config.provider_type,
      name: this.config.name,
      endpoint: this.config.api_endpoint,
      isCustomEndpoint: this.config.provider_type === 'custom'
    };
  }

  /**
   * Switch to a different provider (useful for testing)
   */
  async switchProvider(newProvider: LLMProviderType): Promise<void> {
    this.config = newProvider;
    this.provider = createLLMProvider(this.config);
    
    // Test the new provider
    const testResult = await this.testConnection();
    if (!testResult.success) {
      throw new Error(`Failed to switch to new provider: ${testResult.error}`);
    }
  }

  // Logging methods with environment-based configuration
  private logInfo(message: string, ...args: any[]): void {
    if (this.loggingConfig.enableDebugLogs) {
      console.log(`[LLM Service] ${message}`, ...args);
    }
  }

  private logError(message: string, ...args: any[]): void {
    console.error(`[LLM Service] ${message}`, ...args);
  }

  private logDebug(message: string, ...args: any[]): void {
    if (this.loggingConfig.enableDebugLogs) {
      console.debug(`[LLM Service] ${message}`, ...args);
    }
  }
}

/**
 * Factory function to create enhanced LLM service
 */
export function createEnhancedLLMService(userLLMProvider?: LLMProviderType): EnhancedLLMService {
  return new EnhancedLLMService(userLLMProvider);
}

/**
 * Singleton instance for global use
 */
let globalLLMService: EnhancedLLMService | null = null;

/**
 * Get or create global LLM service instance
 */
export function getGlobalLLMService(userLLMProvider?: LLMProviderType): EnhancedLLMService {
  if (!globalLLMService) {
    globalLLMService = new EnhancedLLMService(userLLMProvider);
  }
  return globalLLMService;
}

/**
 * Reset global LLM service (useful for testing or provider changes)
 */
export function resetGlobalLLMService(): void {
  globalLLMService = null;
}
