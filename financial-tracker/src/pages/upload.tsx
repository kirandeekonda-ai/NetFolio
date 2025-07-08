import { NextPage } from 'next';
import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { FileUpload } from '@/components/FileUpload';
import { ProcessingLogs } from '@/components/ProcessingLogs';
import { EnvironmentCheck } from '@/components/EnvironmentCheck';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

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

  const steps = [
    { id: 1, title: 'Choose Method', icon: '⚙️', description: 'Select processing mode' },
    { id: 2, title: 'Upload File', icon: '📄', description: 'Add your statement' },
    { id: 3, title: 'Process', icon: '🤖', description: 'Extract transactions' },
    { id: 4, title: 'Review', icon: '✅', description: 'Check results' },
  ];

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'csv': return '📊';
      case 'xlsx':
      case 'xls': return '📈';
      default: return '📁';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadedFile(file);
    setCurrentStep(3);
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
        
        setCurrentStep(4);
        dispatch(setTransactions(transactions));
        
        // Show success message before navigation
        setTimeout(() => {
          router.push('/categorize');
        }, 2000);
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center space-x-3">
                  <span className="text-4xl">📊</span>
                  <span>Upload Statement</span>
                </h1>
                <p className="text-gray-600">
                  Transform your bank statements into actionable financial insights
                </p>
              </div>
              <div className="hidden md:block">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {analytics ? analytics.pagesProcessed || 0 : '0'}
                    </div>
                    <div className="text-sm text-gray-600">Pages Processed</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-300 ${
                        currentStep >= step.id
                          ? 'bg-indigo-600 text-white shadow-lg scale-110'
                          : currentStep === step.id - 1
                          ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-200'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {currentStep > step.id ? '✓' : step.icon}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`font-medium text-sm ${
                        currentStep >= step.id ? 'text-indigo-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 rounded transition-colors duration-300 ${
                      currentStep > step.id ? 'bg-indigo-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Environment Check */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <EnvironmentCheck onConfigComplete={() => setIsApiReady(true)} />
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {(error || aiError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="border-red-200 bg-red-50">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-red-700">
                    <p className="font-semibold">Error</p>
                    <p className="text-sm">{error || aiError}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Analytics */}
        <AnimatePresence>
          {analytics && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">✅</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">Processing Complete!</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center bg-white rounded-lg p-3">
                        <div className="font-bold text-green-600">{analytics.pagesProcessed}</div>
                        <div className="text-green-700">Pages</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-3">
                        <div className="font-bold text-blue-600">{analytics.inputTokens.toLocaleString()}</div>
                        <div className="text-blue-700">Input Tokens</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-3">
                        <div className="font-bold text-purple-600">{analytics.outputTokens.toLocaleString()}</div>
                        <div className="text-purple-700">Output Tokens</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Mode Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <span className="text-2xl">⚙️</span>
                  <span>Processing Mode</span>
                </h3>
                <p className="text-gray-600 mt-1">
                  Choose how you want to extract transactions from your statements
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  processingMode === 'ai'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => !isLoading && !isProcessingWithAI && isApiReady && setProcessingMode('ai')}
              >
                <input
                  type="radio"
                  value="ai"
                  checked={processingMode === 'ai'}
                  onChange={(e) => setProcessingMode(e.target.value as 'ai' | 'template')}
                  className="absolute top-4 right-4"
                  disabled={isLoading || isProcessingWithAI || !isApiReady}
                />
                <div className="flex items-start space-x-3">
                  <div className="text-3xl">🤖</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">AI-Powered (Recommended)</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Uses advanced AI to extract transactions from any PDF format
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isApiReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isApiReady ? '✓ Ready' : '⚠ Requires API'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  processingMode === 'template'
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => !isLoading && !isProcessingWithAI && setProcessingMode('template')}
              >
                <input
                  type="radio"
                  value="template"
                  checked={processingMode === 'template'}
                  onChange={(e) => setProcessingMode(e.target.value as 'ai' | 'template')}
                  className="absolute top-4 right-4"
                  disabled={isLoading || isProcessingWithAI}
                />
                <div className="flex items-start space-x-3">
                  <div className="text-3xl">📋</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Template-Based</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Uses predefined templates for specific bank formats
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ⚡ Fast & Reliable
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {processingMode === 'ai' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-blue-50 rounded-lg"
              >
                <div className="flex items-center space-x-2 text-blue-800">
                  <span className="text-lg">💡</span>
                  <span className="text-sm font-medium">AI Mode Benefits:</span>
                </div>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• Works with any bank or PDF format</li>
                  <li>• Automatically detects transaction patterns</li>
                  <li>• Higher accuracy for complex layouts</li>
                  <li>• No template configuration needed</li>
                </ul>
              </motion.div>
            )}
          </Card>
        </motion.div>

        {/* Template Selection (if template mode) */}
        <AnimatePresence>
          {processingMode === 'template' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-600"></div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                      <span className="text-2xl">🏦</span>
                      <span>Bank Template</span>
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Select your bank template for accurate transaction extraction
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-3">
                      Available Templates
                    </label>
                    <select
                      id="template-select"
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        setCurrentStep(2);
                      }}
                      className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 pl-4 pr-10 text-base focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 transition-all duration-200"
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
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-purple-50 rounded-lg p-4"
                    >
                      <h4 className="font-semibold text-purple-900 mb-2">Selected Template</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🏦</span>
                          <span className="font-medium text-purple-800">
                            {availableTemplates.find(t => t.identifier === selectedTemplate)?.bankName}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">📄</span>
                          <span className="text-purple-700">
                            {availableTemplates.find(t => t.identifier === selectedTemplate)?.format}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <span className="text-2xl">📤</span>
                  <span>Upload File</span>
                </h3>
                <p className="text-gray-600 mt-1">
                  Drag and drop your statement or click to browse
                </p>
              </div>
              {processingLogs.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center space-x-2"
                >
                  <span>📋</span>
                  <span>{showLogs ? 'Hide' : 'Show'} Logs</span>
                </Button>
              )}
            </div>
            
            {uploadedFile && !isLoading && !isProcessingWithAI && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">{getFileIcon(uploadedFile.name)}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{uploadedFile.name}</h4>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(uploadedFile.size)} • Uploaded successfully
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setUploadedFile(null);
                      setCurrentStep(2);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <span>🔄</span>
                    <span>Upload Different</span>
                  </Button>
                </div>
              </motion.div>
            )}
            
            <FileUpload
              onFileSelect={handleFileSelect}
              maxSize={20 * 1024 * 1024} // 20MB for AI processing
              disabled={isLoading || isProcessingWithAI || (processingMode === 'template' && !selectedTemplate)}
            />
            
            {(isLoading || isProcessingWithAI) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                <div className="inline-flex items-center space-x-3 bg-indigo-50 rounded-lg px-6 py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
                  <div>
                    <p className="font-medium text-indigo-900">
                      {processingMode === 'ai' ? 'AI Processing in Progress...' : 'Processing File...'}
                    </p>
                    {isProcessingWithAI && (
                      <p className="text-sm text-indigo-700 mt-1">
                        Our AI is analyzing your PDF - this may take a few moments
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <ProcessingLogs
              logs={processingLogs}
              isVisible={showLogs}
              isProcessing={isProcessingWithAI}
              onClear={clearLogs}
            />
          </Card>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-gray-50 to-blue-50 border-gray-200">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">💡</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-3">How It Works</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 font-bold mt-0.5">1.</span>
                      <div>
                        <strong>Choose Processing Mode:</strong> AI for any format, Template for specific banks
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold mt-0.5">2.</span>
                      <div>
                        <strong>Upload Statement:</strong> Drag & drop your PDF, CSV, or Excel file (max 20MB)
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="text-purple-500 font-bold mt-0.5">3.</span>
                      <div>
                        <strong>AI Extraction:</strong> Our system automatically extracts all transactions
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-orange-500 font-bold mt-0.5">4.</span>
                      <div>
                        <strong>Review & Categorize:</strong> Check results and organize your transactions
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">🔒 Privacy Note:</span> All processing happens securely. 
                    Your financial data is processed locally and not stored permanently.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Upload;
