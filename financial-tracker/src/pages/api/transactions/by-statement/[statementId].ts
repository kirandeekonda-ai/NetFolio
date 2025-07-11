import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { statementId } = req.query;

    if (!statementId || typeof statementId !== 'string') {
      return res.status(400).json({ error: 'Statement ID is required' });
    }

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Fetch transactions for the specific statement
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('bank_statement_id', statementId)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return res.status(500).json({ 
        error: 'Failed to fetch transactions',
        details: transactionsError.message 
      });
    }

    // Also fetch the statement details for context
    const { data: statement, error: statementError } = await supabase
      .from('bank_statements')
      .select('*')
      .eq('id', statementId)
      .eq('user_id', user.id)
      .single();

    if (statementError) {
      console.error('Error fetching statement:', statementError);
      return res.status(500).json({ 
        error: 'Failed to fetch statement details',
        details: statementError.message 
      });
    }

    return res.status(200).json({
      success: true,
      transactions: transactions || [],
      statement: statement,
      count: transactions?.length || 0
    });

  } catch (error) {
    console.error('Error in by-statement API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
