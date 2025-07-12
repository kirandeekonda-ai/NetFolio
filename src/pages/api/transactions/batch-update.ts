import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

interface BatchUpdateItem {
  id: string;
  category_name?: string;
  transaction_type?: 'income' | 'expense';
}

interface BatchUpdateRequest {
  updates: BatchUpdateItem[];
}

interface BatchUpdateResponse {
  success: boolean;
  updatedCount: number;
  message: string;
  errors?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BatchUpdateResponse>
) {
  console.log('=== BATCH UPDATE API DEBUG ===');
  console.log('Method:', req.method);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      updatedCount: 0,
      message: 'Method not allowed'
    });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        updatedCount: 0,
        message: 'Unauthorized'
      });
    }

    const { updates }: BatchUpdateRequest = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        updatedCount: 0,
        message: 'Invalid updates array'
      });
    }

    const errors: string[] = [];
    let updatedCount = 0;

    // Process each update
    for (const update of updates) {
      try {
        // Build the update object
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if (update.category_name !== undefined) {
          updateData.category_name = update.category_name;
        }

        if (update.transaction_type !== undefined) {
          updateData.transaction_type = update.transaction_type;
        }

        console.log(`Updating transaction ${update.id} with data:`, updateData);

        // First, let's verify the transaction exists and belongs to the user
        const { data: existingTransaction, error: fetchError } = await supabase
          .from('transactions')
          .select('id, user_id, category_name, transaction_type')
          .eq('id', update.id)
          .eq('user_id', user.id)
          .single();

        console.log(`Existing transaction ${update.id}:`, { existingTransaction, fetchError });

        if (fetchError || !existingTransaction) {
          console.error(`Transaction ${update.id} not found or doesn't belong to user`);
          errors.push(`Transaction ${update.id} not found or access denied`);
          continue;
        }

        // Update the transaction
        const { data, error: updateError } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', update.id)
          .eq('user_id', user.id); // Ensure user can only update their own transactions

        console.log(`Update result for transaction ${update.id}:`, { data, error: updateError });

        if (updateError) {
          console.error(`Error updating transaction ${update.id}:`, updateError);
          errors.push(`Failed to update transaction ${update.id}: ${updateError.message}`);
        } else {
          console.log(`Successfully updated transaction ${update.id}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error processing update for transaction ${update.id}:`, error);
        errors.push(`Failed to process update for transaction ${update.id}`);
      }
    }

    const success = updatedCount > 0;
    const hasErrors = errors.length > 0;

    return res.status(success ? 200 : 500).json({
      success,
      updatedCount,
      message: success 
        ? `Successfully updated ${updatedCount} transaction${updatedCount !== 1 ? 's' : ''}${hasErrors ? ` (${errors.length} failed)` : ''}`
        : 'Failed to update transactions',
      errors: hasErrors ? errors : undefined
    });

  } catch (error) {
    console.error('Batch update error:', error);
    return res.status(500).json({
      success: false,
      updatedCount: 0,
      message: 'Internal server error'
    });
  }
}
