import { FC, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { BankAccount, StatementUpload, Transaction } from '@/types';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { FileUpload } from './FileUpload';
import { ProcessingLogs } from './ProcessingLogs';
import { EnvironmentCheck } from './EnvironmentCheck';
import { useAIPdfProcessor } from '@/hooks/useAIPdfProcessor';
import { bankStatementParser } from '@/utils/bankStatementParser';
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

interface BankTemplate {
  id: string;
  bank_name: string;
  format: string;
  identifier: string;
  parser_module: string;
  parser_config: any;
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
  const [availableTemplates, setAvailableTemplates] = useState<BankTemplate[]>([]);
  const [matchedTemplate, setMatchedTemplate] = useState<BankTemplate | null>(null);
  const [processingMode, setProcessingMode] = useState<'template' | 'ai'>('template');
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

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

  useEffect(() => {
    fetchAvailableTemplates();
  }, []);

  useEffect(() => {
    if (selectedAccount && availableTemplates.length > 0) {
      findMatchingTemplate();
    }
  }, [selectedAccount, availableTemplates]);

  const fetchAvailableTemplates = async () => {
    try {
      const templates = await bankStatementParser.getAvailableTemplates();
      setAvailableTemplates(templates.map(t => ({
        id: t.identifier,
        bank_name: t.bank_name,
        format: t.format,
        identifier: t.identifier,
        parser_module: t.parser_module,
        parser_config: t.parser_config,
      })));
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const findMatchingTemplate = () => {
    if (!selectedAccount) return;

    // Try to find an exact or partial match for the bank name
    const bankName = selectedAccount.bank_name.toLowerCase();
    
    const exactMatch = availableTemplates.find(template => 
      template.bank_name.toLowerCase() === bankName
    );

    if (exactMatch) {
      setMatchedTemplate(exactMatch);
      setProcessingMode('template');
      addLog(`✅ Found exact template match: ${exactMatch.bank_name} (${exactMatch.format})`);
      return;
    }

    // Try partial matching (e.g., "DBS" in "DBS Bank")
    const partialMatch = availableTemplates.find(template => {
      const templateName = template.bank_name.toLowerCase();
      return bankName.includes(templateName) || templateName.includes(bankName);
    });

    if (partialMatch) {
      setMatchedTemplate(partialMatch);
      setProcessingMode('template');
      addLog(`✅ Found partial template match: ${partialMatch.bank_name} (${partialMatch.format})`);
      return;
    }

    // No template found, suggest AI processing
    setMatchedTemplate(null);
    setProcessingMode('ai');
    addLog(`⚠️ No template found for "${selectedAccount.bank_name}". Using AI processing.`);
  };

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

    // Check if AI mode is selected but not available
    if (processingMode === 'ai' && !isAIAvailable()) {
      addLog(`❌ AI processing is not available: ${getAIStatusDescription()}`);
      return;
    }

    setIsProcessing(true);
    addLog(`🚀 Starting ${processingMode} processing...`);

    try {
      let extractedTransactions: Transaction[] = [];

      if (processingMode === 'ai') {
        // Use AI processing with category matching
        addLog('🤖 Processing with AI...');
        addLog(`🎯 Using ${userCategories.length} user categories for matching`);
        const result = await processFile(selectedFile, userCategories);
        
        if (result.transactions && result.transactions.length > 0) {
          extractedTransactions = result.transactions;
          addLog(`✅ Extracted ${extractedTransactions.length} transactions`);
          onTransactionsExtracted(extractedTransactions);
        } else {
          addLog('⚠️ No transactions extracted');
          onTransactionsExtracted([]);
        }
      } else if (matchedTemplate) {
        // Use template processing
        addLog(`🏦 Processing with ${matchedTemplate.bank_name} template...`);
        console.log(`StatementUploadForm: Starting template processing with ${matchedTemplate.identifier}`, matchedTemplate);
        
        const result = await bankStatementParser.parseStatement(selectedFile, matchedTemplate.identifier);
        console.log(`StatementUploadForm: Template processing result:`, result);
        
        if (result.success && result.transactions) {
          extractedTransactions = result.transactions;
          addLog(`✅ Template processing completed. Extracted ${extractedTransactions.length} transactions`);
          console.log(`StatementUploadForm: Extracted transactions:`, extractedTransactions);
          onTransactionsExtracted(extractedTransactions);
        } else {
          addLog(`❌ Template processing failed: ${result.error || 'Unknown error'}`);
          throw new Error(result.error || 'Template processing failed');
        }
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
                    {matchedTemplate ? `${matchedTemplate.bank_name} Template` : 'AI Processing'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Status */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Processing Method</h3>
            {matchedTemplate ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <h4 className="font-semibold text-green-900">Template Found</h4>
                    <p className="text-green-800">
                      Using {matchedTemplate.bank_name} {matchedTemplate.format} template for accurate extraction
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-4">
                  <Button
                    type="button"
                    variant={processingMode === 'template' ? 'primary' : 'secondary'}
                    onClick={() => {
                      setProcessingMode('template');
                      addLog(`🏦 Switched to template processing: ${matchedTemplate.bank_name}`);
                    }}
                  >
                    Use Template
                  </Button>
                  <div className="relative">
                    <Button
                      type="button"
                      variant={processingMode === 'ai' ? 'primary' : 'secondary'}
                      onClick={() => {
                        if (isAIAvailable()) {
                          setProcessingMode('ai');
                          addLog('🤖 Switched to AI processing');
                        }
                      }}
                      disabled={!isAIAvailable()}
                      title={isAIAvailable() ? 'Switch to AI processing' : getAIStatusDescription()}
                    >
                      {isCheckingHealth ? 'Checking...' : 'Use AI Instead'}
                    </Button>
                    {!isAIAvailable() && healthData && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800 z-10">
                        {getAIStatusDescription()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h4 className="font-semibold text-yellow-900">No Template Available</h4>
                    <p className="text-yellow-800">
                      No template found for "{selectedAccount.bank_name}". 
                      {isAIAvailable() 
                        ? ' Using AI-powered processing.' 
                        : ' AI processing is not available.'}
                    </p>
                  </div>
                </div>
                {isAIAvailable() ? (
                  <div className="mt-3">
                    <div className="bg-yellow-100 p-3 rounded text-sm text-yellow-800">
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
            )}
          </div>

          {/* Environment Check for AI Processing */}
          {processingMode === 'ai' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Processing Setup</h3>
              <EnvironmentCheck onConfigComplete={() => {}} />
            </div>
          )}

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
                }}
              />
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
                (processingMode === 'ai' && !isAIAvailable())
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
