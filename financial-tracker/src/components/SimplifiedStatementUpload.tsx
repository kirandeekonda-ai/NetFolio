import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FileUpload } from '@/components/FileUpload';
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

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    clearLogs();
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      console.log('🚀 Starting AI-powered PDF processing...');
      console.log('📂 Using user categories for processing:', userCategories.map(c => c.name));
      
      const result = await processFile(selectedFile, userCategories);
      
      console.log(`✅ Successfully extracted ${result.transactions.length} transactions using AI`);
      onTransactionsExtracted(result.transactions);
      
    } catch (error) {
      console.error('❌ Failed to process PDF with AI:', error);
      alert('Failed to process PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const canProcess = selectedFile && !isProcessing && !aiProcessing;

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
              maxSize={20 * 1024 * 1024} // 20MB for AI processing
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Processing logs */}
          {processingLogs.length > 0 && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Processing Status:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {processingLogs.map((log, index) => (
                  <p key={index} className="text-sm text-gray-700 font-mono">
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end space-x-4">
            <Button 
              variant="secondary" 
              onClick={onCancel}
              disabled={isProcessing || aiProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleProcessFile}
              disabled={!canProcess}
              className={isProcessing || aiProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {isProcessing || aiProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  🚀 Extract Transactions
                </>
              )}
            </Button>
          </div>

          {/* Info section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">AI Processing Features:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Automatically detects transaction patterns</li>
              <li>• Handles multiple bank statement formats</li>
              <li>• Suggests categories based on transaction descriptions</li>
              <li>• Preserves credit/debit amounts correctly</li>
              <li>• Supports files up to 20MB</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
