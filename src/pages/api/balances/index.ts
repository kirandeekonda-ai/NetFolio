/**
 * API endpoint to get account balances using SimplifiedBalanceService
 * GET /api/balances - Get current account balances and net worth from statements
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import SimplifiedBalanceService from '@/services/SimplifiedBalanceService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const supabase = createServerSupabaseClient({ req, res });
      
      // Get the user from the session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get net worth and account balances from latest statements
      const netWorth = await SimplifiedBalanceService.getNetWorth(user.id);
      const accountBalances = await SimplifiedBalanceService.getAccountBalances(user.id);

      res.status(200).json({
        success: true,
        net_worth: netWorth,
        account_balances: accountBalances
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
      res.status(500).json({ 
        error: 'Failed to fetch account balances',
        details: (error as Error).message 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}
