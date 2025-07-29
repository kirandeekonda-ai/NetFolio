/**
 * LLM Service Types
 * 
 * Type definitions for the NetFolio LLM service layer
 */

export type LLMProvider = 'gemini' | 'openai' | 'azure-openai' | 'custom';

export interface TransactionExtractionResult {
  transactions: Array<{
    date: string;
    amount: number;
    description: string;
    type: 'credit' | 'debit';
    category?: string;
  }>;
  confidence: number;
  totalTransactions: number;
  processingTime: number;
}

export interface BalanceExtractionResult {
  balance: number;
  confidence: number;
  currency?: string;
  accountType?: string;
  extractedText?: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  endpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMServiceInterface {
  // Configuration
  setProvider(provider: LLMProvider): void;
  setConfig(config: LLMConfig): void;
  getAvailableProviders(): LLMProvider[];

  // Transaction extraction
  extractTransactionsFromText(text: string): Promise<TransactionExtractionResult>;
  extractTransactionsFromPDF(pdfBuffer: Buffer): Promise<TransactionExtractionResult>;

  // Balance extraction
  extractBalanceFromText(text: string): Promise<BalanceExtractionResult>;
  extractBalanceFromPDF(pdfBuffer: Buffer): Promise<BalanceExtractionResult>;

  // Health checks
  testConnection(): Promise<boolean>;
  getProviderStatus(): Promise<{ provider: LLMProvider; available: boolean; latency?: number }>;
}
