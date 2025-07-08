export interface Transaction {
  date: string; // ISO-8601 format
  description: string;
  category: string;
  amount: number;
  currency: string;
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

export interface ExtractionResult {
  transactions: Transaction[];
  usage: LLMUsage;
}

export interface LLMProvider {
  extractTransactions(pageText: string): Promise<ExtractionResult>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}
