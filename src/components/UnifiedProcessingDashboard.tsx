/**
 * World-Class Unified Processing Dashboard
 * Premium banking-grade interface with comprehensive status tracking
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QueueProgress,
  StatementValidationResult,
  PageProcessingResult,
  SecurityBreakdown
} from '../hooks/useEnhancedAIProcessor';

interface UnifiedProcessingDashboardProps {
  isVisible: boolean;
  progress?: QueueProgress;
  validationResult?: StatementValidationResult;
  pageResults?: PageProcessingResult[];
  logs?: string[];
  securityBreakdown?: SecurityBreakdown;
  isProcessing: boolean;
  onClearLogs?: () => void;
  fileInfo?: {
    name: string;
    size: number;
  };
  onChangeFile?: () => void;
}

interface ProcessingStage {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
}

const PROCESSING_STAGES: ProcessingStage[] = [
  {
    id: 'validating',
    label: 'Document Validation',
    icon: '🔍',
    description: 'Verifying PDF format and bank statement authenticity',
    color: 'blue'
  },
  {
    id: 'processing',
    label: 'Data Extraction',
    icon: '⚙️',
    description: 'AI-powered transaction extraction from document pages',
    color: 'indigo'
  },
  {
    id: 'categorizing',
    label: 'Smart Categorization',
    icon: '🧠',
    description: 'Intelligent categorization using machine learning',
    color: 'purple'
  },
  {
    id: 'securing',
    label: 'Security Scan',
    icon: '🔒',
    description: 'Identifying and masking sensitive information',
    color: 'emerald'
  },
  {
    id: 'completed',
    label: 'Processing Complete',
    icon: '✅',
    description: 'All transactions processed successfully',
    color: 'green'
  },
  {
    id: 'failed',
    label: 'Processing Failed',
    icon: '❌',
    description: 'An error occurred during processing',
    color: 'red'
  }
];

const SECURITY_CATEGORIES = {
  accountNumbers: { icon: '🏦', label: 'Account Numbers', severity: 'high' },
  mobileNumbers: { icon: '📱', label: 'Mobile Numbers', severity: 'medium' },
  emails: { icon: '📧', label: 'Email Addresses', severity: 'medium' },
  panIds: { icon: '🆔', label: 'PAN IDs', severity: 'high' },
  customerIds: { icon: '👤', label: 'Customer IDs', severity: 'high' },
  ifscCodes: { icon: '🏛️', label: 'IFSC Codes', severity: 'low' },
  cardNumbers: { icon: '💳', label: 'Card Numbers', severity: 'high' },
  addresses: { icon: '🏠', label: 'Addresses', severity: 'medium' },
  names: { icon: '👥', label: 'Names', severity: 'medium' }
};

export const UnifiedProcessingDashboard: React.FC<UnifiedProcessingDashboardProps> = ({
  isVisible,
  progress,
  validationResult,
  pageResults = [],
  logs = [],
  securityBreakdown,
  isProcessing,
  onClearLogs,
  fileInfo,
  onChangeFile
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'pages' | 'logs'>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  if (!isVisible) return null;

  // Determine current stage
  const getCurrentStage = (): ProcessingStage => {
    if (validationResult && !validationResult.isValid) {
      return PROCESSING_STAGES.find(s => s.id === 'failed') || PROCESSING_STAGES[0];
    }

    if (progress?.status === 'completed') {
      return PROCESSING_STAGES.find(s => s.id === 'completed') || PROCESSING_STAGES[4];
    }

    if (progress?.status === 'failed') {
      return PROCESSING_STAGES.find(s => s.id === 'failed') || PROCESSING_STAGES[5];
    }

    if (securityBreakdown && Object.values(securityBreakdown).some(count => count > 0)) {
      return PROCESSING_STAGES.find(s => s.id === 'securing') || PROCESSING_STAGES[3];
    }

    if (pageResults.length > 0) {
      return PROCESSING_STAGES.find(s => s.id === 'categorizing') || PROCESSING_STAGES[2];
    }

    if (progress?.status === 'processing') {
      return PROCESSING_STAGES.find(s => s.id === 'processing') || PROCESSING_STAGES[1];
    }

    return PROCESSING_STAGES.find(s => s.id === 'validating') || PROCESSING_STAGES[0];
  };

  const currentStage = getCurrentStage();

  // Enhanced progress calculation
  const getOverallProgress = (): number => {
    if (currentStage.id === 'completed') return 100;
    if (currentStage.id === 'failed') return 0;

    if (progress?.percentComplete !== undefined) {
      return Math.min(progress.percentComplete, 95);
    }

    return 15; // Default progress
  };

  const overallProgress = getOverallProgress();

  // Get security insights
  const getSecurityInsights = () => {
    if (!securityBreakdown) return null;

    const insights = Object.entries(securityBreakdown)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type: type as keyof SecurityBreakdown,
        count,
        ...SECURITY_CATEGORIES[type as keyof SecurityBreakdown]
      }))
      .sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder];
      });

    const totalProtected = Object.values(securityBreakdown).reduce((sum, count) => sum + count, 0);
    const criticalItems = insights.filter(item => item.severity === 'high').reduce((sum, item) => sum + item.count, 0);

    return { insights, totalProtected, criticalItems };
  };

  const securityInsights = getSecurityInsights();

  // Enhanced log formatting
  const formatLog = (log: string): { message: string; type: 'info' | 'success' | 'warning' | 'error'; timestamp: string } => {
    const timestamp = new Date().toLocaleTimeString();

    if (log.includes('Successfully') || log.includes('✅') || log.includes('completed')) {
      return { message: log, type: 'success', timestamp };
    }
    if (log.includes('Error') || log.includes('Failed') || log.includes('❌')) {
      return { message: log, type: 'error', timestamp };
    }
    if (log.includes('Warning') || log.includes('⚠️')) {
      return { message: log, type: 'warning', timestamp };
    }

    return { message: log, type: 'info', timestamp };
  };

  const formattedLogs = logs.map(formatLog);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative"
    >
      {/* Premium Glass Card */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden">

        {/* Header with Live Status */}
        <div className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-8 py-6">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <motion.div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br ${currentStage.id === 'completed' ? 'from-green-500 to-emerald-600' :
                    currentStage.id === 'failed' ? 'from-red-500 to-rose-600' :
                      `from-${currentStage.color}-500 to-${currentStage.color}-600`
                  }`}
                animate={{
                  scale: isProcessing ? [1, 1.05, 1] : 1,
                  boxShadow: isProcessing ? [
                    "0 10px 25px rgba(59, 130, 246, 0.5)",
                    "0 15px 35px rgba(99, 102, 241, 0.6)",
                    "0 10px 25px rgba(59, 130, 246, 0.5)"
                  ] : "0 10px 25px rgba(0, 0, 0, 0.1)"
                }}
                transition={{
                  repeat: isProcessing ? Infinity : 0,
                  duration: 2.5,
                  ease: "easeInOut"
                }}
              >
                <span className="text-3xl text-white">{currentStage.icon}</span>
              </motion.div>

              <div className="text-white">
                <h2 className="text-3xl font-bold mb-2">{currentStage.label}</h2>
                <p className="text-blue-100 text-lg mb-3">{currentStage.description}</p>

                {/* File Information */}
                {fileInfo && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-3 border border-white/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg">📄</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{fileInfo.name}</p>
                          <p className="text-blue-200 text-sm">
                            {(fileInfo.size / 1024 / 1024).toFixed(2)} MB • Processing in progress
                          </p>
                        </div>
                      </div>
                      {onChangeFile && !isProcessing && (
                        <button
                          onClick={onChangeFile}
                          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg text-sm font-medium transition-all duration-200"
                        >
                          Change File
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Live Metrics */}
                <div className="flex items-center space-x-6 text-sm">`
                  {isProcessing && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-300 font-medium">LIVE</span>
                    </div>
                  )}
                  {progress && (
                    <span className="text-blue-200">
                      Page {progress.currentPage} of {progress.totalPages}
                    </span>
                  )}
                  {pageResults.length > 0 && (
                    <span className="text-blue-200">
                      {pageResults.reduce((sum, page) => sum + page.transactions.length, 0)} transactions
                    </span>
                  )}
                  {securityInsights && (
                    <span className="text-green-300">
                      {securityInsights.totalProtected} items secured
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Ring */}
            <div className="relative">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/20"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path
                  className="text-white"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  strokeLinecap="round"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  initial={{ strokeDasharray: "0 100" }}
                  animate={{ strokeDasharray: `${overallProgress} 100` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{Math.round(overallProgress)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 bg-gray-50/50">
          <div className="flex space-x-8 px-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'security', label: 'Security', icon: '🔒', badge: securityInsights?.totalProtected },
              { id: 'pages', label: 'Pages', icon: '📄', badge: pageResults.length },
              { id: 'logs', label: 'Logs', icon: '📋', badge: logs.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative py-4 px-2 text-sm font-medium transition-all duration-300 ${activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Stage Progress */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Processing Pipeline</h3>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                    {PROCESSING_STAGES.slice(0, -2).map((stage, index) => {
                      const isActive = stage.id === currentStage.id;
                      const isCompleted = PROCESSING_STAGES.findIndex(s => s.id === currentStage.id) > index;

                      return (
                        <div key={stage.id} className="flex flex-row md:flex-col items-center relative w-full md:w-auto">
                          {/* Desktop Connector (Horizontal) */}
                          {index < PROCESSING_STAGES.length - 3 && (
                            <div className={`hidden md:block absolute top-6 left-12 w-[calc(100%-3rem)] h-0.5 ${isCompleted ? 'bg-green-400' : 'bg-gray-300'
                              }`} />
                          )}

                          {/* Mobile Connector (Vertical) */}
                          {index < PROCESSING_STAGES.length - 3 && (
                            <div className={`md:hidden absolute left-6 top-12 h-6 w-0.5 ${isCompleted ? 'bg-green-400' : 'bg-gray-300'
                              }`} />
                          )}

                          <motion.div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shadow-lg flex-shrink-0 z-10 ${isActive ? `bg-gradient-to-br from-${stage.color}-500 to-${stage.color}-600 text-white` :
                                isCompleted ? 'bg-green-500 text-white' :
                                  'bg-gray-200 text-gray-400'
                              }`}
                            animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
                          >
                            {isCompleted && !isActive ? '✓' : stage.icon}
                          </motion.div>

                          <div className="ml-4 md:ml-0 md:mt-2 flex flex-col md:items-center">
                            <span className={`text-sm font-medium text-left md:text-center md:max-w-[5rem] ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                              }`}>
                              {stage.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📄</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pages Processed</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {progress?.completedPages || pageResults.length}
                          {progress?.totalPages && ` / ${progress.totalPages}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">💰</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Transactions</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {pageResults.reduce((sum, page) => sum + page.transactions.length, 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🔒</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Data Protected</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {securityInsights?.totalProtected || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                {validationResult && !validationResult.isValid && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xl">❌</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-red-900 mb-2">Validation Failed</h4>
                        <p className="text-red-700">{validationResult.errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStage.id === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xl">✅</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-green-900 mb-2">Processing Complete!</h4>
                        <p className="text-green-700">
                          Successfully processed {pageResults.reduce((sum, page) => sum + page.transactions.length, 0)} transactions
                          {securityInsights && ` and secured ${securityInsights.totalProtected} sensitive data points`}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {securityInsights ? (
                  <>
                    {/* Security Overview */}
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200/50">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center">
                          <span className="text-2xl text-white">🛡️</span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-emerald-900">Data Protection Active</h3>
                          <p className="text-emerald-700">
                            {securityInsights.totalProtected} sensitive items detected and secured
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/80 rounded-lg p-4">
                          <p className="text-sm text-emerald-600 font-medium">Total Protected</p>
                          <p className="text-3xl font-bold text-emerald-900">{securityInsights.totalProtected}</p>
                        </div>
                        <div className="bg-white/80 rounded-lg p-4">
                          <p className="text-sm text-red-600 font-medium">Critical Items</p>
                          <p className="text-3xl font-bold text-red-900">{securityInsights.criticalItems}</p>
                        </div>
                      </div>
                    </div>

                    {/* Security Details */}
                    <div className="space-y-4">
                      {securityInsights.insights.map((insight, index) => (
                        <motion.div
                          key={insight.type}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`bg-white rounded-xl p-6 border-l-4 shadow-sm ${insight.severity === 'high' ? 'border-red-500' :
                              insight.severity === 'medium' ? 'border-yellow-500' :
                                'border-green-500'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${insight.severity === 'high' ? 'bg-red-100' :
                                  insight.severity === 'medium' ? 'bg-yellow-100' :
                                    'bg-green-100'
                                }`}>
                                <span className="text-xl">{insight.icon}</span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{insight.label}</h4>
                                <p className="text-sm text-gray-600">
                                  {insight.count} {insight.count === 1 ? 'item' : 'items'} protected
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${insight.severity === 'high' ? 'bg-red-100 text-red-800' :
                                  insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                {insight.severity.toUpperCase()} RISK
                              </span>
                              <span className="text-2xl font-bold text-gray-900">{insight.count}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">🔒</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Security Scan Pending</h3>
                    <p className="text-gray-600">Security analysis will begin after data extraction</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Pages Tab */}
            {activeTab === 'pages' && (
              <motion.div
                key="pages"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {pageResults.length > 0 ? (
                  pageResults.map((page, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${page.success ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                            <span className="text-xl">
                              {page.success ? '✅' : '❌'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Page {page.pageNumber}</h4>
                            <p className="text-sm text-gray-600">
                              {page.transactions.length} transactions extracted
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleSection(`page-${index}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {expandedSections.has(`page-${index}`) ? 'Hide Details' : 'Show Details'}
                        </button>
                      </div>

                      <AnimatePresence>
                        {expandedSections.has(`page-${index}`) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-gray-200 pt-4 mt-4"
                          >
                            {page.processingNotes && (
                              <p className="text-sm text-gray-600 mb-3">{page.processingNotes}</p>
                            )}
                            {page.balance_data && (
                              <div className="bg-blue-50 rounded-lg p-4">
                                <h5 className="font-medium text-blue-900 mb-2">Balance Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  {page.balance_data.opening_balance && (
                                    <div>
                                      <span className="text-blue-700">Opening:</span>
                                      <span className="ml-2 font-medium">₹{page.balance_data.opening_balance.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {page.balance_data.closing_balance && (
                                    <div>
                                      <span className="text-blue-700">Closing:</span>
                                      <span className="ml-2 font-medium">₹{page.balance_data.closing_balance.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">📄</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pages Processed Yet</h3>
                    <p className="text-gray-600">Page processing will appear here as it progresses</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900">Processing Logs</h3>
                  {onClearLogs && logs.length > 0 && (
                    <button
                      onClick={onClearLogs}
                      disabled={isProcessing}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${isProcessing
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm'
                        }`}
                    >
                      Clear All Logs
                    </button>
                  )}
                </div>

                {formattedLogs.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {formattedLogs.map((log, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`rounded-lg p-4 border-l-4 ${log.type === 'success' ? 'bg-green-50 border-green-500' :
                            log.type === 'error' ? 'bg-red-50 border-red-500' :
                              log.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                                'bg-blue-50 border-blue-500'
                          }`}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">
                            {log.type === 'success' ? '✅' :
                              log.type === 'error' ? '❌' :
                                log.type === 'warning' ? '⚠️' : 'ℹ️'}
                          </span>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${log.type === 'success' ? 'text-green-900' :
                                log.type === 'error' ? 'text-red-900' :
                                  log.type === 'warning' ? 'text-yellow-900' :
                                    'text-blue-900'
                              }`}>
                              {log.message}
                            </p>
                            <p className={`text-xs mt-1 ${log.type === 'success' ? 'text-green-600' :
                                log.type === 'error' ? 'text-red-600' :
                                  log.type === 'warning' ? 'text-yellow-600' :
                                    'text-blue-600'
                              }`}>
                              {log.timestamp}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">📋</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Logs Yet</h3>
                    <p className="text-gray-600">Processing logs will appear here in real-time</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
