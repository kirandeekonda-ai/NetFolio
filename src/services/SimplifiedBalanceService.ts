/**
 * Simplified Balance Service - Single Source of Truth Implementation
 * Only reads closing balance from the latest bank statement for each account
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AccountBalance {
  account_id: string;
  account_name: string;
  bank_name: string;
  account_type: string;
  current_balance: number | null;
  currency: string;
  statement_month: string; // YYYY-MM format
  statement_date: string;
  balance_source: 'latest_statement';
  is_latest: true;
}

export interface NetWorthSummary {
  total_balance: number;
  currency: string;
  account_count: number;
  last_updated: string;
  latest_statement_month: string;
}

class SimplifiedBalanceService {
  private supabase = createClientComponentClient();

  /**
   * Get latest statement closing balance for each active account
   * SINGLE SOURCE OF TRUTH: Only statement closing balances matter
   */
  async getAccountBalances(userId?: string): Promise<AccountBalance[]> {
    try {
      console.log('🔍 SimplifiedBalanceService: Getting account balances...');
      
      // Get all active bank accounts
      const { data: accounts, error: accountsError } = await this.supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (accountsError) {
        console.error('❌ Error fetching bank accounts:', accountsError);
        throw new Error(`Failed to fetch bank accounts: ${accountsError.message}`);
      }

      console.log(`✅ Found ${accounts?.length || 0} active bank accounts`);

      if (!accounts || accounts.length === 0) {
        return [];
      }

      const balances: AccountBalance[] = [];

      // For each account, get the latest statement with closing balance
      for (const account of accounts) {
        console.log(`🏦 Processing: ${account.bank_name} ${account.account_type}`);
        
        const { data: latestStatement, error: statementError } = await this.supabase
          .from('bank_statements')
          .select('*')
          .eq('bank_account_id', account.id)
          .not('closing_balance', 'is', null)
          .order('statement_year', { ascending: false })
          .order('statement_month', { ascending: false })
          .limit(1)
          .single();

        if (statementError) {
          console.log(`ℹ️ No statements with balance for ${account.bank_name}: ${statementError.message}`);
          continue; // Skip this account
        }

        if (!latestStatement) {
          console.log(`ℹ️ No statement found for ${account.bank_name}`);
          continue;
        }

        const statementMonth = `${latestStatement.statement_year}-${String(latestStatement.statement_month).padStart(2, '0')}`;
        
        console.log(`💰 ${account.bank_name}: ₹${latestStatement.closing_balance} (${statementMonth})`);

        balances.push({
          account_id: account.id,
          account_name: account.account_nickname || `${account.bank_name} ${account.account_type}`,
          bank_name: account.bank_name,
          account_type: account.account_type,
          current_balance: latestStatement.closing_balance,
          currency: account.currency,
          statement_month: statementMonth,
          statement_date: latestStatement.created_at,
          balance_source: 'latest_statement',
          is_latest: true
        });
      }

      console.log(`🎯 Returning ${balances.length} account balances`);
      return balances;
    } catch (error) {
      console.error('❌ Error in getAccountBalances:', error);
      throw error;
    }
  }

  /**
   * Calculate net worth from latest statement closing balances only
   */
  async getNetWorth(userId?: string): Promise<NetWorthSummary> {
    try {
      console.log('💎 Calculating net worth from latest statements...');
      
      const balances = await this.getAccountBalances(userId);
      
      if (balances.length === 0) {
        return {
          total_balance: 0,
          currency: 'INR',
          account_count: 0,
          last_updated: new Date().toISOString(),
          latest_statement_month: 'No statements'
        };
      }

      const totalBalance = balances.reduce((sum, balance) => {
        return sum + (balance.current_balance || 0);
      }, 0);

      // Find the most recent statement month across all accounts
      const latestStatementMonth = balances
        .sort((a, b) => b.statement_month.localeCompare(a.statement_month))[0]
        .statement_month;

      console.log(`💰 Net worth: ₹${totalBalance} (Latest: ${latestStatementMonth})`);

      return {
        total_balance: totalBalance,
        currency: balances[0].currency,
        account_count: balances.length,
        last_updated: new Date().toISOString(),
        latest_statement_month: latestStatementMonth
      };
    } catch (error) {
      console.error('❌ Error calculating net worth:', error);
      throw error;
    }
  }
}

export default new SimplifiedBalanceService();
