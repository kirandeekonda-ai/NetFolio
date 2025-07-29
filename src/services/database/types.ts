/**
 * Database Service Types
 * 
 * Type definitions for the NetFolio database service layer
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface TransactionData {
  id?: string;
  user_id: string;
  bank_account_id: string;
  amount: number;
  description: string;
  date: string;
  category?: string;
  type: 'credit' | 'debit';
  created_at?: string;
  updated_at?: string;
}

export interface BankAccountData {
  id?: string;
  user_id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  balance?: number;
  account_type: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferencesData {
  id?: string;
  user_id: string;
  llm_provider: string;
  default_currency: string;
  categories: string[];
  created_at?: string;
  updated_at?: string;
}

export interface BankStatementData {
  id?: string;
  user_id: string;
  bank_account_id: string;
  file_name: string;
  file_path?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  transactions_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseServiceInterface {
  // Transaction operations
  getTransactions(userId: string, accountId?: string): Promise<TransactionData[]>;
  createTransaction(transaction: Omit<TransactionData, 'id' | 'created_at' | 'updated_at'>): Promise<TransactionData>;
  updateTransaction(id: string, updates: Partial<TransactionData>): Promise<TransactionData>;
  deleteTransaction(id: string): Promise<void>;

  // Bank account operations
  getBankAccounts(userId: string): Promise<BankAccountData[]>;
  createBankAccount(account: Omit<BankAccountData, 'id' | 'created_at' | 'updated_at'>): Promise<BankAccountData>;
  updateBankAccount(id: string, updates: Partial<BankAccountData>): Promise<BankAccountData>;
  deleteBankAccount(id: string): Promise<void>;

  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferencesData | null>;
  createUserPreferences(preferences: Omit<UserPreferencesData, 'id' | 'created_at' | 'updated_at'>): Promise<UserPreferencesData>;
  updateUserPreferences(userId: string, updates: Partial<UserPreferencesData>): Promise<UserPreferencesData>;

  // Bank statement operations
  getBankStatements(userId: string): Promise<BankStatementData[]>;
  createBankStatement(statement: Omit<BankStatementData, 'id' | 'created_at' | 'updated_at'>): Promise<BankStatementData>;
  updateBankStatement(id: string, updates: Partial<BankStatementData>): Promise<BankStatementData>;

  // Financial analytics
  getMonthlyIncome(userId: string, month?: string): Promise<number>;
  getMonthlyExpenses(userId: string, month?: string): Promise<number>;
  getNetBalance(userId: string): Promise<number>;
  getTransactionCount(userId: string): Promise<number>;
  getSpendingByCategory(userId: string, startDate?: string, endDate?: string): Promise<Record<string, number>>;

  // Real-time subscriptions
  subscribeToTransactions(userId: string, callback: (payload: any) => void): () => void;
  subscribeToBankAccounts(userId: string, callback: (payload: any) => void): () => void;
}
