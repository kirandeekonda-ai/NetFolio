import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FileUpload } from '@/components/FileUpload';
import { SecurityStatus } from '@/components/SecurityStatus';
import { ProcessingLogs } from '@/components/ProcessingLogs';
import { useAIPdfProcessor } from '@/hooks/useAIPdfProcessor';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
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
  
  const user = useUser();
  const supabase = useSupabaseClient();

  const {
    processFile,
    isProcessing: aiProcessing,
    processingLogs,
    clearLogs,
  } = useAIPdfProcessor();

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

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
            console.log('📂 SimplifiedUpload - Loaded user categories:', data.categories.map((c: Category) => c.name));
          } else {
            console.log('📂 SimplifiedUpload - No user categories found');
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
    clearLogs();
    setSecurityBreakdown(null);
    setShowSecurityCountdown(false);
    
    // Auto-process the file immediately after selection
    setIsProcessing(true);
    try {
      console.log('🚀 Starting AI-powered PDF processing...');
      console.log('📂 Using user categories for processing:', userCategories.map(c => c.name));
      
      const result = await processFile(file, userCategories);
      
      // Handle security breakdown
      if (result.securityBreakdown) {
        setSecurityBreakdown(result.securityBreakdown);
        const totalProtected = Object.values(result.securityBreakdown).reduce((sum, count) => sum + count, 0);
        if (totalProtected > 0) {
          console.log(`🔐 Protected ${totalProtected} sensitive data items`);
          console.log(`🛡️ Review security details below - proceeding in 3 seconds...`);
          setShowSecurityCountdown(true);
          
          // Add 3-second delay to let user see the security breakdown
          console.log(`⏳ Pausing to display security information...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          setShowSecurityCountdown(false);
          console.log(`▶️ Continuing with transaction processing...`);
        } else {
          console.log(`✅ No sensitive data detected in document`);
        }
      }
      
      console.log(`✅ Successfully extracted ${result.transactions.length} transactions using AI`);
      onTransactionsExtracted(result.transactions);
      
    } catch (error) {
      console.error('❌ Failed to process PDF with AI:', error);
      alert('Failed to process PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
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
                🤖 AI-Powered Extraction
              </p>
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

          {/* Processing logs and Security Status */}
          {(processingLogs.length > 0 || securityBreakdown) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Processing Status</h3>
              {processingLogs.length > 0 && (
                <ProcessingLogs 
                  logs={processingLogs} 
                  isVisible={true}
                  isProcessing={isProcessing || aiProcessing}
                  onClear={() => {
                    clearLogs();
                    setSecurityBreakdown(null);
                    setShowSecurityCountdown(false);
                  }}
                />
              )}
              
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

          {/* Action buttons */}
          {(isProcessing || aiProcessing) && (
            <div className="flex justify-end space-x-4">
              <Button 
                variant="secondary" 
                onClick={onCancel}
                disabled={isProcessing || aiProcessing}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Info section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">AI Processing Features:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Automatically detects transaction patterns</li>
              <li>• Handles multiple bank statement formats</li>
              <li>• Suggests categories based on transaction descriptions</li>
              <li>• Preserves credit/debit amounts correctly</li>
              <li>• Supports PDF files up to 5MB</li>
              <li>• Processes files immediately upon selection</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
