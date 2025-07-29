/**
 * API endpoint for saving balance extraction data
 * Stores AI-extracted balance information to the database
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export interface SaveBalanceExtractionRequest {
  bank_statement_id: string;
  page_number: number;
  balance_data: {
    opening_balance?: number | null;
    closing_balance?: number | null;
    available_balance?: number | null;
    current_balance?: number | null;
    balance_confidence: number;
    balance_extraction_notes: string;
  };
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
    const { 
      bank_statement_id, 
      page_number, 
      balance_data 
    } = req.body;

    if (!bank_statement_id || !page_number || !balance_data) {
      return res.status(400).json({ 
        error: 'Missing required fields: bank_statement_id, page_number, balance_data' 
      });
    }

    // Verify the bank statement belongs to the user
    const { data: statement, error: statementError } = await supabase
      .from('bank_statements')
      .select('id, user_id')
      .eq('id', bank_statement_id)
      .eq('user_id', user.id)
      .single();

    if (statementError || !statement) {
      return res.status(404).json({ error: 'Bank statement not found or access denied' });
    }

    // Check if balance extraction already exists for this page
    const { data: existingExtraction, error: checkError } = await supabase
      .from('balance_extractions')
      .select('id')
      .eq('bank_statement_id', bank_statement_id)
      .eq('page_number', page_number)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing balance extraction:', checkError);
      return res.status(500).json({ error: 'Database error while checking existing data' });
    }

    let result;
    
    if (existingExtraction) {
      // Update existing balance extraction
      const { data, error } = await supabase
        .from('balance_extractions')
        .update({
          opening_balance: balance_data.opening_balance,
          closing_balance: balance_data.closing_balance,
          available_balance: balance_data.available_balance,
          current_balance: balance_data.current_balance,
          balance_confidence: balance_data.balance_confidence,
          balance_extraction_notes: balance_data.balance_extraction_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingExtraction.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating balance extraction:', error);
        return res.status(500).json({ error: 'Failed to update balance extraction' });
      }

      result = data;
      console.log(`✅ Updated balance extraction for page ${page_number}`);
    } else {
      // Insert new balance extraction
      const { data, error } = await supabase
        .from('balance_extractions')
        .insert({
          user_id: user.id,
          bank_statement_id,
          page_number,
          opening_balance: balance_data.opening_balance,
          closing_balance: balance_data.closing_balance,
          available_balance: balance_data.available_balance,
          current_balance: balance_data.current_balance,
          balance_confidence: balance_data.balance_confidence,
          balance_extraction_notes: balance_data.balance_extraction_notes,
          extraction_method: 'ai_llm'
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting balance extraction:', error);
        return res.status(500).json({ error: 'Failed to save balance extraction' });
      }

      result = data;
      console.log(`✅ Saved new balance extraction for page ${page_number}`);
    }

    res.status(200).json({
      success: true,
      balance_extraction: result,
      message: existingExtraction ? 'Balance extraction updated successfully' : 'Balance extraction saved successfully'
    });

  } catch (error) {
    console.error('Error saving balance extraction:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
