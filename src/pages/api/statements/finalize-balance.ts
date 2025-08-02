/**
 * API endpoint for finalizing statement balance after all pages are processed
 * Determines the best closing balance and saves it to bank_statements table
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export interface FinalizeBalanceRequest {
  bank_statement_id: string;
  page_balance_data: Array<{
    page_number: number;
    balance_data: {
      opening_balance?: number | null;
      closing_balance?: number | null;
      available_balance?: number | null;
      current_balance?: number | null;
      balance_confidence: number;
      balance_extraction_notes: string;
    };
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    
    // Get the user from the session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { bank_statement_id, page_balance_data } = req.body;

    if (!bank_statement_id || !page_balance_data || !Array.isArray(page_balance_data)) {
      return res.status(400).json({ 
        error: 'Missing required fields: bank_statement_id, page_balance_data' 
      });
    }

    // Verify the bank statement belongs to the user
    const { data: statement, error: statementError } = await supabase
      .from('bank_statements')
      .select('id, user_id, statement_year, statement_month')
      .eq('id', bank_statement_id)
      .eq('user_id', user.id)
      .single();

    if (statementError || !statement) {
      return res.status(404).json({ error: 'Bank statement not found or access denied' });
    }

    // Determine the best closing balance from all pages
    let bestClosingBalance = null;
    let bestConfidence = 0;
    let bestPageNumber = 0;
    let balanceNotes = 'No balance information found';

    console.log(`🔍 Processing ${page_balance_data.length} pages for statement ${statement.statement_year}-${statement.statement_month}`);

    for (const pageData of page_balance_data) {
      const { page_number, balance_data } = pageData;
      
      if (balance_data && balance_data.closing_balance !== null && balance_data.closing_balance !== undefined) {
        const confidence = balance_data.balance_confidence || 0;
        
        console.log(`💰 Page ${page_number}: ₹${balance_data.closing_balance} (${confidence}% confidence)`);
        
        // Use balance with highest confidence, preferring later pages if confidence is equal
        if (confidence > bestConfidence || (confidence === bestConfidence && page_number > bestPageNumber)) {
          bestClosingBalance = balance_data.closing_balance;
          bestConfidence = confidence;
          bestPageNumber = page_number;
          balanceNotes = balance_data.balance_extraction_notes || `Closing balance from page ${page_number}`;
        }
      }
    }

    if (bestClosingBalance !== null) {
      console.log(`🎯 Selected closing balance: ₹${bestClosingBalance} from page ${bestPageNumber} (${bestConfidence}% confidence)`);
      
      // Update the bank statement with the final closing balance
      const { data: updatedStatement, error: updateError } = await supabase
        .from('bank_statements')
        .update({ 
          closing_balance: bestClosingBalance
        })
        .eq('id', bank_statement_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating statement with closing balance:', updateError);
        return res.status(500).json({ error: 'Failed to update statement balance' });
      }

      console.log(`✅ Statement balance finalized: ₹${bestClosingBalance}`);

      res.status(200).json({
        success: true,
        closing_balance: bestClosingBalance,
        confidence: bestConfidence,
        source_page: bestPageNumber,
        balance_notes: balanceNotes,
        statement: updatedStatement,
        message: `Closing balance ₹${bestClosingBalance} saved from page ${bestPageNumber} with ${bestConfidence}% confidence`
      });
    } else {
      console.log('ℹ️ No closing balance found in any page');
      
      res.status(200).json({
        success: true,
        closing_balance: null,
        confidence: 0,
        source_page: null,
        balance_notes: 'No closing balance detected in statement',
        message: 'Statement processed successfully but no closing balance found'
      });
    }

  } catch (error) {
    console.error('Error finalizing statement balance:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
