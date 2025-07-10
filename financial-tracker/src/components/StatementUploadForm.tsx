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

      console.log(`🎯 Processing file: ${file.name} (${fileType})`);

      // For PDF files - use AI processing
      if (fileType === 'application/pdf') {
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
      } 
      else {
        setErrors({ file: 'Unsupported file format. Please upload a PDF file.' });
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
  }, [processWithAI, aiError, clearLogs, dispatch, onTransactionsExtracted]);

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
              disabled={isLoading || isProcessingWithAI}
              maxSize={20 * 1024 * 1024} // 20MB for AI processing
            />
            {errors.file && (
              <p className="mt-1 text-sm text-red-600">{errors.file}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Supported formats: PDF (max 5MB)
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
                      {isProcessingWithAI ? 'AI Processing in Progress...' : 'Processing File...'}
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
