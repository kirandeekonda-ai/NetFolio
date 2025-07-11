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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mt-6 space-y-4"
      >
        {/* Main Progress Header */}
        {progress && (
          <motion.div 
            layout
            className={`p-6 rounded-xl border-2 ${getStatusColor(progress.status)} shadow-lg`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <motion.span 
                  className="text-3xl"
                  animate={{ 
                    scale: progress.status === 'processing' ? [1, 1.1, 1] : 1,
                    rotate: progress.status === 'processing' ? [0, 5, -5, 0] : 0 
                  }}
                  transition={{ 
                    repeat: progress.status === 'processing' ? Infinity : 0,
                    duration: 2 
                  }}
                >
                  {getStatusIcon(progress.status)}
                </motion.span>
                <div>
                  <h3 className="font-bold text-xl capitalize">
                    {progress.status.replace('_', ' ')} Statement
                  </h3>
                  <p className="text-sm opacity-80 font-medium">
                    {progress.currentOperation}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <motion.div 
                  className="text-3xl font-bold"
                  animate={{ 
                    scale: progress.status === 'completed' ? [1, 1.2, 1] : 1 
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {Math.round(progress.percentComplete)}%
                </motion.div>
                <div className="text-sm opacity-80">
                  Page {progress.currentPage} of {progress.totalPages}
                </div>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full bg-white bg-opacity-40 rounded-full h-4 mb-4 overflow-hidden">
              <motion.div 
                className="h-4 rounded-full bg-current shadow-sm"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentComplete}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
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

        {/* Security Breakdown */}
        {securityBreakdown && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-5 rounded-xl border-2 border-emerald-300 bg-emerald-50 shadow-md"
          >
            <div className="flex items-center space-x-3 mb-4">
              <motion.span 
                className="text-2xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                🛡️
              </motion.span>
              <h4 className="font-bold text-lg text-emerald-800">Security Protection Active</h4>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(securityBreakdown)
                .filter(([_, count]) => count > 0)
                .map(([key, count]) => {
                  const labels: Record<string, { icon: string; label: string }> = {
                    accountNumbers: { icon: '🏦', label: 'Account Numbers' },
                    mobileNumbers: { icon: '📱', label: 'Mobile Numbers' },
                    emails: { icon: '📧', label: 'Email Addresses' },
                    panIds: { icon: '🆔', label: 'PAN IDs' },
                    customerIds: { icon: '👤', label: 'Customer IDs' },
                    ifscCodes: { icon: '🏛️', label: 'IFSC Codes' },
                    cardNumbers: { icon: '💳', label: 'Card Numbers' },
                    addresses: { icon: '🏠', label: 'Addresses' },
                    names: { icon: '👥', label: 'Names' }
                  };
                  
                  const item = labels[key] || { icon: '🔒', label: key };
                  
                  return (
                    <motion.div 
                      key={key}
                      className="flex items-center justify-between bg-emerald-100 rounded-lg px-3 py-2"
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <span className="text-emerald-700 text-sm">
                        {item.icon} {item.label}
                      </span>
                      <motion.span 
                        className="font-bold text-emerald-800 bg-emerald-200 px-2 py-1 rounded-full text-xs"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5 }}
                      >
                        {count}
                      </motion.span>
                    </motion.div>
                  );
                })
              }
            </div>
            
            <p className="text-xs text-emerald-600 mt-3 p-2 bg-emerald-100 rounded-lg">
              🔐 Your sensitive information is being protected during AI processing
            </p>
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

        {/* Processing Logs */}
        {logs.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-5 rounded-xl border-2 border-gray-200 bg-gray-50 shadow-md"
          >
            <h4 className="font-bold text-lg mb-4 flex items-center space-x-2">
              <span>📋</span>
              <span>Processing Logs</span>
            </h4>
            
            <div className="bg-white rounded-lg border p-3 font-mono text-sm max-h-48 overflow-y-auto space-y-1">
              <AnimatePresence>
                {logs.slice(-50).map((log, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-gray-700 border-b border-gray-100 pb-1"
                  >
                    {log}
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
