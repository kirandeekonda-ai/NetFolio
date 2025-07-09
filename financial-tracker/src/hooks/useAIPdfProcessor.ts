import { useState, useCallback } from 'react';
import { uploadPdfStatement } from '../lib/api/pdfStatementClient';
import { Transaction, Category } from '@/types';
import { createCategoryMatcher } from '@/utils/categoryMatcher';

interface ProcessingResult {
  transactions: Transaction[];
  analytics: {
    pagesProcessed: number;
    inputTokens: number;
    outputTokens: number;
  };
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

      // Create category matcher if user categories are provided
      const categoryMatcher = userCategories.length > 0 ? createCategoryMatcher(userCategories) : null;

      // Convert to our internal Transaction format and apply category matching
      const transactions: Transaction[] = result.transactions.map((txn: any, index: number) => {
        // Check if AI provided a suggested category
        let finalCategory = 'Uncategorized';
        
        // Look for category in either 'category', 'suggested_category', or based on the old output
        const aiCategory = txn.suggested_category || txn.category;
        
        if (categoryMatcher && aiCategory && aiCategory.trim() && aiCategory !== 'N/A') {
          // AI provided a category, try to match it to user categories
          finalCategory = categoryMatcher.matchCategory(aiCategory.trim());
          addLog(`🎯 Mapped AI category "${aiCategory}" to "${finalCategory}"`);
        } else if (userCategories.length > 0) {
          addLog(`⚠️ No AI category suggestion for "${txn.description.substring(0, 50)}..." - using "Uncategorized"`);
        }
        
        const transactionType = txn.amount > 0 ? 'income' as const : 'expense' as const;

        return {
          id: `ai-${Date.now()}-${index}`,
          user_id: '', // Will be set by the calling component
          bank_account_id: '', // Will be set by the calling component
          transaction_date: txn.date,
          description: txn.description,
          amount: Math.abs(txn.amount), // Store absolute value
          transaction_type: transactionType,
          category_name: finalCategory,
          is_transfer: false,
          transfer_account_id: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Legacy fields for backward compatibility
          date: txn.date,
          type: transactionType,
          category: finalCategory,
        };
      });

      addLog('✨ Transaction conversion and category matching completed');

      if (categoryMatcher && userCategories.length > 0) {
        addLog(`🎯 Category matching available with ${userCategories.length} user categories`);
      }

      return {
        transactions,
        analytics: result.analytics
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
