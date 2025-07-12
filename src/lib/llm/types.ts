import { Category } from '@/types';

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

export interface SecurityBreakdown {
  accountNumbers: number;
  mobileNumbers: number;
  emails: number;
  panIds: number;
  customerIds: number;
  ifscCodes: number;
  cardNumbers: number;
  addresses: number;
  names: number;
}

export interface ExtractionResult {
  transactions: Transaction[];
  usage: LLMUsage;
  securityBreakdown?: SecurityBreakdown;
}

export interface LLMProvider {
  extractTransactions(pageText: string, userCategories?: Category[]): Promise<ExtractionResult>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}
