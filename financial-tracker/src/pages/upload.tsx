import { NextPage } from 'next';
import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { FileUpload } from '@/components/FileUpload';
import { ProcessingLogs } from '@/components/ProcessingLogs';
import { EnvironmentCheck } from '@/components/EnvironmentCheck';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { setTransactions } from '@/store/transactionsSlice';
import { useAIPdfProcessor } from '@/hooks/useAIPdfProcessor';
import Papa from 'papaparse';
import { Transaction } from '@/types';
import { getFileTypeFromExtension } from '@/utils/fileTypes';
import { bankStatementParser } from '@/utils/bankStatementParser';

const Upload: NextPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [availableTemplates, setAvailableTemplates] = useState<Array<{ identifier: string, bankName: string, format: string }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [processingMode, setProcessingMode] = useState<'ai' | 'template'>('ai');
  const [showLogs, setShowLogs] = useState(false);
  const [analytics, setAnalytics] = useState<{
    pagesProcessed: number;
    inputTokens: number;
    outputTokens: number;
  } | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);

  // AI PDF processor hook
  const { 
    processFile: processWithAI, 
    isProcessing: isProcessingWithAI, 
    error: aiError, 
    processingLogs, 
    clearLogs 
  } = useAIPdfProcessor();

  // Load available templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await bankStatementParser.getAvailableTemplates();
        setAvailableTemplates(templates.map(t => ({
          identifier: t.identifier,
          bankName: t.bank_name,
          format: t.format
        })));
        // Set default template to DBS if available
        const dbsTemplate = templates.find(t => t.identifier === 'dbs_pdf_v1');
        if (dbsTemplate) {
          setSelectedTemplate(dbsTemplate.identifier);
        }
      } catch (err) {
        console.error('Error loading templates:', err);
        setError('Failed to load bank templates');
      }
    };

    loadTemplates();
  }, []);

  // Set processing mode based on API availability
  useEffect(() => {
    if (!isApiReady && processingMode === 'ai') {
      setProcessingMode('template');
    }
  }, [isApiReady, processingMode]);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setError('');
    setAnalytics(null);
    clearLogs();

    try {
      let transactions: Transaction[] = [];
      const fileType = getFileTypeFromExtension(file.name);

      console.log(`🎯 Processing file: ${file.name} (${fileType}) using ${processingMode} mode`);

      // For PDF files - use AI processing or template system
      if (fileType === 'application/pdf') {
        if (processingMode === 'ai') {
          console.log('🤖 Using AI-powered PDF processing');
          setShowLogs(true);
          
          try {
            const result = await processWithAI(file);
            transactions = result.transactions;
            setAnalytics(result.analytics);
            console.log('✅ AI processing completed successfully');
          } catch (aiProcessingError) {
            console.error('❌ AI processing failed:', aiProcessingError);
            setError(aiError || 'AI processing failed');
            return;
          }
        } else {
          // Fallback to template system
          if (!selectedTemplate) {
            setError('Please select a bank template first');
            return;
          }

          console.log(`📋 Using template system with: ${selectedTemplate}`);
          const result = await bankStatementParser.parseStatement(file, selectedTemplate);
          if (result.success) {
            transactions = result.transactions;
            console.log('✅ Template processing completed successfully');
          } else {
            setError(result.error || 'Failed to parse PDF file');
            return;
          }
        }
      } 
      // For CSV files - keep existing logic
      else if (fileType === 'text/csv') {
        console.log('📊 Processing CSV file');
        await new Promise((resolve) => {
          Papa.parse<string[]>(file, {
            complete: (results: Papa.ParseResult<string[]>) => {
              transactions = results.data
                .slice(1)
                .map((row: string[], index: number) => ({
                  id: `tr-${index}`,
                  date: row[0],
                  description: row[1],
                  amount: parseFloat(row[2]),
                  type: parseFloat(row[2]) > 0 ? 'income' as const : 'expense' as const,
                  category: '',
                }));
              resolve(null);
            },
            header: true,
          });
        });
        console.log('✅ CSV processing completed');
      }
      // For Excel files (to be implemented)
      else if (fileType?.includes('excel')) {
        setError('Excel support coming soon');
        return;
      }
      else {
        setError('Unsupported file format');
        return;
      }

      if (transactions.length > 0) {
        console.log(`🎉 Successfully extracted ${transactions.length} transactions`);
        console.log('📝 Sample transaction:', transactions[0]);
        
        dispatch(setTransactions(transactions));
        
        // Show success message before navigation
        setTimeout(() => {
          router.push('/categorize');
        }, 1000);
      } else {
        console.warn('⚠️ No transactions found in the file');
        setError('No transactions found in the file');
      }
    } catch (err) {
      console.error('💥 Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, router, selectedTemplate, processingMode, processWithAI, aiError, clearLogs]);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-heading font-bold mb-6">
          Upload Bank Statement
        </h1>

        <EnvironmentCheck onConfigComplete={() => setIsApiReady(true)} />

        {(error || aiError) && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error || aiError}
          </div>
        )}

        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded"
          >
            <h3 className="font-semibold mb-2">✅ Processing Complete!</h3>
            <div className="text-sm space-y-1">
              <p>📄 Pages processed: {analytics.pagesProcessed}</p>
              <p>🔤 Input tokens: {analytics.inputTokens}</p>
              <p>💬 Output tokens: {analytics.outputTokens}</p>
            </div>
          </motion.div>
        )}

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Processing Mode</h2>
          <div className="mb-4">
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="ai"
                  checked={processingMode === 'ai'}
                  onChange={(e) => setProcessingMode(e.target.value as 'ai' | 'template')}
                  className="mr-2"
                  disabled={isLoading || isProcessingWithAI || !isApiReady}
                />
                <span className="text-sm">
                  🤖 AI-Powered (Recommended)
                  <div className="text-xs text-gray-500">
                    Uses Google Gemini to extract transactions from any PDF format
                    {!isApiReady && ' (Requires API configuration)'}
                  </div>
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="template"
                  checked={processingMode === 'template'}
                  onChange={(e) => setProcessingMode(e.target.value as 'ai' | 'template')}
                  className="mr-2"
                  disabled={isLoading || isProcessingWithAI}
                />
                <span className="text-sm">
                  📋 Template-Based
                  <div className="text-xs text-gray-500">Uses predefined templates for specific banks</div>
                </span>
              </label>
            </div>
          </div>
        </Card>

        {processingMode === 'template' && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Select Bank Template</h2>
            <div className="mb-4">
              <label htmlFor="template-select" className="block text-sm font-medium mb-2">
                Bank Template:
              </label>
              <select
                id="template-select"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading || isProcessingWithAI}
              >
                <option value="">Select a template...</option>
                {availableTemplates.map(template => (
                  <option key={template.identifier} value={template.identifier}>
                    {template.bankName} ({template.format})
                  </option>
                ))}
              </select>
            </div>
            {selectedTemplate && (
              <div className="text-sm text-gray-600">
                Selected: {availableTemplates.find(t => t.identifier === selectedTemplate)?.bankName} - {availableTemplates.find(t => t.identifier === selectedTemplate)?.format}
              </div>
            )}
          </Card>
        )}

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Upload File</h2>
            {processingLogs.length > 0 && (
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                📋 {showLogs ? 'Hide' : 'Show'} Logs
              </button>
            )}
          </div>
          
          <FileUpload
            onFileSelect={handleFileSelect}
            maxSize={20 * 1024 * 1024} // 20MB for AI processing
            disabled={isLoading || isProcessingWithAI || (processingMode === 'template' && !selectedTemplate)}
          />
          
          {(isLoading || isProcessingWithAI) && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-600">
                {processingMode === 'ai' ? 'Processing with AI...' : 'Processing file...'}
              </p>
              {isProcessingWithAI && (
                <p className="text-xs text-gray-500 mt-1">
                  This may take a few moments while our AI analyzes your PDF
                </p>
              )}
            </div>
          )}

          <ProcessingLogs
            logs={processingLogs}
            isVisible={showLogs}
            isProcessing={isProcessingWithAI}
            onClear={clearLogs}
          />
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-sm text-neutral-500"
        >
          <h2 className="font-semibold mb-2">Instructions:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>AI Mode (Recommended):</strong> Upload any PDF bank statement - our AI will automatically extract transactions</li>
            <li><strong>Template Mode:</strong> Select your bank template first, then upload the corresponding PDF</li>
            <li>CSV files are processed directly without templates</li>
            <li>Review and categorize the imported transactions on the next page</li>
            <li>Maximum file size is 20MB for AI processing, 5MB for template processing</li>
            <li>AI processing uses Google Gemini and may take a few moments</li>
            <li>All data is processed securely and not stored permanently</li>
          </ul>
        </motion.div>
      </motion.div>
    </Layout>
  );
};

export default Upload;
