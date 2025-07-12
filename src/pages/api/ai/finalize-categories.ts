/**
 * API endpoint for finalizing transaction categories
 * Reviews and optimizes categories for all extracted transactions
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Final categorization prompt template
const createFinalizationPrompt = (allTransactions: any[], userCategories?: string[]) => {
  const categoriesText = userCategories?.length 
    ? userCategories.join(', ') 
    : 'Shopping, Entertainment, Travel, Food, Health, Education, Electronics';

  return `You are a financial categorization expert reviewing extracted transactions from a multi-page bank statement.

Your task is to review and finalize the categories for all transactions, ensuring consistency and accuracy across the entire statement.

**USER'S PREFERRED CATEGORIES:** ${categoriesText}

**ALL EXTRACTED TRANSACTIONS:**
${JSON.stringify(allTransactions, null, 2)}

**CATEGORIZATION INSTRUCTIONS:**

1. **Consistency Review**:
   - Look for similar merchants/descriptions that should have the same category
   - Ensure consistent categorization patterns throughout the statement
   - Fix any obvious categorization errors from page-by-page processing

2. **Expert Analysis**:
   - Think like a human expert who understands spending patterns
   - Consider transaction amounts and context for better categorization
   - Use domain knowledge about merchants, services, and transaction types

3. **Category Optimization**:
   - Prefer user's preferred categories when possible
   - Use "Uncategorized" only when genuinely uncertain
   - Apply intelligent inference for ambiguous transactions

4. **Pattern Recognition**:
   - Group similar transactions logically
   - Recognize recurring payments and their appropriate categories
   - Identify transfers, fees, and administrative transactions

Return ONLY valid JSON with this structure:

{
  "finalizedTransactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "original description",
      "amount": number,
      "final_category": "finalized category",
      "confidence": number,
      "reasoning": "brief explanation for category choice"
    }
  ],
  "categorizationSummary": {
    "totalTransactions": number,
    "categoriesUsed": ["list of categories"],
    "highConfidenceCount": number,
    "lowConfidenceCount": number
  }
}

Return ONLY the JSON. No explanations or additional text.`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactions, userCategories } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ 
        error: 'Missing or invalid transactions array' 
      });
    }

    if (transactions.length === 0) {
      return res.status(200).json({
        finalizedTransactions: [],
        categorizationSummary: {
          totalTransactions: 0,
          categoriesUsed: [],
          highConfidenceCount: 0,
          lowConfidenceCount: 0
        }
      });
    }

    // Create finalization prompt
    const prompt = createFinalizationPrompt(transactions, userCategories);

    // Call LLM service
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/llm/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        maxTokens: 3000,
        temperature: 0.1, // Very low temperature for consistent categorization
      }),
    });

    if (!response.ok) {
      throw new Error('LLM service request failed');
    }

    const llmResult = await response.json();
    
    // Parse the JSON response from LLM
    let finalizationResult;
    try {
      finalizationResult = JSON.parse(llmResult.text || llmResult.response || '{}');
    } catch (parseError) {
      console.error('Failed to parse LLM finalization response:', parseError);
      // Fallback to original transactions with basic categorization
      finalizationResult = {
        finalizedTransactions: transactions.map((txn: any) => ({
          date: txn.date || txn.transaction_date,
          description: txn.description,
          amount: txn.amount,
          final_category: txn.category_name || txn.suggested_category || 'Uncategorized',
          confidence: 50,
          reasoning: 'Fallback categorization due to parsing error'
        })),
        categorizationSummary: {
          totalTransactions: transactions.length,
          categoriesUsed: ['Uncategorized'],
          highConfidenceCount: 0,
          lowConfidenceCount: transactions.length
        }
      };
    }

    // Convert finalized transactions back to our internal format
    const finalizedTransactions = (finalizationResult.finalizedTransactions || []).map((txn: any, index: number) => {
      const originalTxn = transactions[index] || {};
      
      return {
        id: originalTxn.id || `finalized-${Date.now()}-${index}`,
        user_id: originalTxn.user_id || '',
        bank_account_id: originalTxn.bank_account_id || '',
        transaction_date: txn.date || originalTxn.transaction_date || '',
        description: txn.description || originalTxn.description || '',
        amount: Number(txn.amount) || originalTxn.amount || 0,
        transaction_type: Number(txn.amount) > 0 ? 'income' as const : 'expense' as const,
        category_name: txn.final_category || 'Uncategorized',
        is_transfer: originalTxn.is_transfer || false,
        transfer_account_id: originalTxn.transfer_account_id,
        created_at: originalTxn.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Legacy fields for backward compatibility
        date: txn.date || originalTxn.date || '',
        type: Number(txn.amount) > 0 ? 'income' as const : 'expense' as const,
        category: txn.final_category || 'Uncategorized',
        // Additional metadata from finalization
        confidence: txn.confidence || 80,
        reasoning: txn.reasoning || 'AI categorized'
      };
    });

    const result = {
      finalizedTransactions,
      categorizationSummary: finalizationResult.categorizationSummary || {
        totalTransactions: finalizedTransactions.length,
        categoriesUsed: [...new Set(finalizedTransactions.map((t: any) => t.category_name))],
        highConfidenceCount: finalizedTransactions.filter((t: any) => t.confidence >= 80).length,
        lowConfidenceCount: finalizedTransactions.filter((t: any) => t.confidence < 80).length
      }
    };

    console.log('Transaction categorization finalized:', {
      totalTransactions: result.finalizedTransactions.length,
      categoriesUsed: result.categorizationSummary.categoriesUsed,
      highConfidence: result.categorizationSummary.highConfidenceCount,
      lowConfidence: result.categorizationSummary.lowConfidenceCount
    });

    res.status(200).json(result);

  } catch (error) {
    console.error('Error in transaction categorization finalization:', error);
    
    // Return fallback result with original transactions
    const fallbackTransactions = (req.body.transactions || []).map((txn: any, index: number) => ({
      ...txn,
      category_name: txn.category_name || txn.suggested_category || 'Uncategorized',
      confidence: 50,
      reasoning: 'Fallback due to service error'
    }));

    res.status(500).json({
      finalizedTransactions: fallbackTransactions,
      categorizationSummary: {
        totalTransactions: fallbackTransactions.length,
        categoriesUsed: ['Uncategorized'],
        highConfidenceCount: 0,
        lowConfidenceCount: fallbackTransactions.length
      },
      error: error instanceof Error ? error.message : 'Categorization service error'
    });
  }
}
