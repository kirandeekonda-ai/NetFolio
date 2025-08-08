/**
 * Database Service Implementation
 * 
 * Wraps Supabase operations with consistent error handling, logging,
 * and standardized data access patterns for the NetFolio application.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { LoggingService } from '../logging/LoggingService';
import {
  DatabaseServiceInterface,
  TransactionData,
  BankAccountData,
  UserPreferencesData,
  BankStatementData
} from './types';

class DatabaseServiceImpl implements DatabaseServiceInterface {
  private client: SupabaseClient;
  private logger = LoggingService.setContext('DatabaseService');

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
    this.logger.info('Database service initialized');
  }

  // Transaction operations
  async getTransactions(userId: string, accountId?: string): Promise<TransactionData[]> {
    try {
      this.logger.debug('Fetching transactions', { userId, accountId });
      
      let query = this.client
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (accountId) {
        query = query.eq('bank_account_id', accountId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to fetch transactions', error, { userId, accountId });
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }

      this.logger.info('Successfully fetched transactions', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      this.logger.error('Error in getTransactions', error as Error);
      throw error;
    }
  }

  async createTransaction(transaction: Omit<TransactionData, 'id' | 'created_at' | 'updated_at'>): Promise<TransactionData> {
    try {
      this.logger.debug('Creating transaction', { transaction });

      const { data, error } = await this.client
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create transaction', error, { transaction });
        throw new Error(`Failed to create transaction: ${error.message}`);
      }

      this.logger.info('Successfully created transaction', { id: data.id });
      return data;
    } catch (error) {
      this.logger.error('Error in createTransaction', error as Error);
      throw error;
    }
  }

  async updateTransaction(id: string, updates: Partial<TransactionData>): Promise<TransactionData> {
    try {
      this.logger.debug('Updating transaction', { id, updates });

      const { data, error } = await this.client
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update transaction', error, { id, updates });
        throw new Error(`Failed to update transaction: ${error.message}`);
      }

      this.logger.info('Successfully updated transaction', { id });
      return data;
    } catch (error) {
      this.logger.error('Error in updateTransaction', error as Error);
      throw error;
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    try {
      this.logger.debug('Deleting transaction', { id });

      const { error } = await this.client
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        this.logger.error('Failed to delete transaction', error, { id });
        throw new Error(`Failed to delete transaction: ${error.message}`);
      }

      this.logger.info('Successfully deleted transaction', { id });
    } catch (error) {
      this.logger.error('Error in deleteTransaction', error as Error);
      throw error;
    }
  }

  // Bank account operations
  async getBankAccounts(userId: string): Promise<BankAccountData[]> {
    try {
      this.logger.debug('Fetching bank accounts', { userId });

      const { data, error } = await this.client
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to fetch bank accounts', error, { userId });
        throw new Error(`Failed to fetch bank accounts: ${error.message}`);
      }

      this.logger.info('Successfully fetched bank accounts', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      this.logger.error('Error in getBankAccounts', error as Error);
      throw error;
    }
  }

  async createBankAccount(account: Omit<BankAccountData, 'id' | 'created_at' | 'updated_at'>): Promise<BankAccountData> {
    try {
      this.logger.debug('Creating bank account', { account: { ...account, account_number: '[REDACTED]' } });

      const { data, error } = await this.client
        .from('bank_accounts')
        .insert([account])
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create bank account', error);
        throw new Error(`Failed to create bank account: ${error.message}`);
      }

      this.logger.info('Successfully created bank account', { id: data.id });
      return data;
    } catch (error) {
      this.logger.error('Error in createBankAccount', error as Error);
      throw error;
    }
  }

  async updateBankAccount(id: string, updates: Partial<BankAccountData>): Promise<BankAccountData> {
    try {
      this.logger.debug('Updating bank account', { id, updates: { ...updates, account_number: updates.account_number ? '[REDACTED]' : undefined } });

      const { data, error } = await this.client
        .from('bank_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update bank account', error, { id });
        throw new Error(`Failed to update bank account: ${error.message}`);
      }

      this.logger.info('Successfully updated bank account', { id });
      return data;
    } catch (error) {
      this.logger.error('Error in updateBankAccount', error as Error);
      throw error;
    }
  }

  async deleteBankAccount(id: string): Promise<void> {
    try {
      this.logger.debug('Deleting bank account', { id });

      const { error } = await this.client
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        this.logger.error('Failed to delete bank account', error, { id });
        throw new Error(`Failed to delete bank account: ${error.message}`);
      }

      this.logger.info('Successfully deleted bank account', { id });
    } catch (error) {
      this.logger.error('Error in deleteBankAccount', error as Error);
      throw error;
    }
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferencesData | null> {
    try {
      this.logger.debug('Fetching user preferences', { userId });

      const { data, error } = await this.client
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        this.logger.error('Failed to fetch user preferences', error, { userId });
        throw new Error(`Failed to fetch user preferences: ${error.message}`);
      }

      this.logger.info('Successfully fetched user preferences', { hasPreferences: !!data });
      return data;
    } catch (error) {
      this.logger.error('Error in getUserPreferences', error as Error);
      throw error;
    }
  }

  async createUserPreferences(preferences: Omit<UserPreferencesData, 'id' | 'created_at' | 'updated_at'>): Promise<UserPreferencesData> {
    try {
      this.logger.debug('Creating user preferences', { preferences });

      const { data, error } = await this.client
        .from('user_preferences')
        .insert([preferences])
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create user preferences', error, { preferences });
        throw new Error(`Failed to create user preferences: ${error.message}`);
      }

      this.logger.info('Successfully created user preferences', { id: data.id });
      return data;
    } catch (error) {
      this.logger.error('Error in createUserPreferences', error as Error);
      throw error;
    }
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferencesData>): Promise<UserPreferencesData> {
    try {
      this.logger.debug('Updating user preferences', { userId, updates });

      const { data, error } = await this.client
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update user preferences', error, { userId, updates });
        throw new Error(`Failed to update user preferences: ${error.message}`);
      }

      this.logger.info('Successfully updated user preferences', { userId });
      return data;
    } catch (error) {
      this.logger.error('Error in updateUserPreferences', error as Error);
      throw error;
    }
  }

  // Bank statement operations
  async getBankStatements(userId: string): Promise<BankStatementData[]> {
    try {
      this.logger.debug('Fetching bank statements', { userId });

      const { data, error } = await this.client
        .from('bank_statements')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to fetch bank statements', error, { userId });
        throw new Error(`Failed to fetch bank statements: ${error.message}`);
      }

      this.logger.info('Successfully fetched bank statements', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      this.logger.error('Error in getBankStatements', error as Error);
      throw error;
    }
  }

  async createBankStatement(statement: Omit<BankStatementData, 'id' | 'created_at' | 'updated_at'>): Promise<BankStatementData> {
    try {
      this.logger.debug('Creating bank statement', { statement });

      const { data, error } = await this.client
        .from('bank_statements')
        .insert([statement])
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create bank statement', error, { statement });
        throw new Error(`Failed to create bank statement: ${error.message}`);
      }

      this.logger.info('Successfully created bank statement', { id: data.id });
      return data;
    } catch (error) {
      this.logger.error('Error in createBankStatement', error as Error);
      throw error;
    }
  }

  async updateBankStatement(id: string, updates: Partial<BankStatementData>): Promise<BankStatementData> {
    try {
      this.logger.debug('Updating bank statement', { id, updates });

      const { data, error } = await this.client
        .from('bank_statements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update bank statement', error, { id, updates });
        throw new Error(`Failed to update bank statement: ${error.message}`);
      }

      this.logger.info('Successfully updated bank statement', { id });
      return data;
    } catch (error) {
      this.logger.error('Error in updateBankStatement', error as Error);
      throw error;
    }
  }

  // Financial analytics
  async getMonthlyIncome(userId: string, month?: string): Promise<number> {
    try {
      const currentMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM format
      this.logger.debug('Calculating monthly income', { userId, month: currentMonth });

      const { data, error } = await this.client
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .in('type', ['credit', 'income'])
        .eq('is_internal_transfer', false)
        .gte('date', `${currentMonth}-01`)
        .lt('date', `${this.getNextMonth(currentMonth)}-01`);

      if (error) {
        this.logger.error('Failed to calculate monthly income', error, { userId, month: currentMonth });
        throw new Error(`Failed to calculate monthly income: ${error.message}`);
      }

      const total = data?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
      this.logger.info('Successfully calculated monthly income', { total, month: currentMonth });
      return total;
    } catch (error) {
      this.logger.error('Error in getMonthlyIncome', error as Error);
      throw error;
    }
  }

  async getMonthlyExpenses(userId: string, month?: string): Promise<number> {
    try {
      const currentMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM format
      this.logger.debug('Calculating monthly expenses', { userId, month: currentMonth });

      const { data, error } = await this.client
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .in('type', ['debit', 'expense'])
        .eq('is_internal_transfer', false)
        .gte('date', `${currentMonth}-01`)
        .lt('date', `${this.getNextMonth(currentMonth)}-01`);

      if (error) {
        this.logger.error('Failed to calculate monthly expenses', error, { userId, month: currentMonth });
        throw new Error(`Failed to calculate monthly expenses: ${error.message}`);
      }

      const total = data?.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0) || 0;
      this.logger.info('Successfully calculated monthly expenses', { total, month: currentMonth });
      return total;
    } catch (error) {
      this.logger.error('Error in getMonthlyExpenses', error as Error);
      throw error;
    }
  }

  async getNetBalance(userId: string): Promise<number> {
    try {
      this.logger.debug('Calculating net balance', { userId });

      const { data, error } = await this.client
        .from('bank_accounts')
        .select('balance')
        .eq('user_id', userId);

      if (error) {
        this.logger.error('Failed to calculate net balance', error, { userId });
        throw new Error(`Failed to calculate net balance: ${error.message}`);
      }

      const total = data?.reduce((sum, account) => sum + (account.balance || 0), 0) || 0;
      this.logger.info('Successfully calculated net balance', { total });
      return total;
    } catch (error) {
      this.logger.error('Error in getNetBalance', error as Error);
      throw error;
    }
  }

  async getTransactionCount(userId: string): Promise<number> {
    try {
      this.logger.debug('Counting transactions', { userId });

      const { count, error } = await this.client
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        this.logger.error('Failed to count transactions', error, { userId });
        throw new Error(`Failed to count transactions: ${error.message}`);
      }

      this.logger.info('Successfully counted transactions', { count });
      return count || 0;
    } catch (error) {
      this.logger.error('Error in getTransactionCount', error as Error);
      throw error;
    }
  }

  async getSpendingByCategory(userId: string, startDate?: string, endDate?: string): Promise<Record<string, number>> {
    try {
      this.logger.debug('Calculating spending by category', { userId, startDate, endDate });

      let query = this.client
        .from('transactions')
        .select('category, amount')
        .eq('user_id', userId)
        .eq('type', 'debit')
        .not('category', 'is', null);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to calculate spending by category', error, { userId, startDate, endDate });
        throw new Error(`Failed to calculate spending by category: ${error.message}`);
      }

      const categoryTotals: Record<string, number> = {};
      data?.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(transaction.amount);
      });

      this.logger.info('Successfully calculated spending by category', { categories: Object.keys(categoryTotals).length });
      return categoryTotals;
    } catch (error) {
      this.logger.error('Error in getSpendingByCategory', error as Error);
      throw error;
    }
  }

  // Real-time subscriptions
  subscribeToTransactions(userId: string, callback: (payload: any) => void): () => void {
    this.logger.info('Setting up transactions subscription', { userId });

    const subscription = this.client
      .channel('transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return () => {
      this.logger.info('Unsubscribing from transactions', { userId });
      this.client.removeChannel(subscription);
    };
  }

  subscribeToBankAccounts(userId: string, callback: (payload: any) => void): () => void {
    this.logger.info('Setting up bank accounts subscription', { userId });

    const subscription = this.client
      .channel('bank_accounts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return () => {
      this.logger.info('Unsubscribing from bank accounts', { userId });
      this.client.removeChannel(subscription);
    };
  }

  // Helper methods
  private getNextMonth(month: string): string {
    const date = new Date(month + '-01');
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 7);
  }
}

// Export singleton instance
export const DatabaseService = new DatabaseServiceImpl();

// Export class for testing and custom instances
export { DatabaseServiceImpl };
