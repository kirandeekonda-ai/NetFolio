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
  balance_source: 'latest_statement' | 'manual';
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
   * Get latest balance for each active account
   * UNIFIED SOURCE OF TRUTH: Latest of (Statement Balance OR Manual Balance)
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

      // For each account, get the latest statement AND latest manual balance
      for (const account of accounts) {
        // 1. Get latest statement
        const { data: latestStatement } = await this.supabase
          .from('bank_statements')
          .select('*')
          .eq('bank_account_id', account.id)
          .not('closing_balance', 'is', null)
          .order('statement_year', { ascending: false })
          .order('statement_month', { ascending: false })
          .limit(1)
          .single();

        // 2. Get latest manual balance
        const { data: latestManual } = await this.supabase
          .from('manual_balances')
          .select('*')
          .eq('bank_account_id', account.id)
          .order('balance_date', { ascending: false })
          .limit(1)
          .single();

        let finalBalance: number | null = null;
        let finalDate: string = '';
        let finalSource: 'latest_statement' | 'manual' = 'latest_statement';
        let finalMonth: string = '';

        // Determine which one is more recent
        const statementDate = latestStatement
          ? new Date(latestStatement.statement_year, latestStatement.statement_month - 1, 1).getTime()
          : 0;

        const manualDate = latestManual
          ? new Date(latestManual.balance_date).getTime()
          : 0;

        if (manualDate >= statementDate && latestManual) {
          // Manual entry is newer or equal
          finalBalance = latestManual.amount;
          finalDate = latestManual.balance_date;
          finalSource = 'manual';
          // Approximate month string for UI consistency
          const mDate = new Date(latestManual.balance_date);
          finalMonth = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
        } else if (latestStatement) {
          // Statement is newer
          finalBalance = latestStatement.closing_balance;
          finalDate = latestStatement.created_at;
          finalSource = 'latest_statement';
          finalMonth = `${latestStatement.statement_year}-${String(latestStatement.statement_month).padStart(2, '0')}`;
        } else {
          // No balance data at all
          continue;
        }

        console.log(`💰 ${account.bank_name}: ₹${finalBalance} (${finalSource})`);

        balances.push({
          account_id: account.id,
          account_name: account.account_nickname || account.bank_name,
          bank_name: account.bank_name,
          account_type: account.account_type,
          current_balance: finalBalance,
          currency: account.currency,
          statement_month: finalMonth,
          statement_date: finalDate,
          balance_source: finalSource,
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

  /**
   * Add a manual balance entry
   */
  async addManualBalance(bankAccountId: string, amount: number, date: string, notes?: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await this.supabase
        .from('manual_balances')
        .insert({
          bank_account_id: bankAccountId,
          user_id: user.id,
          amount: amount,
          balance_date: date,
          notes: notes
        });

      if (error) {
        console.error('❌ Error adding manual balance:', error);
        throw new Error(`Failed to add manual balance: ${error.message}`);
      }
    } catch (error) {
      console.error('❌ Error in addManualBalance:', error);
      throw error;
    }
  }

  /**
   * Get merged history of balances (Statements + Manual)
   */
  async getBalanceHistory(bankAccountId: string): Promise<{
    date: string;
    amount: number;
    source: 'statement' | 'manual';
    notes?: string;
  }[]> {
    try {
      // 1. Get statements with balances
      const { data: statements, error: statementError } = await this.supabase
        .from('bank_statements')
        .select('closing_balance, statement_year, statement_month')
        .eq('bank_account_id', bankAccountId)
        .not('closing_balance', 'is', null)
        .order('statement_year', { ascending: false })
        .order('statement_month', { ascending: false });

      // 2. Get manual balances
      const { data: manualBalances, error: manualError } = await this.supabase
        .from('manual_balances')
        .select('id, amount, balance_date, notes')
        .eq('bank_account_id', bankAccountId)
        .order('balance_date', { ascending: false });

      if (manualError) throw manualError;

      const history: { id?: string; date: string; amount: number; source: 'statement' | 'manual'; notes?: string }[] = [];

      // Process statements
      statements?.forEach(stmt => {
        // Construct date from year/month (last day of month)
        const date = new Date(stmt.statement_year, stmt.statement_month, 0);
        const dateStr = date.toISOString().split('T')[0];

        history.push({
          date: dateStr,
          amount: stmt.closing_balance,
          source: 'statement',
          notes: `Statement: ${new Date(date).toLocaleString('default', { month: 'short', year: 'numeric' })}`
        });
      });

      // Process manual balances
      manualBalances?.forEach(manual => {
        history.push({
          id: manual.id,
          date: manual.balance_date,
          amount: manual.amount,
          source: 'manual',
          notes: manual.notes
        });
      });

      // Sort merged list by date descending
      return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (error) {
      console.error('❌ Error getting balance history:', error);
      return [];
    }
  }

  async updateManualBalance(id: string, amount: number, date: string, notes?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('manual_balances')
        .update({
          amount: amount,
          balance_date: date,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      console.log(`✅ Updated manual balance: ${id}`);
    } catch (error) {
      console.error('❌ Error updating manual balance:', error);
      throw error;
    }
  }

  async deleteManualBalance(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('manual_balances')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log(`✅ Deleted manual balance: ${id}`);
    } catch (error) {
      console.error('❌ Error deleting manual balance:', error);
      throw error;
    }
  }
}

export default new SimplifiedBalanceService();
