import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { FileUpload } from '@/components/FileUpload';
import { UnifiedProcessingDashboard } from '@/components/UnifiedProcessingDashboard';
import { PasswordProtectedPDFDialog } from '@/components/PasswordProtectedPDFDialog';
import { BankLogo } from '@/components/BankLogo';
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
  const [showPasswordProtectedDialog, setShowPasswordProtectedDialog] = useState(false);
  const [passwordProtectedFileName, setPasswordProtectedFileName] = useState<string>('');

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
    liveSecurityBreakdown, // Add live security breakdown
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

  const handleFileSelect = async (file: File, password?: string) => {
    setSelectedFile(file);
    if (!password) {
      clearEnhancedLogs();
      setSecurityBreakdown(null);
    }
    // Hide upload area immediately when processing starts
    setUploadMinimized(true);

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
        userCategories,
        password // Pass the password if provided
      );

      // Check if validation failed (now returns result instead of throwing)
      if (result.validationResult && !result.validationResult.isValid) {
        // Keep upload area expanded for retry
        setUploadMinimized(false);
        console.log('❌ Statement validation failed:', result.validationResult.errorMessage);
        // The validation error is already displayed in the UI, no need to throw
        return;
      }

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

      // Check if this is a password-protected PDF error
      if (error instanceof Error && error.message === 'PASSWORD_PROTECTED_PDF') {
        console.log('🔐 Password-protected PDF detected, showing info dialog');
        setPasswordProtectedFileName(file.name);
        setShowPasswordProtectedDialog(true);
        // Don't reset selected file here so we can retry
        return;
      }

      console.error('❌ Failed to process PDF with Enhanced AI:', error);
    }
  };

  // Clear errors when retrying
  const handleRetry = () => {
    clearEnhancedLogs();
    setUploadMinimized(false);
    setSelectedFile(null);
    setSecurityBreakdown(null); // Clear security breakdown on retry
    setPasswordProtectedFileName('');
  };

  const handlePasswordSubmit = async (password: string) => {
    if (selectedFile) {
      setShowPasswordProtectedDialog(false);
      // clear logs but keep file selected
      clearEnhancedLogs();
      await handleFileSelect(selectedFile, password);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Premium Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-200/50">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">📤</span>
          </div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
            {isReupload ? 'Re-upload Statement' : 'Upload Bank Statement'}
          </h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Securely upload your bank statement and let our AI extract and categorize transactions automatically
        </p>
      </div>

      {/* Modern Account Info Card */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-3xl blur-xl"></div>
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-0">
            <div className="flex items-start md:items-center gap-4 md:gap-6">
              {/* Bank Logo */}
              <div className="flex-shrink-0">
                <BankLogo
                  bankName={selectedAccount?.bank_name || ''}
                  accountType={selectedAccount?.account_type || ''}
                  size="lg"
                  className="shadow-lg"
                />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {selectedAccount?.bank_name}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                  <span className="inline-flex items-center space-x-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    <span className="capitalize">{selectedAccount?.account_type}</span>
                  </span>
                  <span className="inline-flex items-center space-x-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                    <span>{monthName} {yearString}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
              <span className="inline-flex items-center self-start md:self-end px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border border-emerald-200/50">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                AI Processing Ready
              </span>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                <span>🔒 Bank-grade security</span>
                <span className="hidden md:inline">•</span>
                <span>🤖 Smart extraction</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium File Upload Section */}
      <div className="relative">
        <div className={`transition-all duration-500 ease-out ${uploadMinimized ? 'transform scale-98 opacity-90' : ''}`}>
          {/* Show upload area only when: no file selected, processing failed, validation failed, or user wants to change file */}
          {!selectedFile || (!uploadMinimized && (enhancedError || (validationResult && !validationResult.isValid))) ? (
            /* Upload Area - Full State */
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-500/10 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  maxSize={5 * 1024 * 1024} // 5MB
                />
                {selectedFile && !uploadMinimized && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white">📄</span>
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">{selectedFile.name}</p>
                        <p className="text-sm text-blue-700">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for processing
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : uploadMinimized && selectedFile && !enhancedError ? (
            /* Success State - Minimized - Only show when processing is complete/successful */
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-500/20 rounded-3xl blur-lg"></div>
              <div className="relative bg-gradient-to-r from-emerald-50 to-teal-50 backdrop-blur-xl rounded-3xl p-6 border border-emerald-200/50 shadow-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
                  <div className="flex items-center space-x-4 w-full md:w-auto">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <span className="text-white text-xl">✓</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-emerald-900 mb-1">File Successfully Uploaded</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-emerald-700">
                        <span className="flex items-center space-x-1 min-w-0">
                          <span>📄</span>
                          <span className="font-medium truncate max-w-[150px] sm:max-w-xs">{selectedFile.name}</span>
                        </span>
                        <span className="flex items-center space-x-1 whitespace-nowrap">
                          <span>📊</span>
                          <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleRetry}
                    variant="secondary"
                    className="w-full md:w-auto bg-white/70 hover:bg-white text-emerald-700 border-emerald-200 shadow-sm"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>🔄</span>
                      <span>Change File</span>
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Premium Error Display */}
      {enhancedError && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-500/20 rounded-3xl blur-xl"></div>
          <div className="relative bg-gradient-to-r from-red-50 to-pink-50 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-red-200/50 shadow-xl">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 self-center md:self-start mb-4 md:mb-0">
                <span className="text-white text-2xl">⚠️</span>
              </div>
              <div className="flex-1 w-full">
                <h3 className="text-xl font-semibold text-red-900 mb-3 text-center md:text-left">Processing Failed</h3>
                <p className="text-red-800 mb-6 leading-relaxed break-words break-all text-center md:text-left">{enhancedError}</p>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6">
                  <h4 className="font-semibold text-red-900 mb-3 flex items-center justify-center md:justify-start">
                    <span className="mr-2">💡</span>
                    Quick Solutions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-red-800">
                    <div className="flex items-start space-x-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Verify bank name matches statement exactly</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Check month and year are correct</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Ensure PDF is readable and not protected</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Try a different statement if corrupted</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center md:justify-start">
                  <Button
                    onClick={handleRetry}
                    className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg w-full md:w-auto"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>🔄</span>
                      <span>Try Again</span>
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* World-Class Unified Processing Dashboard */}
      <UnifiedProcessingDashboard
        isVisible={enhancedProcessing || progress !== null || processingLogs.length > 0}
        progress={progress || undefined}
        validationResult={validationResult || undefined}
        pageResults={pageResults}
        logs={processingLogs}
        securityBreakdown={liveSecurityBreakdown || securityBreakdown}
        isProcessing={enhancedProcessing}
        onClearLogs={clearEnhancedLogs}
        fileInfo={selectedFile ? { name: selectedFile.name, size: selectedFile.size } : undefined}
        onChangeFile={handleRetry}
      />

      {/* Premium Features Showcase */}
      {!enhancedProcessing && !progress && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-500/10 rounded-3xl blur-xl"></div>
          <div className="relative bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-xl rounded-3xl p-8 border border-blue-200/30 shadow-xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg mb-4">
                <span className="text-white text-lg">🚀</span>
                <h3 className="font-semibold text-white">AI-Powered Processing Features</h3>
              </div>
              <p className="text-blue-800 max-w-2xl mx-auto">
                Experience next-generation statement processing with advanced AI and enterprise-grade security
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: '🔍', title: 'Smart Validation', desc: 'Validates bank, month, and year automatically' },
                { icon: '📄', title: 'Page Processing', desc: 'Handles multi-page documents intelligently' },
                { icon: '🤖', title: 'Auto Categorization', desc: 'AI categorizes transactions accurately' },
                { icon: '�', title: 'Real-time Tracking', desc: 'Live progress with detailed status updates' },
                { icon: '🔒', title: 'Advanced Security', desc: 'Bank-grade protection for sensitive data' },
                { icon: '⚡', title: 'Smart Processing', desc: 'Optimized memory and error handling' },
              ].map((feature, index) => (
                <div key={index} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <span className="text-white text-xl">{feature.icon}</span>
                  </div>
                  <h4 className="font-semibold text-blue-900 mb-2">{feature.title}</h4>
                  <p className="text-sm text-blue-700 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Premium Action Footer */}
      <div className="flex justify-end">
        <Button
          onClick={onCancel}
          variant="secondary"
          className="bg-white/70 hover:bg-white text-gray-700 border-gray-200 shadow-lg backdrop-blur-sm"
        >
          <span className="flex items-center space-x-2">
            <span>←</span>
            <span>Back to Statements</span>
          </span>
        </Button>
      </div>

      {/* Password Protected PDF Dialog */}
      <PasswordProtectedPDFDialog
        isOpen={showPasswordProtectedDialog}
        onClose={() => {
          setShowPasswordProtectedDialog(false);
          setPasswordProtectedFileName('');
          setSelectedFile(null); // Reset selected file so user can try another
        }}
        onSubmit={handlePasswordSubmit}
        fileName={passwordProtectedFileName}
        isRetrying={enhancedProcessing}
      />
    </div>
  );
};
