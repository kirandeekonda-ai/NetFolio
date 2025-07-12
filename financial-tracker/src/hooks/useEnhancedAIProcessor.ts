/**
 * Enhanced AI Statement Processor Hook
 * Handles page-by-page processing with validation and queue management
 */

import { useState, useCallback } from 'react';
import { Transaction, Category } from '@/types';
import { isCustomEndpointAvailable, getActiveLLMProvider } from '@/lib/llm/config';
import { createLLMProvider } from '@/lib/llm/LLMProviderFactory';

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
        throw new Error('Failed to extract PDF pages');
      }

      const result = await response.json();
      console.log('📄 PDF EXTRACTION - Success! Pages:', result.pages.length);
      addLog(`📄 Successfully extracted ${result.pages.length} pages`);
      return result.pages;
    } catch (error) {
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
      throw new Error('Failed to extract PDF text');
    }

    const result = await response.json();
    return result.text;
  };

  const validateStatement = useCallback(async (
    request: StatementValidationRequest
  ): Promise<StatementValidationResult> => {
    addLog(`🔍 Validating statement for ${request.bankName} - ${request.month}/${request.year}`);

    try {
      // Check if custom endpoint is configured
      const useCustomEndpoint = isCustomEndpointAvailable();
      
      if (useCustomEndpoint) {
        // Use validation API for custom endpoint
        addLog(`🔧 Using custom endpoint validation API`);
        
        const response = await fetch('/api/ai/validate-statement', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error('Custom endpoint validation API request failed');
        }

        const result = await response.json();
        
        if (result.isValid) {
          addLog(`✅ Statement validation passed via custom endpoint`);
        } else {
          addLog(`❌ Statement validation failed via custom endpoint: ${result.errorMessage}`);
        }

        return result;
      } else {
        // For other LLM providers (Gemini, Azure OpenAI), use the LLM directly for validation
        addLog(`🚀 Using configured LLM provider for direct validation`);
        
        const providerConfig = getActiveLLMProvider();
        addLog(`🔧 Using LLM provider: ${providerConfig.provider_type}`);
        
        // Create validation prompt
        const validationPrompt = `You are a specialized financial statement validator working for a smart personal finance app.

Your task is to validate that the provided bank statement content matches the specified criteria before processing transactions.

**VALIDATION REQUIREMENTS:**
- Bank Name: ${request.bankName}
- Statement Month: ${request.month}
- Statement Year: ${request.year}

**STATEMENT CONTENT TO VALIDATE:**
${request.pageContent}

**VALIDATION INSTRUCTIONS:**
1. Carefully examine the statement content for bank name, month, and year information
2. Look for headers, footers, dates, and bank identifiers
3. Check if the statement belongs to the specified bank: "${request.bankName}"
4. Verify if the statement is from the specified month: "${request.month}"
5. Confirm if the statement is from the specified year: "${request.year}"

Return ONLY a JSON response with this exact structure:

{
  "isValid": boolean,
  "bankMatches": boolean,
  "monthMatches": boolean,
  "yearMatches": boolean,
  "errorMessage": "string or null",
  "detectedBank": "detected bank name or null",
  "detectedMonth": "detected month or null",
  "detectedYear": "detected year or null",
  "confidence": number (0-100)
}

**VALIDATION RULES:**
- Set isValid to true only if ALL criteria match (bank, month, year)
- Provide specific error messages for mismatches
- Include confidence score based on clarity of statement information
- Be flexible with bank name variations (e.g., "HDFC Bank" vs "HDFC")
- Accept month in various formats (MM, MMM, full month name)

Return ONLY the JSON. No explanations or additional text.`;

        try {
          const llmProvider = createLLMProvider(providerConfig);
          
          // Use transaction extraction method with validation prompt
          // The LLM will return validation JSON instead of transactions
          const extractionResult = await llmProvider.extractTransactions(validationPrompt, []);
          
          addLog(`🔍 Raw LLM validation response received`);
          console.log('🔍 VALIDATION - LLM extraction result:', JSON.stringify(extractionResult, null, 2));
          
          // Try to parse validation result from the extraction response
          let validationResult;
          
          // Check if the response has the validation structure
          if (extractionResult && typeof extractionResult === 'object') {
            // Try to find validation JSON in the response
            const responseText = JSON.stringify(extractionResult);
            const jsonMatch = responseText.match(/\{[\s\S]*"isValid"[\s\S]*\}/);
            
            if (jsonMatch) {
              validationResult = JSON.parse(jsonMatch[0]);
            } else if (extractionResult.transactions && extractionResult.transactions.length > 0) {
              // Sometimes the validation might be in the transactions field as text
              const transactionText = JSON.stringify(extractionResult.transactions);
              const validationMatch = transactionText.match(/\{[\s\S]*"isValid"[\s\S]*\}/);
              if (validationMatch) {
                validationResult = JSON.parse(validationMatch[0]);
              }
            }
          }
          
          if (!validationResult || typeof validationResult.isValid !== 'boolean') {
            throw new Error('Invalid validation response format from LLM');
          }
          
          if (validationResult.isValid) {
            addLog(`✅ Statement validation passed via ${providerConfig.provider_type}`);
          } else {
            addLog(`❌ Statement validation failed via ${providerConfig.provider_type}: ${validationResult.errorMessage}`);
          }
          
          return {
            isValid: validationResult.isValid || false,
            bankMatches: validationResult.bankMatches || false,
            monthMatches: validationResult.monthMatches || false,
            yearMatches: validationResult.yearMatches || false,
            errorMessage: validationResult.errorMessage || null,
            detectedBank: validationResult.detectedBank || null,
            detectedMonth: validationResult.detectedMonth || null,
            detectedYear: validationResult.detectedYear || null,
            confidence: validationResult.confidence || 0
          };
          
        } catch (llmError) {
          addLog(`⚠️ LLM validation failed, using fallback validation`);
          console.error('LLM validation error:', llmError);
          
          // Fallback to basic text-based validation
          const pageContent = request.pageContent.toLowerCase();
          const bankName = request.bankName.toLowerCase();
          const month = request.month.toLowerCase();
          const year = request.year.toString();
          
          const bankMatches = pageContent.includes(bankName) || 
                             pageContent.includes(bankName.replace(' bank', '')) ||
                             pageContent.includes(bankName.split(' ')[0]);
          
          const monthMatches = pageContent.includes(month) ||
                              pageContent.includes(month.substring(0, 3)) ||
                              request.pageContent.includes(year + '-' + String(getMonthNumber(month)).padStart(2, '0'));
          
          const yearMatches = request.pageContent.includes(year);
          const isValid = bankMatches && monthMatches && yearMatches;
          
          return {
            isValid,
            bankMatches,
            monthMatches,
            yearMatches,
            errorMessage: isValid ? null : `Fallback validation - Bank: ${bankMatches ? 'OK' : 'FAIL'}, Month: ${monthMatches ? 'OK' : 'FAIL'}, Year: ${yearMatches ? 'OK' : 'FAIL'}`,
            detectedBank: bankMatches ? request.bankName : null,
            detectedMonth: monthMatches ? request.month : null,
            detectedYear: yearMatches ? request.year : null,
            confidence: isValid ? 75 : 25
          };
        }
      }
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
    clearLogs
  };
};
