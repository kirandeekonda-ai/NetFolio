import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/Button';
import { Transaction, Category } from '@/types';
import { getCategoryColorStyle } from '@/utils/categoryColors';
import { Portal } from '../Portal';

interface BulkOperationsProps {
  selectedTransactions: Set<string>;
  allTransactions: Transaction[];
  categories: Category[];
  onBulkCategorize: (transactionIds: string[], category: Category) => Promise<void>;
  onBulkDelete: (transactionIds: string[]) => Promise<void>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExportSelected: (transactions: Transaction[]) => void;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedTransactions,
  allTransactions,
  categories,
  onBulkCategorize,
  onBulkDelete,
  onSelectAll,
  onDeselectAll,
  onExportSelected
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedCount = selectedTransactions.size;
  const selectedTxns = allTransactions.filter(t => selectedTransactions.has(t.id));

  useEffect(() => {
    const calculatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    if (showCategoryDropdown) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
    }

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [showCategoryDropdown]);

  const handleBulkCategorize = async (category: Category) => {
    setIsProcessing(true);
    try {
      await onBulkCategorize(Array.from(selectedTransactions), category);
      setShowCategoryDropdown(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedCount} transactions? This action cannot be undone.`)) {
      setIsProcessing(true);
      try {
        await onBulkDelete(Array.from(selectedTransactions));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const calculateSelectedStats = () => {
    const totalAmount = selectedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const categorizedCount = selectedTxns.filter(t => t.category_name && t.category_name !== 'Uncategorized').length;
    const uncategorizedCount = selectedCount - categorizedCount;
    
    return { totalAmount, categorizedCount, uncategorizedCount };
  };

  const stats = calculateSelectedStats();

  if (selectedCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="sticky bottom-0 z-40 mt-6 px-4"
    >
      <div className="backdrop-blur-2xl bg-white/95 rounded-3xl shadow-2xl border border-white/50 w-full max-w-full">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-blue-500/10 to-indigo-600/10 p-4 border-b border-gray-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">{selectedCount}</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {selectedCount} transaction{selectedCount > 1 ? 's' : ''} selected
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    {stats.categorizedCount} categorized
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                    {stats.uncategorizedCount} pending
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/50 rounded-xl transition-all duration-200 group"
            >
              <motion.span
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="inline-block text-gray-500 group-hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.span>
            </button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="p-3 bg-gray-50/50">
          <div className="flex items-center justify-between">
            {/* Selection Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onSelectAll}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
              >
                Select All
              </button>
              <button
                onClick={onDeselectAll}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Clear Selection
              </button>
            </div>
            
            {/* Primary Actions */}
            <div className="flex items-center space-x-3">
              {/* Category Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  ref={buttonRef}
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 
                           text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:from-blue-600 
                           hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 
                           disabled:cursor-not-allowed group"
                >
                  <span>{isProcessing ? 'Processing...' : 'Categorize'}</span>
                  <motion.svg
                    animate={{ rotate: showCategoryDropdown ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </button>
                
                <AnimatePresence>
                  {showCategoryDropdown && (
                    <Portal>
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed z-[100] min-w-72 bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden"
                        style={{
                          left: dropdownPosition.left,
                          width: Math.max(dropdownPosition.width, 288), // Ensure minimum 288px (18rem)
                          bottom: `calc(100vh - ${dropdownPosition.top}px)`,
                          marginBottom: '12px',
                        }}
                      >
                        <div className="p-2 bg-gray-50/50 border-b border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-700 px-3 py-2">
                            Choose Category ({selectedCount} selected)
                          </h4>
                        </div>
                        <div className="py-1 max-h-72 overflow-y-auto">
                          {categories.map((category, index) => {
                            const categoryStyle = getCategoryColorStyle(category.name, categories);
                            return (
                              <motion.button
                                key={category.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => handleBulkCategorize(category)}
                                title={category.name}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-all duration-150 
                                         group flex items-center justify-between hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-25"
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div 
                                    className="w-4 h-4 rounded-full flex-shrink-0 border border-white/40 shadow-sm ring-1 ring-black/5"
                                    style={{ backgroundColor: categoryStyle.style?.backgroundColor || '#6B7280' }}
                                  />
                                  <span className="text-sm font-medium text-gray-800 truncate group-hover:text-gray-900">
                                    {category.name}
                                  </span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </Portal>
                  )}
                </AnimatePresence>
              </div>

              {/* Secondary Actions */}
              <button
                onClick={() => onExportSelected(selectedTxns)}
                className="p-3 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
                title="Export Selected"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-blue-600">{selectedCount}</div>
                    <div className="text-xs text-blue-700 font-medium">Selected</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-green-600">{stats.categorizedCount}</div>
                    <div className="text-xs text-green-700 font-medium">Categorized</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-orange-600">{stats.uncategorizedCount}</div>
                    <div className="text-xs text-orange-700 font-medium">Uncategorized</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-purple-600">
                      {Math.round((stats.categorizedCount / selectedCount) * 100) || 0}%
                    </div>
                    <div className="text-xs text-purple-700 font-medium">Complete</div>
                  </div>
                </div>

                {/* Advanced Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => onExportSelected(selectedTxns)}
                    className="flex items-center justify-center space-x-3 p-3 bg-white border-2 border-gray-200 
                             rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 text-sm">Export Selected</div>
                      <div className="text-xs text-gray-600">Download as CSV file</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={handleBulkDelete}
                    disabled={isProcessing}
                    className="flex items-center justify-center space-x-3 p-3 bg-white border-2 border-gray-200 
                             rounded-xl hover:border-red-300 hover:bg-red-50 transition-all duration-200 group
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 text-sm">Delete Selected</div>
                      <div className="text-xs text-gray-600">Remove permanently</div>
                    </div>
                  </button>
                </div>

                {/* Smart Insights */}
                {stats.uncategorizedCount > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1 text-sm">💡 Smart Suggestions</h4>
                        <div className="text-xs text-blue-800 space-y-1">
                          <p>• {stats.uncategorizedCount} transactions need categorization</p>
                          <p>• Consider using AI auto-categorization for similar patterns</p>
                          {selectedTxns.some(t => t.description.toLowerCase().includes('subscription')) && (
                            <p>• Detected subscription payments - try "Subscriptions" category</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
