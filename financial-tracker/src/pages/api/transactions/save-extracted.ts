import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { transactions, bankAccountId, bankStatementId } = req.body;
    
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Invalid transactions data' });
    }

    // Prepare transactions for database insertion
    const transactionsToInsert = transactions.map(transaction => {
      const processedTransaction = {
        user_id: user.id,
        bank_account_id: bankAccountId || null,
        bank_statement_id: bankStatementId || null,
        transaction_date: transaction.date || transaction.transaction_date,
        description: transaction.description,
        amount: transaction.amount,
        transaction_type: transaction.type || transaction.transaction_type,
        category_name: transaction.category || transaction.category_name || 'Uncategorized',
        is_transfer: transaction.is_transfer || false,
        reference_number: transaction.reference_number || null,
        balance_after: transaction.balance_after || null,
      };
      
      return processedTransaction;
    });

    // Insert transactions into the database
    const { data: insertedTransactions, error } = await supabase
      .from('transactions')
      .insert(transactionsToInsert)
      .select('*');

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to save transactions', 
        details: error.message 
      });
    }

    // Return the saved transactions with real UUIDs
    res.status(200).json({
      success: true,
      transactions: insertedTransactions,
      count: insertedTransactions?.length || 0
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
