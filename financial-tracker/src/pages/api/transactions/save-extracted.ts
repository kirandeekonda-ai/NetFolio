import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { transactions, bankAccountId, bankStatementId } = req.body;
    
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Invalid transactions data' });
    }

    console.log(`[save-extracted] Saving ${transactions.length} transactions for user ${user.id}`);
    console.log('[save-extracted] Raw transactions received:', transactions.map(t => ({
      description: t.description,
      category: t.category,
      category_name: t.category_name,
      amount: t.amount
    })));

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
      
      console.log(`[save-extracted] Processing transaction "${transaction.description}": category="${transaction.category}", category_name="${transaction.category_name}", final_category_name="${processedTransaction.category_name}"`);
      
      return processedTransaction;
    });

    // Insert transactions into the database
    const { data: insertedTransactions, error } = await supabase
      .from('transactions')
      .insert(transactionsToInsert)
      .select('*');

    if (error) {
      console.error('[save-extracted] Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to save transactions', 
        details: error.message 
      });
    }

    console.log(`[save-extracted] Successfully saved ${insertedTransactions?.length || 0} transactions`);

    // Return the saved transactions with real UUIDs
    res.status(200).json({
      success: true,
      transactions: insertedTransactions,
      count: insertedTransactions?.length || 0
    });

  } catch (error) {
    console.error('[save-extracted] Unexpected error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
