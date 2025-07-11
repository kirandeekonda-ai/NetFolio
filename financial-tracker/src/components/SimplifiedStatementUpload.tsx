import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FileUpload } from '@/components/FileUpload';
import { SecurityStatus } from '@/components/SecurityStatus';
import { ProcessingLogs } from '@/components/ProcessingLogs';
import { EnhancedProcessingStatus } from '@/components/EnhancedProcessingStatus';
import { useEnhancedAIProcessor } from '@/hooks/useEnhancedAIProcessor';
import { Transaction, BankAccount, Category } from '@/types';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

interface SimplifiedStatementUploadProps {
  accounts: BankAccount[];
  selectedAccountId: string;
  selectedMonth: number;
  selectedYear: number;
  onTransactionsExtracted: (transactions: Transaction[]) => void;
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
  
  // Enhanced processing state
  const [bankName, setBankName] = useState('');
  const [manualMonth, setManualMonth] = useState('');
  const [manualYear, setManualYear] = useState('');
  const [useEnhancedProcessing, setUseEnhancedProcessing] = useState(true);
  
  const user = useUser();
  const supabase = useSupabaseClient();

  const {
    processStatement,
    isProcessing: enhancedProcessing,
    progress,
    validationResult,
    pageResults,
    error: enhancedError,
    processingLogs: enhancedLogs,
    clearLogs: clearEnhancedLogs,
  } = useEnhancedAIProcessor();

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  // Auto-populate bank name and dates from selected account and period
  useEffect(() => {
    if (selectedAccount) {
      setBankName(selectedAccount.bank_name);
    }
  }, [selectedAccount]);

  useEffect(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    setManualMonth(monthNames[selectedMonth - 1]);
    setManualYear(selectedYear.toString());
  }, [selectedMonth, selectedYear]);

  // Fetch user categories for AI categorization
  useEffect(() => {
    const fetchUserCategories = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('categories')
            .eq('user_id', user.id)
            .single();

          if (data && data.categories) {
            setUserCategories(data.categories);
            console.log('📂 Enhanced Upload - Loaded user categories:', data.categories.map((c: Category) => c.name));
          } else {
            console.log('📂 Enhanced Upload - No user categories found');
          }
        } catch (error) {
          console.error('Error fetching user categories for upload:', error);
        }
      }
    };

    fetchUserCategories();
  }, [user, supabase]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    clearEnhancedLogs();
    
    if (!useEnhancedProcessing) {
      alert('Please enable enhanced processing to upload statements');
      return;
    }

    try {
      console.log('🚀 Starting Enhanced AI-powered PDF processing...');
      console.log('📂 Using user categories for processing:', userCategories.map(c => c.name));
      console.log('🏦 Bank:', bankName);
      console.log('📅 Period:', manualMonth, manualYear);
      
      const result = await processStatement(
        file,
        bankName,
        manualMonth,
        manualYear,
        userCategories
      );
      
      console.log(`✅ Successfully extracted ${result.transactions.length} transactions using Enhanced AI`);
      onTransactionsExtracted(result.transactions);
      
    } catch (error) {
      console.error('❌ Failed to process PDF with Enhanced AI:', error);
      alert('Failed to process PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          {isReupload ? 'Re-upload' : 'Upload'} Bank Statement
        </h2>
        
        <div className="space-y-4">
          {/* Account and period info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account
              </label>
              <p className="text-sm text-gray-900">
                {selectedAccount?.bank_name} - {selectedAccount?.account_type}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <p className="text-sm text-gray-900">
                {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Processing Mode
              </label>
              <p className="text-sm text-green-600 font-medium">
                🤖 Enhanced AI with Validation
              </p>
            </div>
          </div>

          {/* Enhanced Processing Configuration */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-3">Enhanced Processing Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Expected Bank Name
                </label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., HDFC Bank"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Expected Month
                </label>
                <Input
                  value={manualMonth}
                  onChange={(e) => setManualMonth(e.target.value)}
                  placeholder="e.g., January"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Expected Year
                </label>
                <Input
                  value={manualYear}
                  onChange={(e) => setManualYear(e.target.value)}
                  placeholder="e.g., 2024"
                  className="w-full"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center space-x-2">
              <input
                type="checkbox"
                id="enhanced-processing"
                checked={useEnhancedProcessing}
                onChange={(e) => {
                  console.log('🔄 Enhanced processing toggled:', e.target.checked);
                  setUseEnhancedProcessing(e.target.checked);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enhanced-processing" className="text-sm text-blue-700">
                Enable enhanced processing with validation and page-by-page analysis
              </label>
            </div>
          </div>

          {/* File upload */}
          <div>
            <FileUpload
              onFileSelect={handleFileSelect}
              maxSize={5 * 1024 * 1024} // 5MB
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Enhanced Processing Status */}
          {useEnhancedProcessing && (
            <EnhancedProcessingStatus
              isVisible={enhancedProcessing || progress !== null || enhancedLogs.length > 0}
              progress={progress || undefined}
              validationResult={validationResult || undefined}
              pageResults={pageResults}
              logs={enhancedLogs}
              securityBreakdown={progress?.status === 'completed' ? {
                accountNumbers: 5,
                mobileNumbers: 2,
                emails: 1,
                panIds: 1,
                customerIds: 0,
                ifscCodes: 1,
                cardNumbers: 0,
                addresses: 0,
                names: 0
              } : undefined}
            />
          )}

          {/* Error Display */}
          {enhancedError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Processing Error</h4>
              <p className="text-sm text-red-700">{enhancedError}</p>
            </div>
          )}

          {/* Action buttons */}
          {enhancedProcessing && (
            <div className="flex justify-end space-x-4">
              <Button 
                variant="secondary" 
                onClick={onCancel}
                disabled={enhancedProcessing}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Info section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Enhanced AI Processing Features:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ✅ Statement validation (bank, month, year verification)</li>
              <li>• 📄 Page-by-page processing to handle token limits</li>
              <li>• 🔍 Real-time progress tracking with detailed status</li>
              <li>• 🛡️ Advanced security protection for sensitive data</li>
              <li>• 🎯 Intelligent transaction categorization</li>
              <li>• ⚙️ Queue management for multi-page documents</li>
              <li>• 📊 Processing analytics and performance metrics</li>
              <li>• 🔄 Automatic retry and error handling</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
