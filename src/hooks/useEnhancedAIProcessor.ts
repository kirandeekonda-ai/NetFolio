/**
 * Enhanced AI Statement Processor Hook
 * Handles page-by-page processing with validation and queue management
 */

import { useState, useCallback } from 'react';
import { Transaction, Category } from '@/types';

// Types for the enhanced system
export interface StatementValidationRequest {
  bankName: string;
  month: string;
  year: string;
  pageContent: string;
}

export interface StatementValidationResult {
  isValid: boolean;
  bankMatches: boolean;
  monthMatches: boolean;
  yearMatches: boolean;
  errorMessage: string | null;
  detectedBank: string | null;
  detectedMonth: string | null;
  detectedYear: string | null;
  confidence: number;
  securityBreakdown?: SecurityBreakdown;
}

export interface PageProcessingResult {
  pageNumber: number;
  totalPages: number;
  transactions: Transaction[];
  balance_data?: {
    opening_balance: number | null;
    closing_balance: number | null;
    available_balance: number | null;
    current_balance: number | null;
    balance_confidence: number;
    balance_extraction_notes: string;
  } | null;
  pageEndingBalance: number;
  processingNotes: string;
  hasIncompleteTransactions: boolean;
  success: boolean;
  error?: string;
  securityBreakdown?: SecurityBreakdown;
}

export interface QueueProgress {
  currentPage: number;
  totalPages: number;
  completedPages: number;
  successfulPages: number;
  failedPages: number;
  percentComplete: number;
  estimatedTimeRemaining: number;
  status: 'validating' | 'processing' | 'categorizing' | 'completed' | 'failed';
  currentOperation: string;
}

export interface SecurityBreakdown {
  accountNumbers: number;
  mobileNumbers: number;
  emails: number;
  panIds: number;
  customerIds: number;
  ifscCodes: number;
  cardNumbers: number;
  addresses: number;
  names: number;
}

export interface EnhancedProcessingResult {
  transactions: Transaction[];
  validationResult: StatementValidationResult;
  pageResults: PageProcessingResult[];
  securityBreakdown?: SecurityBreakdown;
  analytics: {
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    totalTransactions: number;
    processingTimeMs: number;
  };
}

export interface UseEnhancedAIProcessorReturn {
  processStatement: (
    file: File,
    bankName: string,
    month: string,
    year: string,
    userCategories?: Category[]
  ) => Promise<EnhancedProcessingResult>;
  isProcessing: boolean;
  progress: QueueProgress | null;
  validationResult: StatementValidationResult | null;
  pageResults: PageProcessingResult[];
  error: string | null;
  processingLogs: string[];
  clearLogs: () => void;
  liveSecurityBreakdown: SecurityBreakdown | null; // Add live security breakdown
}

// Helper function to get month number from month name
function getMonthNumber(monthName: string): number {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  const index = months.findIndex(m => m.startsWith(monthName.toLowerCase().substring(0, 3)));
  return index >= 0 ? index + 1 : 1;
}

export const useEnhancedAIProcessor = (): UseEnhancedAIProcessorReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<QueueProgress | null>(null);
  const [validationResult, setValidationResult] = useState<StatementValidationResult | null>(null);
  const [pageResults, setPageResults] = useState<PageProcessingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  // Add real-time security breakdown tracking
  const [liveSecurityBreakdown, setLiveSecurityBreakdown] = useState<SecurityBreakdown | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setProcessingLogs(prev => [...prev, logMessage]);
  }, []);

  const clearLogs = useCallback(() => {
    setProcessingLogs([]);
    setProgress(null);
    setValidationResult(null);
    setPageResults([]);
    setError(null);
  }, []);

  // Add function to update live security breakdown
  const updateLiveSecurityBreakdown = useCallback((pageSecurityBreakdown: SecurityBreakdown) => {
    setLiveSecurityBreakdown(prev => {
      if (!prev) {
        // First page - initialize with current breakdown
        addLog(`🔐 Security scanning started - detected ${Object.values(pageSecurityBreakdown).reduce((sum, count) => sum + count, 0)} items on first page`);
        return { ...pageSecurityBreakdown };
      }
      
      // Accumulate the counts from each page
      const newBreakdown = {
        accountNumbers: prev.accountNumbers + pageSecurityBreakdown.accountNumbers,
        mobileNumbers: prev.mobileNumbers + pageSecurityBreakdown.mobileNumbers,
        emails: prev.emails + pageSecurityBreakdown.emails,
        panIds: prev.panIds + pageSecurityBreakdown.panIds,
        customerIds: prev.customerIds + pageSecurityBreakdown.customerIds,
        ifscCodes: prev.ifscCodes + pageSecurityBreakdown.ifscCodes,
        cardNumbers: prev.cardNumbers + pageSecurityBreakdown.cardNumbers,
        addresses: prev.addresses + pageSecurityBreakdown.addresses,
        names: prev.names + pageSecurityBreakdown.names,
      };
      
      const currentPageTotal = Object.values(pageSecurityBreakdown).reduce((sum, count) => sum + count, 0);
      const totalProtected = Object.values(newBreakdown).reduce((sum, count) => sum + count, 0);
      
      if (currentPageTotal > 0) {
        addLog(`🔐 Protected ${currentPageTotal} more items - Total: ${totalProtected} sensitive items masked`);
      }
      
      return newBreakdown;
    });
  }, [addLog]);

  const resetSecurityBreakdown = useCallback(() => {
    setLiveSecurityBreakdown(null);
  }, []);

  const updateProgress = useCallback((
    status: QueueProgress['status'],
    currentPage: number,
    totalPages: number,
    operation: string,
    completedPages: number = 0,
    successfulPages: number = 0,
    failedPages: number = 0
  ) => {
    const percentComplete = totalPages > 0 ? (completedPages / totalPages) * 100 : 0;
    const avgTimePerPage = 3000; // Estimated 3 seconds per page
    const remainingPages = totalPages - completedPages;
    const estimatedTimeRemaining = remainingPages * avgTimePerPage;

    setProgress({
      currentPage,
      totalPages,
      completedPages,
      successfulPages,
      failedPages,
      percentComplete,
      estimatedTimeRemaining,
      status,
      currentOperation: operation
    });
  }, []);

  const extractTextFromPDFByPages = useCallback(async (file: File): Promise<string[]> => {
    // This would use a PDF extraction library to get page-by-page content
    // For now, simulating with chunked text
    console.log('📄 PDF EXTRACTION - Starting for file:', file.name, file.size, 'bytes');
    addLog('📄 Extracting text from PDF pages...');
    
    // Mock implementation - in real app, this would use PDF.js or similar
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log('📄 PDF EXTRACTION - Calling /api/pdf/extract-pages');
      const response = await fetch('/api/pdf/extract-pages', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.error('📄 PDF EXTRACTION - API failed with status:', response.status);
        const errorData = await response.json();
        if (errorData.error === 'PASSWORD_PROTECTED_PDF') {
          throw new Error('PASSWORD_PROTECTED_PDF');
        }
        throw new Error('Failed to extract PDF pages');
      }

      const result = await response.json();
      if (result.error === 'PASSWORD_PROTECTED_PDF') {
        throw new Error('PASSWORD_PROTECTED_PDF');
      }
      console.log('📄 PDF EXTRACTION - Success! Pages:', result.pages.length);
      addLog(`📄 Successfully extracted ${result.pages.length} pages`);
      return result.pages;
    } catch (error) {
      // Check if this is a password-protected PDF error
      if (error instanceof Error && error.message === 'PASSWORD_PROTECTED_PDF') {
        throw error; // Re-throw password-protected errors for special handling
      }
      
      // Fallback to single page processing if pages API fails
      console.error('📄 PDF EXTRACTION - Error:', error);
      addLog('⚠️ Page extraction failed, using fallback method');
      const text = await extractTextFromPDFFallback(file);
      return [text]; // Return as single page
    }
  }, [addLog]);

  const extractTextFromPDFFallback = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/pdf/extract', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.error === 'PASSWORD_PROTECTED_PDF') {
        throw new Error('PASSWORD_PROTECTED_PDF');
      }
      throw new Error('Failed to extract PDF text');
    }

    const result = await response.json();
    if (result.error === 'PASSWORD_PROTECTED_PDF') {
      throw new Error('PASSWORD_PROTECTED_PDF');
    }
    return result.text;
  };

  const validateStatement = useCallback(async (
    request: StatementValidationRequest
  ): Promise<StatementValidationResult> => {
    addLog(`🔍 Validating statement for ${request.bankName} - ${request.month}/${request.year}`);

    try {
      // Always use the validation API endpoint which now handles both custom endpoint and LLM providers
      // This ensures consistent validation flow regardless of provider type
      addLog(`🔧 Using validation API for consistent processing`);
      
      const response = await fetch('/api/ai/validate-statement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Validation API request failed');
      }

      const result = await response.json();
      
      // Check if this is a service error from the API
      if (result.serviceError) {
        addLog(`🚨 LLM Service Error: ${result.errorMessage}`);
        throw new Error(result.errorMessage);
      }
      
      if (result.isValid) {
        addLog(`✅ Statement validation passed`);
      } else {
        addLog(`❌ Statement validation failed: ${result.errorMessage}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      addLog(`❌ Validation error: ${errorMessage}`);
      
      return {
        isValid: false,
        bankMatches: false,
        monthMatches: false,
        yearMatches: false,
        errorMessage,
        detectedBank: null,
        detectedMonth: null,
        detectedYear: null,
        confidence: 0
      };
    }
  }, [addLog]);

  const processPage = useCallback(async (
    pageContent: string,
    pageNumber: number,
    totalPages: number,
    previousBalance?: number,
    userCategories?: Category[]
  ): Promise<PageProcessingResult> => {
    addLog(`⚙️ Processing page ${pageNumber} of ${totalPages}`);

    try {
      const response = await fetch('/api/ai/process-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageContent,
          pageNumber,
          totalPages,
          previousBalance,
          userCategories: userCategories?.map(c => c.name) || []
        }),
      });

      if (!response.ok) {
        throw new Error(`Page ${pageNumber} processing failed`);
      }

      const result = await response.json();
      
      // Check if this is a service error from the page processing API
      if (result.serviceError) {
        addLog(`🚨 Page ${pageNumber} LLM Service Error: ${result.processingNotes}`);
        throw new Error(result.processingNotes);
      }
      
      addLog(`✅ Page ${pageNumber} processed: ${result.transactions.length} transactions found`);
      
      return {
        ...result,
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Page processing failed';
      addLog(`❌ Page ${pageNumber} error: ${errorMessage}`);
      
      return {
        pageNumber,
        totalPages,
        transactions: [],
        pageEndingBalance: previousBalance || 0,
        processingNotes: `Error: ${errorMessage}`,
        hasIncompleteTransactions: false,
        success: false,
        error: errorMessage
      };
    }
  }, [addLog]);

  const finalizeCategories = useCallback(async (
    allTransactions: Transaction[],
    userCategories?: Category[]
  ): Promise<Transaction[]> => {
    if (allTransactions.length === 0) {
      return [];
    }

    addLog(`📊 Finalizing categories for ${allTransactions.length} transactions`);

    try {
      const response = await fetch('/api/ai/finalize-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: allTransactions,
          userCategories: userCategories?.map(c => c.name) || []
        }),
      });

      if (!response.ok) {
        throw new Error('Category finalization failed');
      }

      const result = await response.json();
      addLog(`✅ Categories finalized successfully`);
      
      return result.finalizedTransactions;
    } catch (error) {
      addLog(`⚠️ Category finalization failed, using original transactions`);
      return allTransactions;
    }
  }, [addLog]);

  const processStatement = useCallback(async (
    file: File,
    bankName: string,
    month: string,
    year: string,
    userCategories: Category[] = []
  ): Promise<EnhancedProcessingResult> => {
    if (isProcessing) {
      throw new Error('Another statement is currently being processed');
    }

    const startTime = Date.now();
    setIsProcessing(true);
    setError(null);
    clearLogs();
    resetSecurityBreakdown(); // Reset live security tracking

    try {
      console.log('🚀 ENHANCED PROCESSING - Starting for file:', file.name, 'Bank:', bankName, 'Month:', month, 'Year:', year);
      addLog(`🚀 Starting enhanced AI processing for ${file.name}`);
      addLog(`🏦 Target: ${bankName} - ${month}/${year}`);
      addLog(`📊 File: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

      // Step 1: Extract pages from PDF
      updateProgress('validating', 0, 1, 'Extracting pages from PDF...');
      console.log('📄 ENHANCED PROCESSING - Extracting PDF pages...');
      const pages = await extractTextFromPDFByPages(file);
      const totalPages = pages.length;
      console.log('📄 ENHANCED PROCESSING - Extracted', totalPages, 'pages');
      
      addLog(`📄 Extracted ${totalPages} pages from PDF`);

      // Step 2: Validate statement using first 3 pages (more likely to contain statement period)
      updateProgress('validating', 1, totalPages, 'Validating statement...');
      const validationPages = pages.slice(0, Math.min(3, pages.length));
      const validationContent = validationPages.join('\n\n');
      console.log('🔍 ENHANCED PROCESSING - Using first', validationPages.length, 'pages for validation');
      console.log('🔍 ENHANCED PROCESSING - Validation content length:', validationContent.length);
      
      const validation = await validateStatement({
        bankName,
        month,
        year,
        pageContent: validationContent
      });
      
      setValidationResult(validation);

      if (!validation.isValid) {
        throw new Error(validation.errorMessage || 'Statement validation failed');
      }

      // Step 3: Process pages sequentially
      const allTransactions: Transaction[] = [];
      const pageResults: PageProcessingResult[] = [];
      let previousBalance: number | undefined;
      let successfulPages = 0;
      let failedPages = 0;

      for (let i = 0; i < pages.length; i++) {
        updateProgress(
          'processing',
          i + 1,
          totalPages,
          `Processing page ${i + 1} of ${totalPages}...`,
          i,
          successfulPages,
          failedPages
        );

        const pageResult = await processPage(
          pages[i],
          i + 1,
          totalPages,
          previousBalance,
          userCategories
        );

        pageResults.push(pageResult);
        setPageResults(prev => [...prev, pageResult]);

        // Debug: Log what we received for security breakdown
        console.log(`🔍 PAGE ${i + 1} - Security breakdown check:`, {
          exists: !!pageResult.securityBreakdown,
          data: pageResult.securityBreakdown,
          total: pageResult.securityBreakdown ? Object.values(pageResult.securityBreakdown).reduce((sum, count) => sum + count, 0) : 0
        });

        // Always update live security breakdown (even if empty) 
        // This will accumulate the real sanitization data from the API
        if (pageResult.securityBreakdown) {
          updateLiveSecurityBreakdown(pageResult.securityBreakdown);
        }

        if (pageResult.success) {
          allTransactions.push(...pageResult.transactions);
          previousBalance = pageResult.pageEndingBalance;
          successfulPages++;
        } else {
          failedPages++;
        }

        // Small delay between pages to show progress
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 4: Finalize categories
      updateProgress(
        'categorizing',
        totalPages,
        totalPages,
        'Finalizing transaction categories...',
        totalPages,
        successfulPages,
        failedPages
      );

      const finalizedTransactions = await finalizeCategories(allTransactions, userCategories);

      // Step 5: Complete
      updateProgress(
        'completed',
        totalPages,
        totalPages,
        'Processing completed successfully!',
        totalPages,
        successfulPages,
        failedPages
      );

      const processingTimeMs = Date.now() - startTime;
      addLog(`🎉 Processing completed in ${processingTimeMs}ms`);
      addLog(`📊 Final results: ${finalizedTransactions.length} transactions extracted`);

      // Aggregate security breakdown from all pages
      const aggregatedSecurityBreakdown = pageResults.reduce((acc, pageResult) => {
        if (pageResult.securityBreakdown) {
          return {
            accountNumbers: acc.accountNumbers + pageResult.securityBreakdown.accountNumbers,
            mobileNumbers: acc.mobileNumbers + pageResult.securityBreakdown.mobileNumbers,
            emails: acc.emails + pageResult.securityBreakdown.emails,
            panIds: acc.panIds + pageResult.securityBreakdown.panIds,
            customerIds: acc.customerIds + pageResult.securityBreakdown.customerIds,
            ifscCodes: acc.ifscCodes + pageResult.securityBreakdown.ifscCodes,
            cardNumbers: acc.cardNumbers + pageResult.securityBreakdown.cardNumbers,
            addresses: acc.addresses + pageResult.securityBreakdown.addresses,
            names: acc.names + pageResult.securityBreakdown.names,
          };
        }
        return acc;
      }, {
        accountNumbers: 0,
        mobileNumbers: 0,
        emails: 0,
        panIds: 0,
        customerIds: 0,
        ifscCodes: 0,
        cardNumbers: 0,
        addresses: 0,
        names: 0,
      });

      // Log security summary
      const totalItemsProtected = Object.values(aggregatedSecurityBreakdown).reduce((sum, count) => sum + count, 0);
      if (totalItemsProtected > 0) {
        addLog(`🔐 Security Summary: ${totalItemsProtected} sensitive items protected across all pages`);
        console.log('🔐 Aggregated Security Breakdown:', aggregatedSecurityBreakdown);
      } else {
        addLog(`🔐 Security Summary: No sensitive data detected`);
      }

      return {
        transactions: finalizedTransactions,
        validationResult: validation,
        pageResults,
        securityBreakdown: aggregatedSecurityBreakdown,
        analytics: {
          totalPages,
          successfulPages,
          failedPages,
          totalTransactions: finalizedTransactions.length,
          processingTimeMs
        }
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addLog(`❌ Processing failed: ${errorMessage}`);
      setError(errorMessage);
      
      updateProgress(
        'failed',
        0,
        1,
        `Processing failed: ${errorMessage}`,
        0,
        0,
        1
      );
      
      throw err;
    } finally {
      setIsProcessing(false);
      addLog('🏁 Enhanced processing session ended');
    }
  }, [
    isProcessing,
    clearLogs,
    addLog,
    updateProgress,
    extractTextFromPDFByPages,
    validateStatement,
    processPage,
    finalizeCategories
  ]);

  return {
    processStatement,
    isProcessing,
    progress,
    validationResult,
    pageResults,
    error,
    processingLogs,
    clearLogs,
    liveSecurityBreakdown
  };
};
