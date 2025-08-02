/**
 * Enhanced Processing Status Component
 * Shows detailed progress for multi-page statement processing with validation
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QueueProgress, 
  StatementValidationResult, 
  PageProcessingResult, 
  SecurityBreakdown 
} from '../hooks/useEnhancedAIProcessor';

interface EnhancedProcessingStatusProps {
  isVisible: boolean;
  progress?: QueueProgress;
  validationResult?: StatementValidationResult;
  pageResults?: PageProcessingResult[];
  logs?: string[];
  securityBreakdown?: SecurityBreakdown;
}

export const EnhancedProcessingStatus: React.FC<EnhancedProcessingStatusProps> = ({
  isVisible,
  progress,
  validationResult,
  pageResults = [],
  logs = [],
  securityBreakdown
}) => {
  if (!isVisible) return null;

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'validating': return '🔍';
      case 'processing': return '⚙️';
      case 'categorizing': return '📊';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'validating': return 'border-blue-300 bg-blue-50 text-blue-800';
      case 'processing': return 'border-yellow-300 bg-yellow-50 text-yellow-800';
      case 'categorizing': return 'border-purple-300 bg-purple-50 text-purple-800';
      case 'completed': return 'border-green-300 bg-green-50 text-green-800';
      case 'failed': return 'border-red-300 bg-red-50 text-red-800';
      default: return 'border-gray-300 bg-gray-50 text-gray-800';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return '<1s';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="space-y-6"
      >
        {/* Modern Main Progress Header */}
        {progress && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-3xl blur-xl"></div>
            <motion.div 
              layout
              className="relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl"
            >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl"
                  animate={{ 
                    scale: progress.status === 'processing' ? [1, 1.05, 1] : 1,
                    rotate: progress.status === 'processing' ? [0, 2, -2, 0] : 0 
                  }}
                  transition={{ 
                    repeat: progress.status === 'processing' ? Infinity : 0,
                    duration: 3,
                    ease: "easeInOut"
                  }}
                >
                  <span className="text-2xl text-white">
                    {getStatusIcon(progress.status)}
                  </span>
                </motion.div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1 capitalize">
                    {progress.status.replace('_', ' ')} Statement
                  </h3>
                  <p className="text-lg text-gray-600 font-medium">
                    {progress.currentOperation}
                    {/* Real-time Security Counter in Header */}
                    {securityBreakdown && Object.values(securityBreakdown).reduce((sum, count) => sum + count, 0) > 0 && (
                      <motion.span 
                        className="ml-3 px-3 py-1 bg-emerald-500 text-white text-sm font-bold rounded-full"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        🔐 {Object.values(securityBreakdown).reduce((sum, count) => sum + count, 0)} protected
                      </motion.span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <motion.div 
                  className="text-4xl font-light text-gray-800 mb-1"
                  animate={{ 
                    scale: progress.status === 'completed' ? [1, 1.1, 1] : 1 
                  }}
                  transition={{ duration: 0.8 }}
                >
                  {Math.round(progress.percentComplete)}%
                </motion.div>
                <div className="text-sm text-gray-500 font-medium">
                  Page {progress.currentPage} of {progress.totalPages}
                </div>
              </div>
            </div>

            {/* Modern Animated Progress Bar */}
            <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-4 mb-6 overflow-hidden shadow-inner">
              <motion.div 
                className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg relative overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentComplete}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              </motion.div>
            </div>

            {/* Progress Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center p-2 bg-white bg-opacity-20 rounded-lg">
                <div className="text-xl font-bold">{progress.completedPages}</div>
                <div className="text-xs opacity-80">Completed</div>
              </div>
              <div className="text-center p-2 bg-white bg-opacity-20 rounded-lg">
                <div className="text-xl font-bold text-green-600">{progress.successfulPages}</div>
                <div className="text-xs opacity-80">Successful</div>
              </div>
              <div className="text-center p-2 bg-white bg-opacity-20 rounded-lg">
                <div className="text-xl font-bold text-red-600">{progress.failedPages}</div>
                <div className="text-xs opacity-80">Failed</div>
              </div>
              <div className="text-center p-2 bg-white bg-opacity-20 rounded-lg">
                <div className="text-xl font-bold">
                  {formatTime(progress.estimatedTimeRemaining)}
                </div>
                <div className="text-xs opacity-80">Remaining</div>
              </div>
              <div className="text-center p-2 bg-white bg-opacity-20 rounded-lg">
                <div className="text-xl font-bold">{progress.totalPages}</div>
                <div className="text-xs opacity-80">Total Pages</div>
              </div>
            </div>
            </motion.div>
          </div>
        )}

        {/* Statement Validation Results */}
        {validationResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-5 rounded-xl border-2 shadow-md ${
              validationResult.isValid 
                ? 'border-green-300 bg-green-50' 
                : 'border-red-300 bg-red-50'
            }`}
          >
            <div className="flex items-center space-x-3 mb-4">
              <motion.span 
                className="text-2xl"
                animate={{ 
                  scale: validationResult.isValid ? [1, 1.2, 1] : [1, 0.8, 1] 
                }}
                transition={{ duration: 0.5 }}
              >
                {validationResult.isValid ? '✅' : '❌'}
              </motion.span>
              <h4 className="font-bold text-lg">
                Statement Validation {validationResult.isValid ? 'Passed' : 'Failed'}
              </h4>
              <div className="ml-auto">
                <span className="px-3 py-1 bg-white bg-opacity-50 rounded-full text-sm font-medium">
                  {validationResult.confidence}% confidence
                </span>
              </div>
            </div>

            {validationResult.isValid ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'bankMatches', label: 'Bank Match', value: validationResult.bankMatches },
                    { key: 'monthMatches', label: 'Month Match', value: validationResult.monthMatches },
                    { key: 'yearMatches', label: 'Year Match', value: validationResult.yearMatches }
                  ].map(({ key, label, value }) => (
                    <motion.div 
                      key={key}
                      className="flex items-center justify-center space-x-2 p-2 bg-white bg-opacity-30 rounded-lg"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="text-lg">{value ? '✅' : '❌'}</span>
                      <span className="text-sm font-medium">{label}</span>
                    </motion.div>
                  ))}
                </div>
                
                {validationResult.detectedBank && (
                  <div className="text-sm text-green-700 bg-green-100 p-2 rounded">
                    🏦 Detected Bank: <strong>{validationResult.detectedBank}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-red-700 font-medium bg-red-100 p-3 rounded-lg">
                  {validationResult.errorMessage}
                </div>
                
                {(validationResult.detectedBank || validationResult.detectedMonth || validationResult.detectedYear) && (
                  <div className="bg-red-50 p-3 rounded-lg space-y-1 text-sm">
                    {validationResult.detectedBank && (
                      <p><strong>Detected Bank:</strong> {validationResult.detectedBank}</p>
                    )}
                    {validationResult.detectedMonth && (
                      <p><strong>Detected Month:</strong> {validationResult.detectedMonth}</p>
                    )}
                    {validationResult.detectedYear && (
                      <p><strong>Detected Year:</strong> {validationResult.detectedYear}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Enhanced Security Breakdown - More Prominent */}
        {securityBreakdown && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden"
          >
            {/* Glowing background effect during processing */}
            {progress?.status === 'processing' && (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/30 to-green-500/30 rounded-2xl blur-xl animate-pulse"></div>
            )}
            
            <motion.div 
              className="relative p-6 rounded-2xl border-2 border-emerald-300 bg-emerald-50/95 backdrop-blur-sm shadow-xl"
              animate={progress?.status === 'processing' ? {
                borderColor: ['#10b981', '#059669', '#10b981'],
                boxShadow: [
                  '0 10px 25px -3px rgba(16, 185, 129, 0.2)',
                  '0 15px 35px -3px rgba(16, 185, 129, 0.4)',
                  '0 10px 25px -3px rgba(16, 185, 129, 0.2)'
                ]
              } : {}}
              transition={{ duration: 2, repeat: progress?.status === 'processing' ? Infinity : 0 }}
            >
              {/* Header with prominent total counter */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <motion.div
                    className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg"
                    animate={progress?.status === 'processing' ? { 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0] 
                    } : {}}
                    transition={{ 
                      repeat: progress?.status === 'processing' ? Infinity : 0,
                      duration: 2,
                      ease: "easeInOut"
                    }}
                  >
                    <span className="text-2xl text-white">🛡️</span>
                  </motion.div>
                  
                  <div>
                    <h4 className="font-bold text-2xl text-emerald-800 mb-1">
                      Data Protection Active
                    </h4>
                    <p className="text-emerald-600">
                      {progress?.status === 'processing' 
                        ? '🔄 Masking sensitive information in real-time...' 
                        : '✅ Sensitive data successfully protected'
                      }
                    </p>
                  </div>
                </div>
                
                {/* Large prominent counter */}
                <motion.div 
                  className="text-center bg-white rounded-2xl p-6 shadow-lg border-2 border-emerald-200 min-w-[120px]"
                  animate={progress?.status === 'processing' ? { 
                    scale: [1, 1.05, 1],
                    borderColor: ['#10b981', '#059669', '#10b981']
                  } : {}}
                  transition={{ repeat: progress?.status === 'processing' ? Infinity : 0, duration: 1.5 }}
                >
                  <div className="text-4xl font-bold text-emerald-800 mb-1">
                    {Object.values(securityBreakdown).reduce((sum, count) => sum + count, 0)}
                  </div>
                  <div className="text-sm text-emerald-600 uppercase tracking-wider font-semibold">
                    Items Protected
                  </div>
                </motion.div>
              </div>

              {/* Real-time status banner during processing */}
              {progress?.status === 'processing' && (
                <motion.div 
                  className="mb-6 p-4 bg-gradient-to-r from-emerald-100 to-green-100 rounded-xl border-2 border-emerald-200"
                  animate={{ 
                    opacity: [0.8, 1, 0.8],
                    borderColor: ['#10b981', '#059669', '#10b981']
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <div className="flex items-center justify-center space-x-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full"
                    />
                    <span className="text-emerald-700 font-semibold text-lg">
                      🔍 Actively scanning and masking sensitive data across all pages...
                    </span>
                  </div>
                </motion.div>
              )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(securityBreakdown)
                .filter(([_, count]) => count > 0)
                .map(([key, count], index) => {
                  const labels: Record<string, { icon: string; label: string; color: string }> = {
                    accountNumbers: { icon: '🏦', label: 'Account Numbers', color: 'bg-blue-100 text-blue-800 border-blue-300' },
                    mobileNumbers: { icon: '📱', label: 'Mobile Numbers', color: 'bg-purple-100 text-purple-800 border-purple-300' },
                    emails: { icon: '📧', label: 'Email Addresses', color: 'bg-orange-100 text-orange-800 border-orange-300' },
                    panIds: { icon: '🆔', label: 'PAN IDs', color: 'bg-red-100 text-red-800 border-red-300' },
                    customerIds: { icon: '👤', label: 'Customer IDs', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
                    ifscCodes: { icon: '🏛️', label: 'IFSC Codes', color: 'bg-teal-100 text-teal-800 border-teal-300' },
                    cardNumbers: { icon: '💳', label: 'Card Numbers', color: 'bg-pink-100 text-pink-800 border-pink-300' },
                    addresses: { icon: '🏠', label: 'Addresses', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                    names: { icon: '👥', label: 'Names', color: 'bg-green-100 text-green-800 border-green-300' }
                  };
                  
                  const item = labels[key] || { icon: '🔒', label: key, color: 'bg-gray-100 text-gray-800 border-gray-300' };
                  
                  return (
                    <motion.div 
                      key={key}
                      className={`flex items-center justify-between rounded-xl px-4 py-4 border-2 ${item.color} shadow-md hover:shadow-lg transition-shadow`}
                      whileHover={{ scale: 1.02, y: -2 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="font-semibold text-sm">
                          {item.label}
                        </span>
                      </div>
                      <motion.div 
                        className="font-bold text-2xl px-4 py-2 bg-white rounded-full shadow-md border-2 border-white"
                        animate={progress?.status === 'processing' && count > 0 ? { 
                          scale: [1, 1.1, 1],
                          rotate: [0, 2, -2, 0]
                        } : {}}
                        transition={{ 
                          repeat: progress?.status === 'processing' ? Infinity : 0,
                          duration: 2,
                          delay: index * 0.2
                        }}
                      >
                        {count}
                      </motion.div>
                    </motion.div>
                  );
                })
              }
            </div>
            
            {/* Footer message */}
            <div className="mt-6 pt-4 border-t-2 border-emerald-200 text-center">
              <div className="flex items-center justify-center space-x-3 text-emerald-700">
                <motion.span
                  animate={progress?.status === 'processing' ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: progress?.status === 'processing' ? Infinity : 0, duration: 1.5 }}
                  className="text-2xl"
                >
                  🔐
                </motion.span>
                <span className="text-lg font-semibold">
                  All sensitive information is automatically masked before AI processing
                </span>
              </div>
            </div>
            
            </motion.div>
          </motion.div>
        )}

        {/* Fallback Security Message When No Data Detected Yet */}
        {!securityBreakdown && progress?.status === 'processing' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl border-2 border-emerald-300 bg-emerald-50"
          >
            <div className="flex items-center justify-center space-x-4 text-emerald-700">
              <motion.span 
                className="text-3xl"
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              >
                🔐
              </motion.span>
              <span className="font-semibold text-lg">
                🔍 Security scanning active - Analyzing pages for sensitive data...
              </span>
            </div>
          </motion.div>
        )}

        {/* Page-by-Page Results */}
        {pageResults.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-xl border-2 border-gray-200 bg-gray-50 shadow-md"
          >
            <h4 className="font-bold text-lg mb-4 flex items-center space-x-2">
              <span>📄</span>
              <span>Page Processing Results</span>
            </h4>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <AnimatePresence>
                {pageResults.map((result, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border text-sm ${
                      result.success 
                        ? 'bg-green-100 border-green-200' 
                        : 'bg-red-100 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium flex items-center space-x-2">
                        <span>Page {result.pageNumber}:</span>
                        <span>{result.success ? '✅' : '❌'}</span>
                        <span className="text-xs opacity-75">
                          ({result.transactions?.length || 0} transactions)
                        </span>
                      </span>
                      {result.pageEndingBalance !== undefined && (
                        <span className="text-xs font-mono bg-white px-2 py-1 rounded">
                          Balance: {result.pageEndingBalance.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {result.processingNotes && (
                      <p className="text-xs text-gray-600 mb-1">
                        📝 {result.processingNotes}
                      </p>
                    )}
                    
                    {result.error && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        ❌ {result.error}
                      </p>
                    )}
                    
                    {result.hasIncompleteTransactions && (
                      <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                        ⚠️ Contains incomplete transactions
                      </p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedProcessingStatus;
