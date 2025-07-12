import { FC, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { BankAccount, StatementUpload, Transaction } from '@/types';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { FileUpload } from './FileUpload';
import { ProcessingLogs } from './ProcessingLogs';
import { SecurityStatus } from './SecurityStatus';
import { EnvironmentCheck } from './EnvironmentCheck';
import { useAIPdfProcessor } from '@/hooks/useAIPdfProcessor';
import { RootState } from '@/store';

interface StatementUploadFormProps {
  accounts: BankAccount[];
  selectedAccountId: string;
  selectedMonth: number;
  selectedYear: number;
  onSubmit: (data: StatementUpload) => void;
  onCancel: () => void;
  onTransactionsExtracted: (transactions: Transaction[]) => void;
  isLoading?: boolean;
  isReupload?: boolean;
}

interface HealthData {
  services: {
    gemini: 'available' | 'not_configured' | 'connection_failed' | 'invalid_key';
  };
  details?: string;
  provider_info?: {
    type: string;
    name: string;
    isCustomEndpoint: boolean;
  };
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const StatementUploadForm: FC<StatementUploadFormProps> = ({
  accounts,
  selectedAccountId,
  selectedMonth,
  selectedYear,
  onSubmit,
  onCancel,
  onTransactionsExtracted,
  isLoading = false,
  isReupload = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [securityBreakdown, setSecurityBreakdown] = useState<{
    accountNumbers: number;
    mobileNumbers: number;
    emails: number;
    panIds: number;
    customerIds: number;
    ifscCodes: number;
    cardNumbers: number;
    addresses: number;
    names: number;
  } | null>(null);
  const [showSecurityCountdown, setShowSecurityCountdown] = useState(false);

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
  
  // Calculate statement dates based on month/year
  const statementStartDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const statementEndDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${new Date(selectedYear, selectedMonth, 0).getDate().toString().padStart(2, '0')}`;

  const {
    processFile,
    isProcessing: aiProcessing,
    processingLogs: aiLogs,
    clearLogs: clearAiLogs,
  } = useAIPdfProcessor();

  // Get user categories from Redux store for AI category matching
  const userCategories = useSelector((state: RootState) => state.categories.items);

  // Helper function to check if AI processing is available
  const isAIAvailable = (): boolean => {
    return healthData?.services.gemini === 'available';
  };

  // Helper function to get AI status description
  const getAIStatusDescription = (): string => {
    if (!healthData) return 'Checking AI availability...';
    
    const { services, provider_info } = healthData;
    const isCustomEndpoint = provider_info?.isCustomEndpoint;
    
    switch (services.gemini) {
      case 'available':
        return isCustomEndpoint 
          ? `Custom endpoint ready: ${provider_info?.name}`
          : 'AI processing ready';
      case 'connection_failed':
        return isCustomEndpoint
          ? 'Custom endpoint connection failed'
          : 'AI service connection failed';
      case 'invalid_key':
        return 'Invalid API credentials';
      case 'not_configured':
      default:
        return isCustomEndpoint
          ? 'Custom endpoint not configured'
          : 'AI service not configured';
    }
  };

  // Check health status on component mount
  useEffect(() => {
    const checkHealthStatus = async () => {
      setIsCheckingHealth(true);
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data: HealthData = await response.json();
          setHealthData(data);
        }
      } catch (error) {
        console.error('Health check failed:', error);
      } finally {
        setIsCheckingHealth(false);
      }
    };

    checkHealthStatus();
  }, []);



  const addLog = (message: string) => {
    setProcessingLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    addLog(`📁 File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  };

  const validateForm = (): boolean => {
    if (!selectedFile) {
      addLog('❌ Please select a file to upload');
      return false;
    }

    if (!selectedAccount) {
      addLog('❌ Invalid account selection');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedFile || !selectedAccount) return;

    // Check if AI processing is available
    if (!isAIAvailable()) {
      addLog(`❌ AI processing is not available: ${getAIStatusDescription()}`);
      return;
    }

    setIsProcessing(true);
    addLog('🚀 Starting AI processing...');

    try {
      let extractedTransactions: Transaction[] = [];

      if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
        // Use AI processing for PDFs with category matching
        addLog('🤖 Processing PDF with AI...');
        addLog(`🎯 Using ${userCategories.length} user categories for matching`);
        const result = await processFile(selectedFile, userCategories);
        
        // Handle security breakdown
        if (result.securityBreakdown) {
          setSecurityBreakdown(result.securityBreakdown);
          const totalProtected = Object.values(result.securityBreakdown).reduce((sum, count) => sum + count, 0);
          if (totalProtected > 0) {
            addLog(`🔐 Protected ${totalProtected} sensitive data items`);
            addLog(`🛡️ Review security details below - proceeding in 3 seconds...`);
            setShowSecurityCountdown(true);
          } else {
            addLog(`✅ No sensitive data detected in document`);
          }
          
          // Add 3-second delay to let user see the security breakdown
          addLog(`⏳ Pausing to display security information...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          setShowSecurityCountdown(false);
          addLog(`▶️ Continuing with transaction processing...`);
        }
        
        if (result.transactions && result.transactions.length > 0) {
          extractedTransactions = result.transactions;
          addLog(`✅ Extracted ${extractedTransactions.length} transactions`);
          onTransactionsExtracted(extractedTransactions);
        } else {
          addLog('⚠️ No transactions extracted');
          onTransactionsExtracted([]);
        }
      } else {
        throw new Error('Unsupported file format. Please upload a PDF file.');
      }

      // Submit the statement record with the extracted transactions
      const uploadData: StatementUpload & { extractedTransactions?: Transaction[] } = {
        bank_account_id: selectedAccountId,
        statement_month: selectedMonth,
        statement_year: selectedYear,
        statement_start_date: statementStartDate,
        statement_end_date: statementEndDate,
        file: selectedFile,
        extractedTransactions: extractedTransactions, // Pass transactions directly
      };

      onSubmit(uploadData);
      addLog('✅ Statement upload completed successfully');

    } catch (error) {
      console.error('Processing error:', error);
      addLog(`❌ Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedAccount) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="max-w-2xl mx-auto text-center p-8">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Account</h2>
          <p className="text-gray-600 mb-6">
            The selected account could not be found. Please try again.
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
    >
      <Card className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isReupload ? 'Reupload Bank Statement' : 'Upload Bank Statement'}
            </h2>
            {isReupload && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">⚠️</span>
                  <span className="text-yellow-800 font-medium">
                    You are replacing an existing statement. The previous statement and its transactions will be removed.
                  </span>
                </div>
              </div>
            )}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-900">Account:</span>
                  <div className="text-blue-800">
                    {selectedAccount.account_nickname || `${selectedAccount.bank_name} ${selectedAccount.account_type}`}
                    {selectedAccount.account_number_last4 && ` (...${selectedAccount.account_number_last4})`}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Period:</span>
                  <div className="text-blue-800">
                    {months[selectedMonth - 1]} {selectedYear}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Date Range:</span>
                  <div className="text-blue-800">
                    {statementStartDate} to {statementEndDate}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Processing:</span>
                  <div className="text-blue-800">
                    AI Processing
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Method */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Processing Method</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <h4 className="font-semibold text-blue-900">AI Processing</h4>
                  <p className="text-blue-800">
                    {isAIAvailable() 
                      ? 'Using AI-powered processing to extract transactions from your bank statement.' 
                      : 'AI processing is not available.'}
                  </p>
                </div>
              </div>
              {isAIAvailable() ? (
                <div className="mt-3">
                  <div className="bg-blue-100 p-3 rounded text-sm text-blue-800">
                    <strong>AI Processing:</strong> Uses advanced machine learning to extract transactions from any bank format.
                    Results may require manual review for accuracy.
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="bg-red-100 p-3 rounded text-sm text-red-800">
                    <strong>AI Unavailable:</strong> {getAIStatusDescription()}. 
                    Please configure an AI provider or ensure your custom endpoint is running.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Environment Check for AI Processing */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Processing Setup</h3>
            <EnvironmentCheck onConfigComplete={() => {}} />
          </div>

          {/* File Upload */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Statement File</h3>
            <FileUpload
              onFileSelect={handleFileSelect}
              disabled={isLoading || isProcessing}
              maxSize={10 * 1024 * 1024} // 10MB
            />
            {selectedFile && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span>📁</span>
                  <span className="font-medium">{selectedFile.name}</span>
                  <span>•</span>
                  <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Processing Logs */}
          {(processingLogs.length > 0 || aiLogs.length > 0) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Processing Status</h3>
              <ProcessingLogs 
                logs={[...processingLogs, ...aiLogs]} 
                isVisible={true}
                isProcessing={isProcessing || aiProcessing}
                onClear={() => {
                  setProcessingLogs([]);
                  clearAiLogs();
                  setSecurityBreakdown(null);
                  setShowSecurityCountdown(false);
                }}
              />
              
              {/* Security Status */}
              {securityBreakdown && (
                <SecurityStatus
                  breakdown={securityBreakdown}
                  isVisible={true}
                  isProcessing={isProcessing || aiProcessing}
                  showCountdown={showSecurityCountdown}
                />
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading || isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || 
                isProcessing || 
                !selectedFile || 
                !isAIAvailable()
              }
            >
              {isProcessing ? 'Processing...' : isReupload ? 'Reupload & Process Statement' : 'Upload & Process Statement'}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};
