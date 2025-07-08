import { useState, useCallback } from 'react';
import { uploadPdfStatement } from '../lib/api/pdfStatementClient';
import { Transaction } from '@/types';

interface ProcessingResult {
  transactions: Transaction[];
  analytics: {
    pagesProcessed: number;
    inputTokens: number;
    outputTokens: number;
  };
}

interface UseAIPdfProcessorReturn {
  processFile: (file: File) => Promise<ProcessingResult>;
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

  const processFile = useCallback(async (file: File): Promise<ProcessingResult> => {
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
        
        // Log transaction summary by category
        const categoryStats = result.transactions.reduce((acc: Record<string, number>, txn: any) => {
          acc[txn.category] = (acc[txn.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        addLog(`📊 Categories found: ${Object.entries(categoryStats).map(([cat, count]) => `${cat}(${count})`).join(', ')}`);
      }

      // Convert to our internal Transaction format
      const transactions: Transaction[] = result.transactions.map((txn: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        date: txn.date,
        description: txn.description,
        amount: txn.amount,
        type: txn.amount > 0 ? 'income' as const : 'expense' as const,
        category: txn.category,
        currency: txn.currency,
      }));

      addLog('✨ Transaction conversion completed');

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
