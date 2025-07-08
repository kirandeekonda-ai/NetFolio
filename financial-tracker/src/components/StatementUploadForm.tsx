import { FC, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BankAccount, StatementUpload, Transaction } from '@/types';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { FileUpload } from './FileUpload';
import { ProcessingLogs } from './ProcessingLogs';
import { EnvironmentCheck } from './EnvironmentCheck';
import { useAIPdfProcessor } from '@/hooks/useAIPdfProcessor';
import { useDispatch } from 'react-redux';
import { setTransactions } from '@/store/transactionsSlice';
import { getFileTypeFromExtension } from '@/utils/fileTypes';
import { bankStatementParser } from '@/utils/bankStatementParser';
import Papa from 'papaparse';

interface StatementUploadFormProps {
  accounts: BankAccount[];
  onSubmit: (data: StatementUpload) => void;
  onCancel: () => void;
  isLoading?: boolean;
  onTransactionsExtracted?: (transactions: Transaction[]) => void;
}

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const StatementUploadForm: FC<StatementUploadFormProps> = ({
  accounts,
  onSubmit,
  onCancel,
  isLoading = false,
  onTransactionsExtracted,
}) => {
  const dispatch = useDispatch();
  const [availableTemplates, setAvailableTemplates] = useState<Array<{ identifier: string, bankName: string, format: string }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [processingMode, setProcessingMode] = useState<'ai' | 'template'>('ai');
  const [showLogs, setShowLogs] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isApiReady, setIsApiReady] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analytics, setAnalytics] = useState<{
    pagesProcessed: number;
    inputTokens: number;
    outputTokens: number;
  } | null>(null);
  
  // AI PDF processor hook
  const { 
    processFile: processWithAI, 
    isProcessing: isProcessingWithAI, 
    error: aiError, 
    processingLogs, 
    clearLogs 
  } = useAIPdfProcessor();

  const [formData, setFormData] = useState({
    bank_account_id: '',
    statement_month: new Date().getMonth() + 1,
    statement_year: new Date().getFullYear(),
    statement_start_date: '',
    statement_end_date: '',
    file: null as File | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeAccounts = accounts.filter(acc => acc.is_active);

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
            setErrors({ file: aiError || 'AI processing failed' });
            return;
          }
        } else {
          // Fallback to template system
          if (!selectedTemplate) {
            setErrors({ file: 'Please select a bank template first' });
            return;
          }

          console.log(`📋 Using template system with: ${selectedTemplate}`);
          const result = await bankStatementParser.parseStatement(file, selectedTemplate);
          if (result.success) {
            transactions = result.transactions;
            console.log('✅ Template processing completed successfully');
          } else {
            setErrors({ file: result.error || 'Failed to parse PDF file' });
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
                  user_id: '',
                  transaction_date: row[0],
                  description: row[1],
                  amount: parseFloat(row[2]),
                  transaction_type: parseFloat(row[2]) > 0 ? 'income' as const : 'expense' as const,
                  category: '',
                  is_transfer: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  // Legacy fields for backward compatibility
                  date: row[0],
                  type: parseFloat(row[2]) > 0 ? 'income' as const : 'expense' as const,
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
        setErrors({ file: 'Excel support coming soon' });
        return;
      }
      else {
        setErrors({ file: 'Unsupported file format' });
        return;
      }

      if (transactions.length > 0) {
        console.log(`🎉 Successfully extracted ${transactions.length} transactions`);
        console.log('📝 Sample transaction:', transactions[0]);
        
        setCurrentStep(4);
        
        // Store transactions in Redux store
        if (dispatch) {
          dispatch(setTransactions(transactions));
        }
        
        // Callback to parent component
        if (onTransactionsExtracted) {
          onTransactionsExtracted(transactions);
        }
        
        // Update form data with the file
        setFormData(prev => ({
          ...prev,
          file: file,
        }));
      } else {
        console.warn('⚠️ No transactions found in the file');
        setErrors({ file: 'No transactions found in the file' });
      }
    } catch (err) {
      console.error('💥 Error processing file:', err);
      setErrors({ file: err instanceof Error ? err.message : 'Unknown error occurred' });
    }
  }, [processingMode, selectedTemplate, processWithAI, aiError, clearLogs, dispatch, onTransactionsExtracted]);

  const handleFileChange = (file: File | null) => {
    if (file) {
      handleFileSelect(file);
      
      // Auto-generate start/end dates if not set
      if (!formData.statement_start_date || !formData.statement_end_date) {
        const year = formData.statement_year;
        const month = formData.statement_month;
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        
        setFormData(prev => ({
          ...prev,
          statement_start_date: startDate.toISOString().split('T')[0],
          statement_end_date: endDate.toISOString().split('T')[0],
        }));
      }
    }
    
    handleInputChange('file', file);
  };

  const handleInputChange = (field: string, value: string | number | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.bank_account_id) {
      newErrors.bank_account_id = 'Please select a bank account';
    }

    if (!formData.statement_start_date) {
      newErrors.statement_start_date = 'Statement start date is required';
    }

    if (!formData.statement_end_date) {
      newErrors.statement_end_date = 'Statement end date is required';
    }

    if (!formData.file) {
      newErrors.file = 'Please upload a statement file';
    }

    // Validate date range
    if (formData.statement_start_date && formData.statement_end_date) {
      const startDate = new Date(formData.statement_start_date);
      const endDate = new Date(formData.statement_end_date);
      
      if (endDate <= startDate) {
        newErrors.statement_end_date = 'End date must be after start date';
      }
      
      // Check if dates span at least 25 days (monthly statement validation)
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 25) {
        newErrors.statement_end_date = 'Statement must cover at least 25 days';
      }
      
      // Check if dates match the selected month/year
      if (startDate.getMonth() !== formData.statement_month - 1 || 
          startDate.getFullYear() !== formData.statement_year) {
        newErrors.statement_start_date = 'Start date must be in the selected month and year';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm() && formData.file) {
      onSubmit({
        bank_account_id: formData.bank_account_id,
        statement_month: formData.statement_month,
        statement_year: formData.statement_year,
        statement_start_date: formData.statement_start_date,
        statement_end_date: formData.statement_end_date,
        file: formData.file,
      });
    }
  };

  if (activeAccounts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="max-w-2xl mx-auto text-center p-8">
          <div className="text-6xl mb-4">🏦</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Bank Accounts</h2>
          <p className="text-gray-600 mb-6">
            You need to add at least one active bank account before uploading statements.
          </p>
          <Button onClick={onCancel}>
            Go Back
          </Button>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Progress Steps */}
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

      {/* Environment Check */}
      <EnvironmentCheck onConfigComplete={() => setIsApiReady(true)} />

      {/* Error Display */}
      <AnimatePresence>
        {(errors.file || aiError) && (
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
                  <p className="text-sm">{errors.file || aiError}</p>
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
      </Card>

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

      {/* Main Upload Form */}
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Upload Bank Statement
            </h2>
            <p className="text-gray-600">
              Upload your monthly bank statement for processing and transaction import
            </p>
          </div>

          {/* Bank Account Selection */}
          <div>
            <label htmlFor="bank_account_id" className="block text-sm font-medium text-gray-700 mb-2">
              Select Bank Account *
            </label>
            <select
              id="bank_account_id"
              value={formData.bank_account_id}
              onChange={(e) => handleInputChange('bank_account_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="">Choose an account...</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_nickname || `${account.bank_name} ${account.account_type}`}
                  {account.account_number_last4 && ` (...${account.account_number_last4})`}
                </option>
              ))}
            </select>
            {errors.bank_account_id && (
              <p className="mt-1 text-sm text-red-600">{errors.bank_account_id}</p>
            )}
          </div>

          {/* Statement Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statement Period *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="statement_month" className="block text-xs font-medium text-gray-600 mb-1">
                  Month
                </label>
                <select
                  id="statement_month"
                  value={formData.statement_month}
                  onChange={(e) => handleInputChange('statement_month', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="statement_year" className="block text-xs font-medium text-gray-600 mb-1">
                  Year
                </label>
                <Input
                  id="statement_year"
                  type="number"
                  value={formData.statement_year}
                  onChange={(e) => handleInputChange('statement_year', parseInt(e.target.value))}
                  min="2020"
                  max="2030"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Statement Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statement Date Range *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="statement_start_date" className="block text-xs font-medium text-gray-600 mb-1">
                  Start Date
                </label>
                <Input
                  id="statement_start_date"
                  type="date"
                  value={formData.statement_start_date}
                  onChange={(e) => handleInputChange('statement_start_date', e.target.value)}
                  error={errors.statement_start_date}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="statement_end_date" className="block text-xs font-medium text-gray-600 mb-1">
                  End Date
                </label>
                <Input
                  id="statement_end_date"
                  type="date"
                  value={formData.statement_end_date}
                  onChange={(e) => handleInputChange('statement_end_date', e.target.value)}
                  error={errors.statement_end_date}
                  disabled={isLoading}
                />
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Ensure the dates cover the complete monthly statement period (at least 25 days)
            </p>
          </div>

          {/* File Upload */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Statement File *
              </label>
              {processingLogs.length > 0 && (
                <Button
                  type="button"
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
                    type="button"
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
              onFileSelect={handleFileChange}
              disabled={isLoading || isProcessingWithAI || (processingMode === 'template' && !selectedTemplate)}
              maxSize={20 * 1024 * 1024} // 20MB for AI processing
            />
            {errors.file && (
              <p className="mt-1 text-sm text-red-600">{errors.file}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Supported formats: PDF, CSV (max 20MB for AI processing)
            </p>
            
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
          </div>

          {/* Upload Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Upload Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ensure the statement covers a complete month</li>
              <li>• PDF files work best for most banks</li>
              <li>• The file will be processed automatically</li>
              <li>• You can review transactions before they're added</li>
            </ul>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading || isProcessingWithAI}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isProcessingWithAI}
            >
              {isLoading || isProcessingWithAI ? 'Processing...' : 'Upload Statement'}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};
