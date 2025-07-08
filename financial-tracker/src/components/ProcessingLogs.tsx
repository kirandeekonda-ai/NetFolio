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
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 border border-gray-200 rounded-lg bg-gray-50"
    >
      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
          <span className="mr-2">📋</span>
          Processing Logs
          {isProcessing && (
            <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          )}
        </h3>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
          disabled={isProcessing}
        >
          Clear
        </button>
      </div>
      
      <div className="p-3 max-h-64 overflow-y-auto">
        <div className="space-y-1 font-mono text-xs">
          <AnimatePresence initial={false}>
            {logs.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={`p-1 rounded ${getLogStyle(log)}`}
              >
                {log}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      {isProcessing && (
        <div className="p-2 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center text-xs text-blue-600">
            <div className="animate-spin mr-2 w-3 h-3 border border-blue-600 border-t-transparent rounded-full"></div>
            Processing...
          </div>
        </div>
      )}
    </motion.div>
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
