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

        {/* Professional Statement Validation Results */}
        {validationResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-3xl blur-xl"></div>
            
            <div className={`relative bg-white rounded-3xl border border-gray-200/60 shadow-xl backdrop-blur-sm overflow-hidden ${
              !validationResult.isValid ? 'border-red-200/60' : ''
            }`}>
              {/* Modern Header Section */}
              <div className={`px-8 py-6 border-b border-gray-100 ${
                validationResult.isValid 
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50/30' 
                  : 'bg-gradient-to-r from-red-50 to-rose-50/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <motion.div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                        validationResult.isValid
                          ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                          : 'bg-gradient-to-br from-red-500 to-rose-600'
                      }`}
                      animate={{ 
                        scale: validationResult.isValid ? [1, 1.1, 1] : [1, 0.95, 1] 
                      }}
                      transition={{ duration: 0.8 }}
                    >
                      <span className="text-2xl text-white">
                        {validationResult.isValid ? '✅' : '❌'}
                      </span>
                    </motion.div>
                    
                    <div>
                      <h3 className={`text-2xl font-bold mb-1 ${
                        validationResult.isValid ? 'text-gray-900' : 'text-red-900'
                      }`}>
                        Statement Validation {validationResult.isValid ? 'Passed' : 'Failed'}
                      </h3>
                      <p className={`font-medium ${
                        validationResult.isValid ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {validationResult.isValid 
                          ? 'All validation checks completed successfully'
                          : 'Validation failed - please check the details below'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Confidence Badge */}
                  <motion.div 
                    className={`px-4 py-2 rounded-2xl shadow-md border ${
                      validationResult.isValid
                        ? 'bg-white border-emerald-200 text-emerald-700'
                        : 'bg-white border-red-200 text-red-700'
                    }`}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {validationResult.confidence}%
                      </div>
                      <div className="text-xs uppercase tracking-wider font-semibold">
                        Confidence
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="p-8">
                {validationResult.isValid ? (
                  <div className="space-y-6">
                    {/* Validation Checks Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { key: 'bankMatches', label: 'Bank Match', value: validationResult.bankMatches, icon: '🏦' },
                        { key: 'monthMatches', label: 'Month Match', value: validationResult.monthMatches, icon: '📅' },
                        { key: 'yearMatches', label: 'Year Match', value: validationResult.yearMatches, icon: '🗓️' }
                      ].map(({ key, label, value, icon }, index) => (
                        <motion.div 
                          key={key}
                          className={`relative bg-gradient-to-br rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all duration-300 ${
                            value 
                              ? 'from-emerald-50 to-green-100 border-emerald-200/50' 
                              : 'from-red-50 to-rose-100 border-red-200/50'
                          }`}
                          whileHover={{ scale: 1.02, y: -2 }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          {/* Background decoration */}
                          <div className="absolute top-0 right-0 w-16 h-16 opacity-5 overflow-hidden rounded-2xl">
                            <div className={`w-full h-full transform rotate-12 scale-150 ${
                              value ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
                            }`}></div>
                          </div>
                          
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                                value 
                                  ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                                  : 'bg-gradient-to-br from-red-500 to-rose-600'
                              }`}>
                                <span className="text-white text-lg">{icon}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">
                                  {label}
                                </div>
                                <div className={`text-xs mt-1 font-medium ${
                                  value ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                  {value ? 'Verified' : 'Failed'}
                                </div>
                              </div>
                            </div>
                            
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              value ? 'bg-emerald-100' : 'bg-red-100'
                            }`}>
                              <span className="text-lg">
                                {value ? '✅' : '❌'}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Detected Bank Information */}
                    {validationResult.detectedBank && (
                      <motion.div 
                        className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200/50"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                            <span className="text-white">🏦</span>
                          </div>
                          <div>
                            <div className="text-sm text-emerald-600 font-medium uppercase tracking-wider">
                              Detected Bank
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {validationResult.detectedBank}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Error Message */}
                    <motion.div 
                      className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-6 border border-red-200/50"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white">⚠️</span>
                        </div>
                        <div>
                          <div className="text-sm text-red-600 font-medium uppercase tracking-wider mb-1">
                            Validation Error
                          </div>
                          <div className="text-red-800 font-medium">
                            {validationResult.errorMessage}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                    
                    {/* Detected Information */}
                    {(validationResult.detectedBank || validationResult.detectedMonth || validationResult.detectedYear) && (
                      <motion.div 
                        className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="text-sm text-gray-600 font-medium uppercase tracking-wider mb-3">
                          Detected Information
                        </div>
                        <div className="space-y-2">
                          {validationResult.detectedBank && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500 font-medium">Bank:</span>
                              <span className="text-gray-900">{validationResult.detectedBank}</span>
                            </div>
                          )}
                          {validationResult.detectedMonth && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500 font-medium">Month:</span>
                              <span className="text-gray-900">{validationResult.detectedMonth}</span>
                            </div>
                          )}
                          {validationResult.detectedYear && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500 font-medium">Year:</span>
                              <span className="text-gray-900">{validationResult.detectedYear}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Professional Security Dashboard */}
        {securityBreakdown && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            {/* Subtle background glow for processing state */}
            {progress?.status === 'processing' && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
            )}
            
            <div className="relative bg-white rounded-3xl border border-gray-200/60 shadow-xl backdrop-blur-sm overflow-hidden">
              {/* Modern Header Section */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 px-8 py-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
                      animate={progress?.status === 'processing' ? { 
                        rotate: [0, 360],
                        scale: [1, 1.05, 1]
                      } : {}}
                      transition={{ 
                        repeat: progress?.status === 'processing' ? Infinity : 0,
                        duration: 3,
                        ease: "easeInOut"
                      }}
                    >
                      <span className="text-2xl text-white">🛡️</span>
                    </motion.div>
                    
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        Data Protection Active
                      </h3>
                      <div className="flex items-center space-x-3">
                        <p className="text-gray-600 font-medium">
                          {progress?.status === 'processing' 
                            ? 'Masking sensitive information in real-time...' 
                            : 'Sensitive data successfully protected'
                          }
                        </p>
                        {progress?.status === 'processing' && (
                          <motion.div 
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full border border-blue-200"
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          >
                            • LIVE
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Elegant counter card */}
                  <motion.div 
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 min-w-[140px]"
                    animate={progress?.status === 'processing' ? { 
                      scale: [1, 1.02, 1],
                      boxShadow: [
                        '0 10px 25px -3px rgba(0, 0, 0, 0.1)',
                        '0 15px 35px -3px rgba(59, 130, 246, 0.15)',
                        '0 10px 25px -3px rgba(0, 0, 0, 0.1)'
                      ]
                    } : {}}
                    transition={{ repeat: progress?.status === 'processing' ? Infinity : 0, duration: 2 }}
                  >
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-1">
                        {Object.values(securityBreakdown).reduce((sum, count) => sum + count, 0)}
                      </div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">
                        Items Protected
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Processing Status Bar */}
              {progress?.status === 'processing' && (
                <motion.div 
                  className="px-8 py-4 bg-gradient-to-r from-blue-50 to-purple-50/50 border-b border-gray-100"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <div className="flex items-center justify-center space-x-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
                    />
                    <span className="text-gray-700 font-medium">
                      Actively scanning and masking sensitive data across all pages...
                    </span>
                  </div>
                </motion.div>
              )}
            
              {/* Modern Security Breakdown Grid */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(securityBreakdown)
                    .filter(([_, count]) => count > 0)
                    .map(([key, count], index) => {
                      const securityItems: Record<string, { icon: string; label: string; gradient: string; iconBg: string }> = {
                        accountNumbers: { 
                          icon: '🏦', 
                          label: 'Account Numbers', 
                          gradient: 'from-blue-50 to-blue-100',
                          iconBg: 'from-blue-500 to-blue-600'
                        },
                        mobileNumbers: { 
                          icon: '📱', 
                          label: 'Mobile Numbers', 
                          gradient: 'from-purple-50 to-purple-100',
                          iconBg: 'from-purple-500 to-purple-600'
                        },
                        emails: { 
                          icon: '📧', 
                          label: 'Email Addresses', 
                          gradient: 'from-orange-50 to-orange-100',
                          iconBg: 'from-orange-500 to-orange-600'
                        },
                        panIds: { 
                          icon: '🆔', 
                          label: 'PAN IDs', 
                          gradient: 'from-red-50 to-red-100',
                          iconBg: 'from-red-500 to-red-600'
                        },
                        customerIds: { 
                          icon: '👤', 
                          label: 'Customer IDs', 
                          gradient: 'from-indigo-50 to-indigo-100',
                          iconBg: 'from-indigo-500 to-indigo-600'
                        },
                        ifscCodes: { 
                          icon: '🏛️', 
                          label: 'IFSC Codes', 
                          gradient: 'from-teal-50 to-teal-100',
                          iconBg: 'from-teal-500 to-teal-600'
                        },
                        cardNumbers: { 
                          icon: '💳', 
                          label: 'Card Numbers', 
                          gradient: 'from-pink-50 to-pink-100',
                          iconBg: 'from-pink-500 to-pink-600'
                        },
                        addresses: { 
                          icon: '🏠', 
                          label: 'Addresses', 
                          gradient: 'from-yellow-50 to-amber-100',
                          iconBg: 'from-yellow-500 to-amber-600'
                        },
                        names: { 
                          icon: '👥', 
                          label: 'Names', 
                          gradient: 'from-emerald-50 to-emerald-100',
                          iconBg: 'from-emerald-500 to-emerald-600'
                        }
                      };
                      
                      const item = securityItems[key] || { 
                        icon: '🔒', 
                        label: key, 
                        gradient: 'from-gray-50 to-gray-100',
                        iconBg: 'from-gray-500 to-gray-600'
                      };
                      
                      return (
                        <motion.div 
                          key={key}
                          className={`relative bg-gradient-to-br ${item.gradient} rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300 group`}
                          whileHover={{ scale: 1.02, y: -2 }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          {/* Background decoration */}
                          <div className="absolute top-0 right-0 w-20 h-20 opacity-5 overflow-hidden rounded-2xl">
                            <div className={`w-full h-full bg-gradient-to-br ${item.iconBg} transform rotate-12 scale-150`}></div>
                          </div>
                          
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 bg-gradient-to-br ${item.iconBg} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                                <span className="text-white text-lg">{item.icon}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">
                                  {item.label}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Protected items
                                </div>
                              </div>
                            </div>
                            
                            <motion.div 
                              className="text-center bg-white rounded-xl p-3 shadow-md border border-gray-100 min-w-[60px]"
                              animate={progress?.status === 'processing' && count > 0 ? { 
                                scale: [1, 1.05, 1]
                              } : {}}
                              transition={{ 
                                repeat: progress?.status === 'processing' ? Infinity : 0,
                                duration: 2,
                                delay: index * 0.2
                              }}
                            >
                              <div className="text-2xl font-bold text-gray-900">
                                {count}
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      );
                    })
                  }
                </div>
                
                {/* Professional Footer */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center space-x-3 text-gray-600">
                    <motion.div
                      className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center"
                      animate={progress?.status === 'processing' ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ repeat: progress?.status === 'processing' ? Infinity : 0, duration: 2 }}
                    >
                      <span className="text-white text-sm">🔐</span>
                    </motion.div>
                    <span className="font-medium">
                      All sensitive information is automatically masked before AI processing
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Professional Fallback Security Message */}
        {!securityBreakdown && progress?.status === 'processing' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
            
            <div className="relative bg-white rounded-3xl border border-gray-200/60 shadow-xl backdrop-blur-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 px-8 py-6">
                <div className="flex items-center justify-center space-x-4">
                  <motion.div
                    className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
                    animate={{ rotate: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  >
                    <span className="text-2xl text-white">�️</span>
                  </motion.div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Security Scanning Active
                    </h3>
                    <p className="text-gray-600 font-medium">
                      Analyzing pages for sensitive data protection...
                    </p>
                  </div>
                </div>
              </div>
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
