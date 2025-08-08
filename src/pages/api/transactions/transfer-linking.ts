import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

/**
 * API endpoint for transaction transfer linking operations
 * Handles linking, unlinking, and detecting potential transfers
 */
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

    const { action, ...params } = req.body;

    switch (action) {
      case 'link':
        return await linkTransactions(supabase, user.id, params, res);
      
      case 'unlink':
        return await unlinkTransaction(supabase, user.id, params, res);
      
      case 'detect':
        return await detectPotentialTransfers(supabase, user.id, params, res);
      
      case 'suggest':
        return await suggestTransferForTransaction(supabase, user.id, params, res);
      
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Transfer linking API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Link two transactions as a transfer pair
 */
async function linkTransactions(supabase: any, userId: string, params: any, res: NextApiResponse) {
  const { transaction1Id, transaction2Id, confidence = 1.0, notes } = params;

  if (!transaction1Id || !transaction2Id) {
    return res.status(400).json({ error: 'Both transaction IDs are required' });
  }

  // Verify both transactions belong to the user
  const { data: transactions, error: fetchError } = await supabase
    .from('transactions')
    .select('id, user_id, amount, description, transaction_date, bank_account_id')
    .in('id', [transaction1Id, transaction2Id])
    .eq('user_id', userId);

  if (fetchError) {
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }

  if (transactions.length !== 2) {
    return res.status(404).json({ error: 'One or both transactions not found' });
  }

  // Use the database function to link transactions
  const { data: pairId, error: linkError } = await supabase
    .rpc('link_transactions_as_transfer', {
      transaction_id_1: transaction1Id,
      transaction_id_2: transaction2Id,
      confidence_score: confidence,
      notes: notes || null
    });

  if (linkError) {
    return res.status(500).json({ error: 'Failed to link transactions', details: linkError.message });
  }

  return res.status(200).json({
    success: true,
    transferPairId: pairId,
    message: 'Transactions linked successfully'
  });
}

/**
 * Unlink a transaction from its transfer pair
 */
async function unlinkTransaction(supabase: any, userId: string, params: any, res: NextApiResponse) {
  const { transactionId } = params;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  // Verify transaction belongs to the user
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('id, user_id')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  // Use the database function to unlink transactions
  const { data: success, error: unlinkError } = await supabase
    .rpc('unlink_transactions', {
      transaction_id: transactionId
    });

  if (unlinkError) {
    return res.status(500).json({ error: 'Failed to unlink transaction', details: unlinkError.message });
  }

  return res.status(200).json({
    success: true,
    message: 'Transaction unlinked successfully'
  });
}

/**
 * Detect potential transfers for all user transactions
 */
async function detectPotentialTransfers(supabase: any, userId: string, params: any, res: NextApiResponse) {
  const { dateTolerance = 1, amountTolerance = 1.0 } = params;

  // Use the database function to detect potential transfers
  const { data: suggestions, error: detectError } = await supabase
    .rpc('detect_potential_transfers', {
      user_id_param: userId,
      date_tolerance_days: dateTolerance,
      amount_tolerance_percent: amountTolerance
    });

  if (detectError) {
    return res.status(500).json({ error: 'Failed to detect transfers', details: detectError.message });
  }

  // Fetch full transaction details for the suggestions
  const transactionIds = suggestions.flatMap((s: any) => [s.transaction_1_id, s.transaction_2_id]);
  
  if (transactionIds.length === 0) {
    return res.status(200).json({ suggestions: [] });
  }

  const { data: transactions, error: fetchError } = await supabase
    .from('transactions')
    .select(`
      id, description, amount, transaction_date, 
      bank_account_id, category_name,
      bank_accounts:bank_account_id (bank_name, account_nickname)
    `)
    .in('id', transactionIds);

  if (fetchError) {
    return res.status(500).json({ error: 'Failed to fetch transaction details' });
  }

  // Build transaction lookup map
  const transactionMap = new Map(transactions.map((t: any) => [t.id, t]));

  // Format suggestions with full transaction details
  const formattedSuggestions = suggestions.map((s: any) => ({
    transaction1: transactionMap.get(s.transaction_1_id),
    transaction2: transactionMap.get(s.transaction_2_id),
    confidence: s.confidence_score,
    amountDiff: s.amount_diff,
    dateDiff: s.date_diff,
    reason: generateTransferReason(s)
  }));

  return res.status(200).json({ suggestions: formattedSuggestions });
}

/**
 * Suggest potential transfer matches for a specific transaction
 */
async function suggestTransferForTransaction(supabase: any, userId: string, params: any, res: NextApiResponse) {
  const { transactionId, dateTolerance = 2, amountTolerance = 2.0 } = params;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  // Get the target transaction
  const { data: targetTransaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !targetTransaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  // Find potential matches based on criteria
  const targetDate = new Date(targetTransaction.transaction_date);
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - dateTolerance);
  const endDate = new Date(targetDate);
  endDate.setDate(endDate.getDate() + dateTolerance);

  const minAmount = Math.abs(targetTransaction.amount) * (1 - amountTolerance / 100);
  const maxAmount = Math.abs(targetTransaction.amount) * (1 + amountTolerance / 100);

  const { data: candidates, error: candidatesError } = await supabase
    .from('transactions')
    .select(`
      id, description, amount, transaction_date, 
      bank_account_id, category_name
    `)
    .eq('user_id', userId)
    .neq('id', transactionId)
    .neq('bank_account_id', targetTransaction.bank_account_id)
    .gte('transaction_date', startDate.toISOString().split('T')[0])
    .lte('transaction_date', endDate.toISOString().split('T')[0]);

  if (candidatesError) {
    console.error('Candidates query error:', candidatesError);
    return res.status(500).json({ error: 'Failed to find candidates', details: candidatesError.message });
  }

  // Filter and score candidates
  const suggestions = candidates
    .filter((candidate: any) => {
      // Skip already linked transactions (if the field exists)
      if (candidate.linked_transaction_id) return false;
      if (candidate.is_internal_transfer === true) return false;
      
      // Different bank accounts (already filtered above)
      // Opposite signs (one positive, one negative)
      const targetSign = Math.sign(targetTransaction.amount);
      const candidateSign = Math.sign(candidate.amount);
      if (targetSign === candidateSign) return false;
      
      // Amount range check
      const amountDiff = Math.abs(targetTransaction.amount + candidate.amount);
      const maxAllowedDiff = Math.abs(targetTransaction.amount) * (amountTolerance / 100);
      return amountDiff <= maxAllowedDiff;
    })
    .map((candidate: any) => {
      const amountDiff = Math.abs(targetTransaction.amount + candidate.amount);
      const dateDiff = Math.abs(
        new Date(targetTransaction.transaction_date).getTime() - 
        new Date(candidate.transaction_date).getTime()
      ) / (1000 * 60 * 60 * 24);

      let confidence = 0.5;
      
      // Perfect amount match
      if (amountDiff === 0) confidence += 0.3;
      else if (amountDiff <= Math.abs(targetTransaction.amount) * 0.01) confidence += 0.2;
      
      // Same day
      if (dateDiff === 0) confidence += 0.2;
      else if (dateDiff <= 1) confidence += 0.1;
      
      // Transfer keywords in description
      const transferKeywords = /(neft|rtgs|imps|upi|transfer|fund|remit)/i;
      if (transferKeywords.test(targetTransaction.description) || 
          transferKeywords.test(candidate.description)) {
        confidence += 0.15;
      }

      return {
        transaction: candidate,
        confidence: Math.min(confidence, 0.95),
        amountDiff,
        dateDiff: Math.round(dateDiff),
        reason: generateMatchReason(targetTransaction, candidate, amountDiff, dateDiff)
      };
    })
    .sort((a: any, b: any) => b.confidence - a.confidence)
    .slice(0, 5); // Top 5 suggestions

  return res.status(200).json({ 
    targetTransaction,
    suggestions 
  });
}

function generateTransferReason(suggestion: any): string {
  const reasons = [];
  
  if (suggestion.amount_diff === 0) {
    reasons.push('Perfect amount match');
  } else if (suggestion.amount_diff <= 5) {
    reasons.push(`Amount difference: ₹${suggestion.amount_diff}`);
  }
  
  if (suggestion.date_diff === 0) {
    reasons.push('Same day transaction');
  } else if (suggestion.date_diff === 1) {
    reasons.push('Next day transaction');
  }
  
  if (suggestion.description_1.match(/(neft|rtgs|imps|upi|transfer)/i) ||
      suggestion.description_2.match(/(neft|rtgs|imps|upi|transfer)/i)) {
    reasons.push('Transfer keywords detected');
  }
  
  return reasons.join(', ') || 'Pattern-based suggestion';
}

function generateMatchReason(target: any, candidate: any, amountDiff: number, dateDiff: number): string {
  const reasons = [];
  
  if (amountDiff === 0) {
    reasons.push('Exact amount match');
  } else if (amountDiff <= 5) {
    reasons.push(`Close amount (₹${amountDiff} difference)`);
  }
  
  if (dateDiff === 0) {
    reasons.push('Same day');
  } else if (dateDiff === 1) {
    reasons.push('Next day');
  } else if (dateDiff <= 2) {
    reasons.push(`${dateDiff} days apart`);
  }
  
  const transferKeywords = /(neft|rtgs|imps|upi|transfer|fund|remit)/i;
  if (transferKeywords.test(target.description) || transferKeywords.test(candidate.description)) {
    reasons.push('Transfer patterns');
  }
  
  return reasons.join(', ') || 'Potential match';
}
