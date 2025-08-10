/**
 * API endpoint for processing individual pages
 * Extracts transactions from a single page while maintaining context
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createLLMProvider } from '../../../lib/llm/LLMProviderFactory';
import { routeLLMRequest } from '../../../lib/llm/LLMRoutingService';
import { transactionPromptBuilder } from '../../../lib/llm/PromptTemplateService';
import { sanitizeTextForLLM } from '../../../utils/dataSanitization';
import { Category } from '@/types';

// Enhanced page processing prompt template using centralized service
const createPageProcessingPrompt = (
  pageContent: string,
  pageNumber: number,
  totalPages: number,
  previousBalance?: number,
  userCategories?: Category[]
) => {
  // Sanitize the page content first
  const sanitizationResult = sanitizeTextForLLM(pageContent);
  const sanitizedPageContent = sanitizationResult.sanitizedText;
  
  // Create the contextualized content with page information
  const contextualizedContent = `
**PAGE CONTEXT:**
- This is page ${pageNumber} of ${totalPages} total pages
- Extract only transactions visible on this page
${previousBalance !== undefined ? `- Previous page ending balance: ${previousBalance}` : ''}

**PAGE CONTENT TO PROCESS:**
${sanitizedPageContent}

**ADDITIONAL INSTRUCTIONS FOR PAGE PROCESSING:**
- Note if this page has incomplete transactions (continuing from previous page)
- Maintain balance continuity from previous page if provided
- Skip page headers and footers
- Skip summary rows and totals for transactions (but extract balance information)
- Focus only on individual transaction line items for the transactions array`;

  // Build the final prompt using the template service with contextualized content
  const finalPrompt = transactionPromptBuilder.buildTransactionExtractionPrompt(
    contextualizedContent,
    userCategories || []
  );

  return {
    prompt: finalPrompt,
    sanitizationResult
  };
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

    // Use the new LLM routing service to get the appropriate provider
    const routingResult = await routeLLMRequest(req, res);
    
    if (!routingResult.success || !routingResult.provider) {
      console.error('❌ LLM routing failed:', routingResult.error);
      return res.status(400).json({ 
        error: routingResult.error || 'No LLM provider configured'
      });
    }

    console.log(`✅ Using LLM provider (${routingResult.source}):`, routingResult.provider.provider_type);
    const llmProvider = createLLMProvider(routingResult.provider);
    
    // Create page processing prompt with enhanced balance detection
    const promptResult = createPageProcessingPrompt(
      pageContent,
      pageNumber,
      totalPages,
      previousBalance,
      userCategories
    );
    
    console.log(`📄 PAGE ${pageNumber} - Complete prompt being sent to LLM:`);
    console.log('=' .repeat(80));
    console.log(promptResult.prompt);
    console.log('=' .repeat(80));
    
    const llmResult = await llmProvider.extractTransactions(promptResult.prompt, userCategories || []);
    console.log(`📄 PAGE ${pageNumber} - LLM response:`, JSON.stringify(llmResult, null, 2));
    
    // Debug: Log security breakdown information
    console.log(`🔒 PAGE ${pageNumber} - Security breakdown from sanitization:`, JSON.stringify(promptResult.sanitizationResult.summary, null, 2));
    console.log(`🔒 PAGE ${pageNumber} - LLM security breakdown:`, JSON.stringify(llmResult.securityBreakdown, null, 2));

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
      // Enhanced balance data from LLM extraction
      balance_data: llmResult.balance_data || null,
      pageEndingBalance: previousBalance || 0,
      processingNotes: `Processed ${llmResult.transactions?.length || 0} transactions` + 
                      (llmResult.balance_data ? ` and extracted balance data (confidence: ${llmResult.balance_data.balance_confidence}%)` : ''),
      hasIncompleteTransactions: false,
      securityBreakdown: promptResult.sanitizationResult.summary
    };

    // Debug: Log what we're returning
    console.log(`🔒 PAGE ${pageNumber} - Final result security breakdown:`, JSON.stringify(result.securityBreakdown, null, 2));

    console.log(`Page ${pageNumber} processing result:`, {
      transactionCount: result.transactions.length,
      balanceData: result.balance_data,
      endingBalance: result.pageEndingBalance,
      hasIssues: result.hasIncompleteTransactions
    });

    // Balance data is now collected but not immediately saved per page
    // It will be processed and saved once after all pages are complete
    if (result.balance_data && result.balance_data.balance_confidence > 0) {
      console.log(`💰 Balance data collected for page ${pageNumber}: ₹${result.balance_data.closing_balance} (${result.balance_data.balance_confidence}% confidence)`);
      console.log(`ℹ️ Balance will be finalized after all pages are processed`);
    } else {
      console.log(`ℹ️ No balance data found on page ${pageNumber} (confidence: ${result.balance_data?.balance_confidence || 0}%)`);
    }

    res.status(200).json(result);

  } catch (error) {
    console.error(`Error processing page ${req.body.pageNumber}:`, error);
    
    // Check if this is an LLM service error and provide clear messaging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isServiceError = errorMessage.includes('403') || 
                          errorMessage.includes('401') || 
                          errorMessage.includes('Forbidden') ||
                          errorMessage.includes('Unauthorized') ||
                          errorMessage.includes('API key') ||
                          errorMessage.includes('quota') ||
                          errorMessage.includes('GoogleGenerativeAI Error') ||
                          errorMessage.includes('OpenAI Error') ||
                          errorMessage.includes('Azure Error') ||
                          errorMessage.includes('fetch');

    const processingNotes = isServiceError 
      ? `LLM service error: ${errorMessage}. Please check your LLM provider configuration and API keys.`
      : `Processing error: ${errorMessage}`;

    res.status(isServiceError ? 400 : 500).json({
      pageNumber: req.body.pageNumber || 1,
      totalPages: req.body.totalPages || 1,
      transactions: [],
      pageEndingBalance: req.body.previousBalance || 0,
      processingNotes,
      hasIncompleteTransactions: false,
      serviceError: isServiceError
    });
  }
}
