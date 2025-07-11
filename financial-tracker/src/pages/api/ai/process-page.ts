/**
 * API endpoint for processing individual pages
 * Extracts transactions from a single page while maintaining context
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createLLMProvider } from '../../../lib/llm/LLMProviderFactory';
import { getActiveLLMProvider } from '../../../lib/llm/config';

// Page processing prompt template
const createPageProcessingPrompt = (
  pageContent: string,
  pageNumber: number,
  totalPages: number,
  previousBalance?: number,
  userCategories?: string[]
) => {
  const categoriesText = userCategories?.length 
    ? userCategories.join(', ') 
    : 'Shopping, Entertainment, Travel, Food, Health, Education, Electronics';

  return `You are a specialized financial statement analyst working for a smart personal finance app.

You are processing **PAGE ${pageNumber} of ${totalPages}** from a bank statement.

Your job is to extract **clean and accurate structured financial transactions** from this page only.

${previousBalance !== undefined ? `**PREVIOUS PAGE ENDING BALANCE:** ${previousBalance}` : ''}

**PAGE CONTENT TO PROCESS:**
${pageContent}

**EXTRACTION INSTRUCTIONS:**
Think like a human expert who has read thousands of bank statements:

1. **Page Context Awareness**:
   - This is page ${pageNumber} of ${totalPages} total pages
   - Extract only transactions visible on this page
   - Maintain balance continuity from previous page if provided
   - Note if this page has incomplete transactions (continuing from previous page)

2. **Pattern Intelligence**: 
   - Decode abbreviations like POS, ACH, IMPS, LIC, etc.
   - Recognize location names (e.g. HYDERABAD = fuel/travel)
   - Know common financial terminology (e.g. 'premium' = insurance/health)

3. **Smart Categorization Rules**:
   Use these preferred categories: ${categoriesText}
   
   Apply intelligent mapping:
   - Shopping → 'POS', 'Amazon', 'Mall', 'Retail'
   - Travel → 'Fuel', 'Petrol', 'Train', 'Cab', 'Flight', city names
   - Food → 'Cafe', 'Restaurant', 'Zomato', 'Swiggy'
   - Health → 'Insurance', 'LIC', 'Pharmacy', 'Clinic'
   - Entertainment → 'Netflix', 'Cinema', 'Games'
   - Education → 'Udemy', 'School', 'Course'
   - Electronics → 'Mobile', 'TV', 'Laptop', 'Apple'

4. **Text Normalization**:
   - Merge multi-line descriptions into single strings with proper spacing
   - Never insert newline characters \\n inside descriptions
   - Preserve original transaction description exactly as it appears

5. **Amount Logic**:
   - Debit/Dr/Withdrawal = negative amount (money OUT)
   - Credit/Cr/Deposit = positive amount (money IN)
   - Use actual transaction amounts, not balance changes

6. **Page Processing Rules**:
   - Skip opening/closing balance entries for this page
   - Skip page headers and footers
   - Skip summary rows and totals
   - Focus only on individual transactions

Return ONLY valid JSON with this structure:

{
  "pageNumber": ${pageNumber},
  "totalPages": ${totalPages},
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "exact original transaction description",
      "amount": number,
      "suggested_category": "category from preferred list",
      "balance": number,
      "confidence": number
    }
  ],
  "pageEndingBalance": number,
  "processingNotes": "any issues or observations about this page",
  "hasIncompleteTransactions": boolean
}

**CRITICAL:** Return ONLY the JSON. No explanations or additional text.`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pageContent, pageNumber, totalPages, previousBalance, userCategories } = req.body;

    if (!pageContent || !pageNumber || !totalPages) {
      return res.status(400).json({ 
        error: 'Missing required fields: pageContent, pageNumber, totalPages' 
      });
    }

    // Create page processing prompt
    const prompt = createPageProcessingPrompt(
      pageContent,
      pageNumber,
      totalPages,
      previousBalance,
      userCategories
    );

    // Use existing LLM provider instead of making HTTP calls
    const providerConfig = getActiveLLMProvider();
    const llmProvider = createLLMProvider(providerConfig);
    
    console.log(`📄 PAGE ${pageNumber} - Complete prompt being sent to LLM:`);
    console.log('=' .repeat(80));
    console.log(prompt);
    console.log('=' .repeat(80));
    
    const llmResult = await llmProvider.extractTransactions(prompt, []);
    console.log(`📄 PAGE ${pageNumber} - LLM response:`, JSON.stringify(llmResult, null, 2));

    // Create result from LLM extraction - map transactions to expected format
    const result = {
      pageNumber,
      totalPages,
      transactions: (llmResult.transactions || []).map((txn: any, index: number) => ({
        id: `page-${pageNumber}-${index}-${Date.now()}`,
        user_id: '',
        bank_account_id: '',
        transaction_date: txn.date || '',
        description: txn.description || '',
        amount: Number(txn.amount) || 0,
        transaction_type: Number(txn.amount) > 0 ? 'income' as const : 'expense' as const,
        category_name: txn.suggested_category || 'Uncategorized',
        is_transfer: false,
        transfer_account_id: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Legacy fields for backward compatibility
        date: txn.date || '',
        type: Number(txn.amount) > 0 ? 'income' as const : 'expense' as const,
        category: txn.suggested_category || 'Uncategorized',
        balance: txn.balance,
        confidence: txn.confidence || 80
      })),
      pageEndingBalance: previousBalance || 0,
      processingNotes: `Processed ${llmResult.transactions?.length || 0} transactions`,
      hasIncompleteTransactions: false,
      securityBreakdown: llmResult.securityBreakdown
    };

    console.log(`Page ${pageNumber} processing result:`, {
      transactionCount: result.transactions.length,
      endingBalance: result.pageEndingBalance,
      hasIssues: result.hasIncompleteTransactions
    });

    res.status(200).json(result);

  } catch (error) {
    console.error(`Error processing page ${req.body.pageNumber}:`, error);
    res.status(500).json({
      pageNumber: req.body.pageNumber || 1,
      totalPages: req.body.totalPages || 1,
      transactions: [],
      pageEndingBalance: req.body.previousBalance || 0,
      processingNotes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      hasIncompleteTransactions: false
    });
  }
}
