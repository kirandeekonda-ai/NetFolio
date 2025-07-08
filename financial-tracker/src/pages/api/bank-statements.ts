import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { StatementUpload } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createPagesServerClient({ req, res });

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(supabase, user.id, req, res);
      case 'POST':
        return await handlePost(supabase, user.id, req.body, res);
      case 'PUT':
        return await handlePut(supabase, user.id, req.query.id as string, req.body, res);
      case 'DELETE':
        return await handleDelete(supabase, user.id, req.query.id as string, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get bank statements for user
async function handleGet(supabase: any, userId: string, req: NextApiRequest, res: NextApiResponse) {
  const { account_id, year, month } = req.query;

  let query = supabase
    .from('bank_statements')
    .select(`
      *,
      bank_accounts!inner(
        bank_name,
        account_type,
        account_nickname
      )
    `)
    .eq('user_id', userId)
    .order('statement_year', { ascending: false })
    .order('statement_month', { ascending: false });

  // Filter by account if specified
  if (account_id) {
    query = query.eq('bank_account_id', account_id);
  }

  // Filter by year if specified
  if (year) {
    query = query.eq('statement_year', parseInt(year as string));
  }

  // Filter by month if specified
  if (month) {
    query = query.eq('statement_month', parseInt(month as string));
  }

  const { data: statements, error } = await query;

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ statements });
}

// Create new bank statement record
async function handlePost(supabase: any, userId: string, body: any, res: NextApiResponse) {
  const { 
    bank_account_id, 
    statement_month, 
    statement_year, 
    statement_start_date, 
    statement_end_date,
    file_name,
    file_size_mb
  } = body;

  // Validate required fields
  if (!bank_account_id || !statement_month || !statement_year || !statement_start_date || !statement_end_date) {
    return res.status(400).json({ 
      error: 'Missing required fields: bank_account_id, statement_month, statement_year, statement_start_date, statement_end_date' 
    });
  }

  // Validate that the account belongs to the user
  const { data: account, error: accountError } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('id', bank_account_id)
    .eq('user_id', userId)
    .single();

  if (accountError || !account) {
    return res.status(404).json({ error: 'Bank account not found' });
  }

  // Check if statement for this month already exists
  const { data: existingStatement, error: existingError } = await supabase
    .from('bank_statements')
    .select('id')
    .eq('bank_account_id', bank_account_id)
    .eq('statement_year', statement_year)
    .eq('statement_month', statement_month)
    .single();

  if (existingStatement) {
    return res.status(409).json({ error: 'Statement for this month already exists' });
  }

  const statementData = {
    user_id: userId,
    bank_account_id,
    statement_month,
    statement_year,
    statement_start_date,
    statement_end_date,
    file_name: file_name || null,
    file_size_mb: file_size_mb || null,
    processing_status: 'pending',
    transaction_count: 0,
    total_credits: 0,
    total_debits: 0,
  };

  const { data: statement, error } = await supabase
    .from('bank_statements')
    .insert([statementData])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ statement });
}

// Update bank statement
async function handlePut(supabase: any, userId: string, statementId: string, body: any, res: NextApiResponse) {
  if (!statementId) {
    return res.status(400).json({ error: 'Statement ID is required' });
  }

  const {
    processing_status,
    processing_error,
    transaction_count,
    total_credits,
    total_debits,
    processed_at
  } = body;

  const updateData: any = {};

  if (processing_status !== undefined) updateData.processing_status = processing_status;
  if (processing_error !== undefined) updateData.processing_error = processing_error;
  if (transaction_count !== undefined) updateData.transaction_count = transaction_count;
  if (total_credits !== undefined) updateData.total_credits = total_credits;
  if (total_debits !== undefined) updateData.total_debits = total_debits;
  if (processed_at !== undefined) updateData.processed_at = processed_at;

  const { data: statement, error } = await supabase
    .from('bank_statements')
    .update(updateData)
    .eq('id', statementId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!statement) {
    return res.status(404).json({ error: 'Bank statement not found' });
  }

  return res.status(200).json({ statement });
}

// Delete bank statement
async function handleDelete(supabase: any, userId: string, statementId: string, res: NextApiResponse) {
  if (!statementId) {
    return res.status(400).json({ error: 'Statement ID is required' });
  }

  // Check if statement exists and belongs to user
  const { data: existingStatement, error: fetchError } = await supabase
    .from('bank_statements')
    .select('id')
    .eq('id', statementId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingStatement) {
    return res.status(404).json({ error: 'Bank statement not found' });
  }

  // Check if statement has any transactions
  const { data: transactions, error: transactionError } = await supabase
    .from('transactions')
    .select('id')
    .eq('bank_statement_id', statementId)
    .limit(1);

  if (transactionError) {
    return res.status(500).json({ error: 'Failed to check transactions' });
  }

  if (transactions && transactions.length > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete statement with associated transactions. Please delete transactions first.' 
    });
  }

  // Delete the statement
  const { error: deleteError } = await supabase
    .from('bank_statements')
    .delete()
    .eq('id', statementId)
    .eq('user_id', userId);

  if (deleteError) {
    return res.status(500).json({ error: 'Failed to delete statement' });
  }

  return res.status(200).json({ message: 'Statement deleted successfully' });
}
