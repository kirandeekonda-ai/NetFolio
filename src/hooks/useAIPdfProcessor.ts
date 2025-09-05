import { useState, useCallback } from 'react';
import { uploadPdfStatement, SecurityBreakdown } from '../lib/api/pdfStatementClient';
import { Transaction, Category } from '@/types';
import { createCategoryMatcher } from '@/utils/categoryMatcher';

interface ProcessingResult {
  transactions: Transaction[];
  analytics: {
    pagesProcessed: number;
    inputTokens: number;
    outputTokens: number;
  };
  securityBreakdown?: SecurityBreakdown;
}

interface UseAIPdfProcessorReturn {
  processFile: (file: File, userCategories?: Category[]) => Promise<ProcessingResult>;
  isProcessing: boolean;
  error: string | null;
  processingLogs: string[];
  clearLogs: () => void;
}

export const useAIPdfProcessor = (): UseAIPdfProcessorReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setProcessingLogs(prev => [...prev, logMessage]);
  }, []);

  const clearLogs = useCallback(() => {
    setProcessingLogs([]);
  }, []);

  const processFile = useCallback(async (file: File, userCategories: Category[] = []): Promise<ProcessingResult> => {
    setIsProcessing(true);
    setError(null);
    clearLogs();

    try {
      addLog(`🚀 Starting PDF processing for file: ${file.name}`);
      addLog(`📊 File details: ${(file.size / 1024 / 1024).toFixed(2)}MB, Type: ${file.type}`);

      // Validate file
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('File must be a PDF');
      }

      if (file.size > 20 * 1024 * 1024) {
        throw new Error('File size exceeds 20MB limit');
      }

      addLog('✅ File validation passed');
      addLog('🔄 Uploading to AI processing API...');

      const startTime = Date.now();
      const result = await uploadPdfStatement(file);
      const processingTime = Date.now() - startTime;

      addLog(`🎉 Processing completed in ${processingTime}ms`);
      addLog(`📄 Pages processed: ${result.analytics.pagesProcessed}`);
      addLog(`🔤 Input tokens: ${result.analytics.inputTokens}`);
      addLog(`💬 Output tokens: ${result.analytics.outputTokens}`);
      addLog(`💰 Transactions found: ${result.transactions.length}`);

      if (result.transactions.length > 0) {
        addLog(`📅 Date range: ${result.transactions[0]?.date} to ${result.transactions[result.transactions.length - 1]?.date}`);
        addLog(`💰 Raw transactions extracted from AI: ${result.transactions.length}`);
      }

      // Create enhanced category matcher if user categories are provided
      const categoryMatcher = userCategories.length > 0 ? createCategoryMatcher(userCategories) : null;

      // Convert to our internal Transaction format and apply enhanced category matching
      const transactions: Transaction[] = result.transactions.map((txn: any, index: number) => {
        // Validate and normalize fields from AI
        const description = typeof txn.description === 'string' ? txn.description : '';
        let amount = Number(txn.amount);
        if (isNaN(amount)) amount = 0;
        let date = typeof txn.date === 'string' ? txn.date : '';
        // Check if AI provided a suggested category
        let finalCategory = 'Uncategorized';
        const aiCategory = txn.suggested_category || txn.category;
        
        console.log(`🔍 ENHANCED CATEGORY MATCHING DEBUG for "${description}":`, {
          aiCategory,
          suggested_category: txn.suggested_category,
          category: txn.category,
          userCategories: userCategories.map(c => c.name),
          hasCategoryMatcher: !!categoryMatcher
        });
        
        if (categoryMatcher && aiCategory && aiCategory.trim() && aiCategory !== 'N/A') {
          // Use enhanced category matching with confidence scoring
          const matchResult = categoryMatcher.matchCategoryWithConfidence(aiCategory.trim());
          finalCategory = matchResult.category;
          
          console.log(`🎯 Enhanced AI category matching for "${aiCategory}":`, {
            originalCategory: aiCategory,
            matchedCategory: matchResult.category,
            confidence: Math.round(matchResult.confidence * 100) + '%',
            matchType: matchResult.matchType,
            reason: matchResult.reason
          });
          
          // Log based on confidence level
          if (matchResult.confidence >= 0.9) {
            addLog(`🎯 High confidence match: "${aiCategory}" → "${finalCategory}" (${Math.round(matchResult.confidence * 100)}%)`);
          } else if (matchResult.confidence >= 0.7) {
            addLog(`⚡ Good match: "${aiCategory}" → "${finalCategory}" (${Math.round(matchResult.confidence * 100)}%)`);
          } else if (matchResult.matchType !== 'none') {
            addLog(`⚠️ Low confidence match: "${aiCategory}" → "${finalCategory}" (${Math.round(matchResult.confidence * 100)}%)`);
          } else {
            addLog(`❌ No suitable match found for "${aiCategory}" - using Uncategorized`);
          }
        } else if (userCategories.length > 0) {
          console.log(`⚠️ No category matching possible for "${description}" - aiCategory: "${aiCategory}", categoryMatcher: ${!!categoryMatcher}`);
          addLog(`🏷️ No AI category suggestion for "${description.substring(0, 50)}..." - using "Uncategorized"`);
        }
        const transactionType = amount > 0 ? 'income' as const : 'expense' as const;
        // Always provide required fields for categorize page
        return {
          id: `ai-${Date.now()}-${index}`,
          user_id: '',
          bank_account_id: '',
          transaction_date: date,
          description,
          amount: amount, // Keep original amount with sign (positive for credits, negative for debits)
          transaction_type: transactionType,
          category_name: finalCategory,
          is_transfer: false,
          is_internal_transfer: false,
          transfer_account_id: undefined,
          linked_transaction_id: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Legacy fields for backward compatibility
          date,
          type: transactionType,
          category: finalCategory,
        };
      }).filter(txn => txn.description && typeof txn.amount === 'number' && !isNaN(txn.amount));

      addLog('✨ Transaction conversion and category matching completed');

      if (categoryMatcher && userCategories.length > 0) {
        addLog(`🎯 Category matching available with ${userCategories.length} user categories`);
      }

      return {
        transactions,
        analytics: result.analytics,
        securityBreakdown: result.securityBreakdown
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addLog(`❌ Error: ${errorMessage}`);
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
      addLog('🏁 Processing session ended');
    }
  }, [addLog, clearLogs]);

  return {
    processFile,
    isProcessing,
    error,
    processingLogs,
    clearLogs
  };
};
