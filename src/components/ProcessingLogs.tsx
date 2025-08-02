import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProcessingLogsProps {
  logs: string[];
  isVisible: boolean;
  isProcessing: boolean;
  onClear: () => void;
}

export const ProcessingLogs: React.FC<ProcessingLogsProps> = ({
  logs,
  isVisible,
  isProcessing,
  onClear
}) => {
  if (!isVisible || logs.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-400/10 to-slate-500/10 rounded-3xl blur-xl"></div>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative bg-white/90 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden"
      >
        {/* Premium Header */}
        <div className="relative bg-gradient-to-r from-slate-50 to-gray-100 px-8 py-6 border-b border-gray-200/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-indigo-600/5 rounded-full -mr-16 -mt-16"></div>
          <div className="relative flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">📋</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  Processing Logs
                  {isProcessing && (
                    <div className="ml-3 flex items-center space-x-2">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg"></div>
                      <span className="text-sm font-medium text-emerald-600">Live</span>
                    </div>
                  )}
                </h3>
                <p className="text-gray-600 text-sm">Real-time processing updates and system messages</p>
              </div>
            </div>
            <motion.button
              onClick={onClear}
              disabled={isProcessing}
              whileHover={!isProcessing ? { scale: 1.05 } : {}}
              whileTap={!isProcessing ? { scale: 0.95 } : {}}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 ${
                isProcessing 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-white/70 hover:bg-white text-gray-700 border border-gray-200 shadow-lg hover:shadow-xl'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>🗑️</span>
                <span>Clear</span>
              </span>
            </motion.button>
          </div>
        </div>
        
        {/* Premium Logs Container */}
        <div className="p-6">
          <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {logs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className={`relative overflow-hidden rounded-2xl ${getLogCardStyle(log)}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
                    <div className="relative p-4 font-mono text-sm leading-relaxed">
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg ${getLogIconStyle(log)}`}>
                          <span className="text-sm">{getLogIcon(log)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`${getLogTextStyle(log)}`}>
                            {log}
                          </div>
                          <div className="text-xs opacity-60 mt-1">
                            {new Date().toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
        
        {/* Premium Processing Footer */}
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-t border-blue-200/50"
          >
            <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-indigo-600/5 rounded-full -ml-12 -mt-12"></div>
            <div className="relative flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              </div>
              <div>
                <p className="font-semibold text-blue-900">Processing Active</p>
                <p className="text-sm text-blue-700">System is actively processing your statement...</p>
              </div>
              <div className="ml-auto">
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-blue-500 rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

const getLogStyle = (log: string): string => {
  if (log.includes('❌') || log.includes('Error')) {
    return 'bg-red-100 text-red-800 border-l-2 border-red-500';
  }
  if (log.includes('🎉') || log.includes('✅') || log.includes('✨')) {
    return 'bg-green-100 text-green-800 border-l-2 border-green-500';
  }
  if (log.includes('🚀') || log.includes('🔄')) {
    return 'bg-blue-100 text-blue-800 border-l-2 border-blue-500';
  }
  if (log.includes('📊') || log.includes('💰') || log.includes('📄')) {
    return 'bg-purple-100 text-purple-800 border-l-2 border-purple-500';
  }
  if (log.includes('⚠️') || log.includes('Warning')) {
    return 'bg-yellow-100 text-yellow-800 border-l-2 border-yellow-500';
  }
  return 'bg-gray-100 text-gray-700 border-l-2 border-gray-300';
};

const getLogCardStyle = (log: string): string => {
  if (log.includes('❌') || log.includes('Error')) {
    return 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200/50 shadow-red-100/50';
  }
  if (log.includes('🎉') || log.includes('✅') || log.includes('✨')) {
    return 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 shadow-emerald-100/50';
  }
  if (log.includes('🚀') || log.includes('🔄')) {
    return 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 shadow-blue-100/50';
  }
  if (log.includes('📊') || log.includes('💰') || log.includes('📄')) {
    return 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/50 shadow-purple-100/50';
  }
  if (log.includes('⚠️') || log.includes('Warning')) {
    return 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200/50 shadow-yellow-100/50';
  }
  return 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200/50 shadow-gray-100/50';
};

const getLogIconStyle = (log: string): string => {
  if (log.includes('❌') || log.includes('Error')) {
    return 'bg-gradient-to-br from-red-500 to-pink-600 text-white';
  }
  if (log.includes('🎉') || log.includes('✅') || log.includes('✨')) {
    return 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white';
  }
  if (log.includes('🚀') || log.includes('🔄')) {
    return 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white';
  }
  if (log.includes('📊') || log.includes('💰') || log.includes('📄')) {
    return 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white';
  }
  if (log.includes('⚠️') || log.includes('Warning')) {
    return 'bg-gradient-to-br from-yellow-500 to-orange-600 text-white';
  }
  return 'bg-gradient-to-br from-gray-500 to-slate-600 text-white';
};

const getLogIcon = (log: string): string => {
  if (log.includes('❌') || log.includes('Error')) return '❌';
  if (log.includes('🎉') || log.includes('✅') || log.includes('✨')) return '✅';
  if (log.includes('🚀') || log.includes('🔄')) return '🚀';
  if (log.includes('📊') || log.includes('💰') || log.includes('📄')) return '📊';
  if (log.includes('⚠️') || log.includes('Warning')) return '⚠️';
  return 'ℹ️';
};

const getLogTextStyle = (log: string): string => {
  if (log.includes('❌') || log.includes('Error')) {
    return 'text-red-800 font-medium';
  }
  if (log.includes('🎉') || log.includes('✅') || log.includes('✨')) {
    return 'text-emerald-800 font-medium';
  }
  if (log.includes('🚀') || log.includes('🔄')) {
    return 'text-blue-800 font-medium';
  }
  if (log.includes('📊') || log.includes('💰') || log.includes('📄')) {
    return 'text-purple-800 font-medium';
  }
  if (log.includes('⚠️') || log.includes('Warning')) {
    return 'text-yellow-800 font-medium';
  }
  return 'text-gray-700 font-normal';
};
