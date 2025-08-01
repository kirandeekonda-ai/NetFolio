import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { BankAccount, BankAccountCreate, BankAccountUpdate } from '@/types';

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
        return await handleGet(supabase, user.id, res);
      case 'POST':
        return await handlePost(supabase, user.id, req.body, res);
      case 'PUT':
        return await handlePut(supabase, user.id, req.query.id as string, req.body, res);
      case 'DELETE':
        return await handleDelete(supabase, user.id, req.query.id as string, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Bank accounts API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(supabase: any, userId: string, res: NextApiResponse) {
  const { data: accounts, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ accounts });
}

async function handlePost(supabase: any, userId: string, body: BankAccountCreate, res: NextApiResponse) {
  // Validate required fields
  if (!body.bank_name || !body.account_type) {
    return res.status(400).json({
      error: 'Missing required fields: bank_name, account_type'
    });
  }

  // Validate account type
  const validAccountTypes = ['checking', 'savings', 'credit', 'investment'];
  if (!validAccountTypes.includes(body.account_type)) {
    return res.status(400).json({
      error: 'Invalid account_type. Must be one of: ' + validAccountTypes.join(', ')
    });
  }

  const accountData = {
    user_id: userId,
    bank_name: body.bank_name.trim(),
    account_type: body.account_type,
    account_number_last4: body.account_number_last4?.trim() || null,
    account_nickname: body.account_nickname?.trim() || null,
    currency: body.currency || 'USD',
  };

  const { data: account, error } = await supabase
    .from('bank_accounts')
    .insert([accountData])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ account });
}

async function handlePut(supabase: any, userId: string, accountId: string, body: BankAccountUpdate, res: NextApiResponse) {
  if (!accountId) {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  // Validate account type if provided
  if (body.account_type) {
    const validAccountTypes = ['checking', 'savings', 'credit', 'investment'];
    if (!validAccountTypes.includes(body.account_type)) {
      return res.status(400).json({
        error: 'Invalid account_type. Must be one of: ' + validAccountTypes.join(', ')
      });
    }
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Only include fields that are provided
  if (body.bank_name !== undefined) updateData.bank_name = body.bank_name.trim();
  if (body.account_type !== undefined) updateData.account_type = body.account_type;
  if (body.account_number_last4 !== undefined) updateData.account_number_last4 = body.account_number_last4?.trim() || null;
  if (body.account_nickname !== undefined) updateData.account_nickname = body.account_nickname?.trim() || null;
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;

  const { data: account, error } = await supabase
    .from('bank_accounts')
    .update(updateData)
    .eq('id', accountId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!account) {
    return res.status(404).json({ error: 'Bank account not found' });
  }

  return res.status(200).json({ account });
}

async function handleDelete(supabase: any, userId: string, accountId: string, res: NextApiResponse) {
  if (!accountId) {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  // Check if account exists and belongs to user
  const { data: existingAccount, error: fetchError } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingAccount) {
    return res.status(404).json({ error: 'Bank account not found' });
  }

  // Check if account has any transactions
  const { data: transactions, error: transactionError } = await supabase
    .from('transactions')
    .select('id')
    .eq('bank_account_id', accountId)
    .limit(1);

  if (transactionError) {
    return res.status(500).json({ error: 'Failed to check transactions' });
  }

  if (transactions && transactions.length > 0) {
    // Instead of deleting, mark as inactive
    const { data: account, error: updateError } = await supabase
      .from('bank_accounts')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({ 
      message: 'Account deactivated (has transactions)',
      account 
    });
  }

  // Safe to delete if no transactions
  const { error: deleteError } = await supabase
    .from('bank_accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_id', userId);

  if (deleteError) {
    return res.status(400).json({ error: deleteError.message });
  }

  return res.status(200).json({ message: 'Bank account deleted successfully' });
}
