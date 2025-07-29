import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { FileUpload } from '@/components/FileUpload';
import { SecurityStatus } from '@/components/SecurityStatus';
import { ProcessingLogs } from '@/components/ProcessingLogs';
import { EnhancedProcessingStatus } from '@/components/EnhancedProcessingStatus';
import { useEnhancedAIProcessor } from '@/hooks/useEnhancedAIProcessor';
import { Transaction, BankAccount, Category, PageProcessingResult } from '@/types';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

interface SecurityBreakdown {
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

interface SimplifiedStatementUploadProps {
  accounts: BankAccount[];
  selectedAccountId: string;
  selectedMonth: number;
  selectedYear: number;
  onTransactionsExtracted: (transactions: Transaction[], pageResults?: PageProcessingResult[]) => void;
  onCancel: () => void;
  isReupload?: boolean;
}

export const SimplifiedStatementUpload: React.FC<SimplifiedStatementUploadProps> = ({
  accounts,
  selectedAccountId,
  selectedMonth,
  selectedYear,
  onTransactionsExtracted,
  onCancel,
  isReupload = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [uploadMinimized, setUploadMinimized] = useState(false);
  const [securityBreakdown, setSecurityBreakdown] = useState<any>(null);
  
  const user = useUser();
  const supabase = useSupabaseClient();

  const {
    processStatement,
    isProcessing: enhancedProcessing,
    progress,
    validationResult,
    pageResults,
    error: enhancedError,
    processingLogs,
    clearLogs: clearEnhancedLogs,
  } = useEnhancedAIProcessor();

  // Get selected account info
  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
  
  // Auto-populate bank name and period from props (no duplicates)
  const bankName = selectedAccount?.bank_name || '';
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long' });
  const yearString = selectedYear.toString();

  useEffect(() => {
    const fetchUserCategories = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;
        setUserCategories(data || []);
        
      } catch (error) {
        console.error('Error fetching user categories for upload:', error);
      }
    };

    fetchUserCategories();
  }, [user, supabase]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    clearEnhancedLogs();
    setUploadMinimized(false); // Show upload area during processing
    setSecurityBreakdown(null);

    try {
      console.log('🚀 Starting Enhanced AI-powered PDF processing...');
      console.log('📂 Using user categories for processing:', userCategories.map(c => c.name));
      console.log('🏦 Bank:', bankName);
      console.log('📅 Period:', monthName, yearString);
      
      const result = await processStatement(
        file,
        bankName,
        monthName,
        yearString,
        userCategories
      );
      
      console.log(`✅ Successfully extracted ${result.transactions.length} transactions using Enhanced AI`);
      
      // Set real security breakdown from the processing result
      if (result.securityBreakdown) {
        setSecurityBreakdown(result.securityBreakdown);
        console.log('🔐 Real security breakdown received:', result.securityBreakdown);
      }
      
      // Minimize upload area on success
      setUploadMinimized(true);
      
      onTransactionsExtracted(result.transactions, result.pageResults);
      
    } catch (error) {
      // Keep upload area expanded on error for retry
      setUploadMinimized(false);
      console.error('❌ Failed to process PDF with Enhanced AI:', error);
    }
  };

  // Clear errors when retrying
  const handleRetry = () => {
    clearEnhancedLogs();
    setUploadMinimized(false);
    setSelectedFile(null);
    setSecurityBreakdown(null); // Clear security breakdown on retry
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          {isReupload ? 'Re-upload' : 'Upload'} Bank Statement
        </h2>
        
        <div className="space-y-4">
          {/* Simplified Account Info - No Duplicates */}
          <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-900">
                  {selectedAccount?.bank_name} - {selectedAccount?.account_type}
                </h3>
                <p className="text-sm text-gray-600">
                  {monthName} {yearString} • Enhanced AI Processing with Security
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  🤖 AI Ready
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic File Upload Area */}
          <div className={`transition-all duration-300 ${uploadMinimized ? 'transform scale-95 opacity-75' : ''}`}>
            {uploadMinimized && !enhancedError ? (
              /* Minimized Upload State */
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-500">✅</span>
                    <span className="text-sm font-medium text-green-800">
                      File Uploaded: {selectedFile?.name}
                    </span>
                    <span className="text-xs text-green-600">
                      ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    onClick={handleRetry}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    Upload Different File
                  </Button>
                </div>
              </div>
            ) : (
              /* Full Upload Area */
              <div>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  maxSize={5 * 1024 * 1024} // 5MB
                />
                {selectedFile && !uploadMinimized && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Error Display with Retry Option */}
          {enhancedError && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-red-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3 flex-1">
                  <h4 className="font-medium text-red-800 mb-2">Statement Processing Failed</h4>
                  <p className="text-sm text-red-700 mb-3">{enhancedError}</p>
                  <div className="text-xs text-red-600 bg-red-100 p-2 rounded mb-3">
                    <strong>💡 Quick fixes:</strong>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      <li>Check that bank name matches the statement exactly</li>
                      <li>Verify month and year match the statement period</li>
                      <li>Ensure PDF is readable and not password-protected</li>
                      <li>Try uploading a different statement if this one is corrupted</li>
                    </ul>
                  </div>
                  <Button
                    onClick={handleRetry}
                    variant="secondary"
                    size="sm"
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Processing Status */}
          <EnhancedProcessingStatus
            isVisible={enhancedProcessing || progress !== null || processingLogs.length > 0}
            progress={progress || undefined}
            validationResult={validationResult || undefined}
            pageResults={pageResults}
            logs={processingLogs}
            securityBreakdown={securityBreakdown} // Pass real security breakdown
          />

          {/* Processing Logs */}
          {processingLogs.length > 0 && (
            <div className="mt-4">
              <ProcessingLogs 
                logs={processingLogs}
                isVisible={true}
                isProcessing={enhancedProcessing}
                onClear={clearEnhancedLogs}
              />
            </div>
          )}

          {/* Features List - Moved to Bottom */}
          {!enhancedProcessing && !progress && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">Enhanced AI Processing Features:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                <ul className="space-y-1">
                  <li>• ✅ Statement validation (bank, month, year verification)</li>
                  <li>• 📄 Page-by-page processing to handle token limits</li>
                  <li>• 🤖 Intelligent transaction categorization</li>
                  <li>• 🔍 Real-time progress tracking with detailed status</li>
                  <li>• 🔒 Advanced security protection for sensitive data</li>
                </ul>
                <ul className="space-y-1">
                  <li>• 🎯 Queue management for multi-page documents</li>
                  <li>• 📊 Processing analytics and performance metrics</li>
                  <li>• 🔄 Automatic retry and error handling</li>
                  <li>• 💾 Smart memory optimization</li>
                  <li>• 📈 Enhanced accuracy with context awareness</li>
                </ul>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button onClick={onCancel} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
