/**
 * BalanceService - Service for managing bank account balances
 * Integrates with AI-extracted balance data and manual updates
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface AccountBalance {
  account_id: string;
  account_name: string;
  bank_name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment';
  current_balance: number;
  currency: string;
  last_updated: string;
  balance_source: 'manual' | 'statement' | 'calculated' | 'ai_extracted';
  confidence: 'high' | 'medium' | 'low';
}

export interface NetWorthSummary {
  total_balance: number;
  currency: string;
  account_count: number;
  last_updated: string;
  accounts: AccountBalance[];
}

class BalanceService {
  private supabase = createClientComponentClient();

  /**
   * Get the most accurate balance for each account using multiple sources
   */
  async getAccountBalances(userId?: string): Promise<AccountBalance[]> {
    try {
      // Get all active bank accounts
      const { data: accounts, error: accountsError } = await this.supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (accountsError) {
        console.error('Error fetching bank accounts:', accountsError);
        throw new Error('Failed to fetch bank accounts');
      }

      if (!accounts || accounts.length === 0) {
        return [];
      }

      const balances: AccountBalance[] = [];

      for (const account of accounts) {
        // Get the most recent AI-extracted balance
        const { data: extractedBalances } = await this.supabase
          .from('balance_extractions')
          .select('*')
          .eq('user_id', account.user_id)
          .order('created_at', { ascending: false })
          .limit(1);

        const latestExtraction = extractedBalances?.[0];
        
        // Determine the best balance to use
        let balance = account.current_balance || account.starting_balance;
        let balanceSource: AccountBalance['balance_source'] = 'manual';
        let confidence: AccountBalance['confidence'] = 'medium';
        let lastUpdated = account.updated_at;

        // Prefer AI-extracted closing balance if available and recent
        if (latestExtraction?.closing_balance !== null && latestExtraction?.closing_balance !== undefined) {
          const extractionDate = new Date(latestExtraction.created_at);
          const accountUpdateDate = new Date(account.updated_at);
          
          // Use AI extraction if it's more recent and has good confidence
          if (extractionDate > accountUpdateDate && latestExtraction.balance_confidence >= 70) {
            balance = latestExtraction.closing_balance;
            balanceSource = 'ai_extracted';
            confidence = latestExtraction.balance_confidence >= 90 ? 'high' : 
                        latestExtraction.balance_confidence >= 70 ? 'medium' : 'low';
            lastUpdated = latestExtraction.created_at;
          }
        }

        // Fallback to current_balance from account if available
        if (account.current_balance !== null && account.current_balance !== undefined) {
          const accountUpdateDate = new Date(account.updated_at);
          const currentLastUpdate = new Date(lastUpdated);
          
          if (accountUpdateDate >= currentLastUpdate) {
            balance = account.current_balance;
            balanceSource = 'manual';
            confidence = 'high';
            lastUpdated = account.updated_at;
          }
        }

        balances.push({
          account_id: account.id,
          account_name: account.account_nickname || `${account.bank_name} ${account.account_type}`,
          bank_name: account.bank_name,
          account_type: account.account_type,
          current_balance: balance,
          currency: account.currency,
          last_updated: lastUpdated,
          balance_source: balanceSource,
          confidence: confidence
        });
      }

      return balances;
    } catch (error) {
      console.error('Error in getAccountBalances:', error);
      throw error;
    }
  }

  /**
   * Calculate net worth from all account balances
   */
  async getNetWorth(userId?: string): Promise<NetWorthSummary> {
    try {
      const accountBalances = await this.getAccountBalances(userId);
      
      if (accountBalances.length === 0) {
        return {
          total_balance: 0,
          currency: 'USD',
          account_count: 0,
          last_updated: new Date().toISOString(),
          accounts: []
        };
      }

      // Calculate total (convert all to same currency - for now assume all same currency)
      const totalBalance = accountBalances.reduce((sum, account) => sum + account.current_balance, 0);
      
      // Get the most recent update time
      const lastUpdated = accountBalances.reduce((latest, account) => {
        const accountDate = new Date(account.last_updated);
        const latestDate = new Date(latest);
        return accountDate > latestDate ? account.last_updated : latest;
      }, accountBalances[0]?.last_updated || new Date().toISOString());

      // Use the currency from the first account (TODO: handle multiple currencies)
      const currency = accountBalances[0]?.currency || 'USD';

      return {
        total_balance: totalBalance,
        currency: currency,
        account_count: accountBalances.length,
        last_updated: lastUpdated,
        accounts: accountBalances
      };
    } catch (error) {
      console.error('Error calculating net worth:', error);
      throw error;
    }
  }

  /**
   * Get the latest balance extractions for debugging/verification
   */
  async getLatestBalanceExtractions(limit: number = 10) {
    try {
      const { data, error } = await this.supabase
        .from('balance_extractions')
        .select(`
          *,
          bank_statements(
            id,
            statement_period_start,
            statement_period_end
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching balance extractions:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getLatestBalanceExtractions:', error);
      throw error;
    }
  }
}

export const balanceService = new BalanceService();
