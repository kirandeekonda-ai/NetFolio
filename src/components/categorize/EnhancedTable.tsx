import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, Category } from '@/types';
import { formatAmount } from '@/utils/currency';
import { getCategoryColorStyle } from '@/utils/categoryColors';
import { Portal } from '../Portal';

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
}

interface EnhancedTableProps {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  selectedTransactions: Set<string>;
  onTransactionSelect: (transactionId: string, selected: boolean) => void;
  onCategoryChange: (transaction: Transaction, category: Category) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const CategoryDropdown = ({
  categories,
  onSelect,
  onClose,
  position,
}: {
  categories: Category[];
  onSelect: (category: Category) => void;
  onClose: () => void;
  position: { top: number; left: number; width: number };
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <Portal>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed z-[100] bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
        }}
      >
        <div className="py-2 max-h-60 overflow-y-auto">
          {categories.map((category) => {
            const categoryStyle = getCategoryColorStyle(category.name, categories);
            return (
              <button
                key={category.id}
                onClick={() => onSelect(category)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-all duration-150 group flex items-center space-x-3"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: categoryStyle.style?.backgroundColor || '#6B7280' }}
                />
                <span className="text-sm font-medium text-gray-900">{category.name}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </Portal>
  );
};

export const EnhancedTable: React.FC<EnhancedTableProps> = ({
  transactions,
  categories,
  currency,
  selectedTransactions,
  onTransactionSelect,
  onCategoryChange,
  onSelectAll,
  onDeselectAll,
}) => {
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [quickCategoryMode, setQuickCategoryMode] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  
  const handleCategoryButtonClick = (transactionId: string) => {
    const button = buttonRefs.current[transactionId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
      setActiveDropdown(transactionId);
    }
  };

  const handleCategorySelect = (transaction: Transaction, category: Category) => {
    onCategoryChange(transaction, category);
    setActiveDropdown(null);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (activeDropdown) {
        const button = buttonRefs.current[activeDropdown];
        if (button) {
          const rect = button.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width,
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [activeDropdown]);



  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    { key: 'Ctrl+A', description: 'Select all transactions', action: onSelectAll },
    { key: 'Ctrl+D', description: 'Deselect all transactions', action: onDeselectAll },
    { key: 'Ctrl+F', description: 'Focus search box', action: () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      searchInput?.focus();
    }},
    { key: 'Shift+?', description: 'Show keyboard shortcuts', action: () => setShowShortcutsHelp(!showShortcutsHelp) },
    { key: 'Q', description: 'Toggle quick category mode', action: () => setQuickCategoryMode(!quickCategoryMode) },
    { key: 'ArrowUp', description: 'Navigate up', action: () => {
      setFocusedRowIndex(prev => prev === null ? 0 : Math.max(0, prev - 1));
    }},
    { key: 'ArrowDown', description: 'Navigate down', action: () => {
      setFocusedRowIndex(prev => prev === null ? 0 : Math.min(transactions.length - 1, (prev || 0) + 1));
    }},
    { key: 'Space', description: 'Select/deselect focused row', action: () => {
      if (focusedRowIndex !== null && transactions[focusedRowIndex]) {
        const transaction = transactions[focusedRowIndex];
        onTransactionSelect(transaction.id, !selectedTransactions.has(transaction.id));
      }
    }},
    { key: 'Enter', description: 'Open category selector for focused row', action: () => {
      if (focusedRowIndex !== null) {
        const row = document.querySelector(`[data-row-index="${focusedRowIndex}"] button`);
        (row as HTMLButtonElement)?.click();
      }
    }}
  ];

  // Add number key shortcuts for quick categorization
  categories.slice(0, 9).forEach((category, index) => {
    shortcuts.push({
      key: `${index + 1}`,
      description: `Assign "${category.name}" to focused transaction`,
      action: () => {
        if (focusedRowIndex !== null && transactions[focusedRowIndex] && quickCategoryMode) {
          onCategoryChange(transactions[focusedRowIndex], category);
        }
      }
    });
  });

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const shortcut = shortcuts.find(s => {
      const keys = s.key.split('+');
      const mainKey = keys.pop()?.toLowerCase();
      
      if (event.key.toLowerCase() !== mainKey) return false;

      const ctrl = keys.includes('Ctrl');
      const shift = keys.includes('Shift');
      
      return event.ctrlKey === ctrl && event.shiftKey === shift;
    });

    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  }, [shortcuts, focusedRowIndex, transactions, quickCategoryMode]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleRowClick = (index: number, transaction: Transaction) => {
    setFocusedRowIndex(index);
    onTransactionSelect(transaction.id, !selectedTransactions.has(transaction.id));
  };

  return (
    <div className="relative">
      {/* Keyboard Shortcuts Help */}
      {showShortcutsHelp && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowShortcutsHelp(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">⌨️ Keyboard Shortcuts</h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs font-mono">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
            {quickCategoryMode && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 text-sm mb-2">Quick Category Mode Active</h4>
                <p className="text-xs text-blue-700">Press number keys 1-9 to quickly assign categories to the focused transaction.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50/50 rounded-lg">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Shift+?</kbd> for shortcuts</span>
          {quickCategoryMode && (
            <span className="text-blue-600 font-medium">Quick Category Mode ON</span>
          )}
          {focusedRowIndex !== null && (
            <span>Row {focusedRowIndex + 1} of {transactions.length}</span>
          )}
        </div>
        <div className="text-sm text-gray-600">
          {selectedTransactions.size} selected
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="overflow-hidden rounded-2xl bg-white/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                    onChange={(e) => e.target.checked ? onSelectAll() : onDeselectAll()}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction, index) => {
                const isSelected = selectedTransactions.has(transaction.id);
                const isFocused = focusedRowIndex === index;
                const categoryStyle = getCategoryColorStyle(
                  transaction.category_name || 'Uncategorized', 
                  categories
                );

                return (
                  <motion.tr
                    key={transaction.id}
                    data-row-index={index}
                    className={`
                      cursor-pointer transition-all duration-200 hover:bg-blue-50/50
                      ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                      ${isFocused ? 'ring-2 ring-blue-500/50 bg-blue-25' : ''}
                    `}
                    onClick={() => handleRowClick(index, transaction)}
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onTransactionSelect(transaction.id, e.target.checked);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.description}
                      </div>
                      {quickCategoryMode && isFocused && (
                        <div className="mt-1 text-xs text-blue-600">
                          Press 1-{Math.min(9, categories.length)} to categorize
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${
                        (transaction.amount || 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatAmount(transaction.amount || 0, currency)}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <button
                        ref={(el) => (buttonRefs.current[transaction.id] = el)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryButtonClick(transaction.id);
                        }}
                        className={`
                          px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border shadow-sm w-full text-left
                          flex items-center justify-between
                          ${(transaction.category_name === 'Uncategorized' || !transaction.category_name)
                            ? 'bg-white/90 text-gray-600 border-gray-200 hover:bg-white hover:border-gray-300'
                            : `${categoryStyle.bg} ${categoryStyle.text} border-gray-200`
                          }
                        `}
                        style={(transaction.category_name !== 'Uncategorized' && transaction.category_name) ? categoryStyle.style : undefined}
                      >
                        <span>{transaction.category_name || 'Select Category'}</span>
                        <span className="ml-2 text-xs">▼</span>
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {activeDropdown && (
          <CategoryDropdown
            categories={categories}
            onSelect={(category) => handleCategorySelect(transactions.find(t => t.id === activeDropdown)!, category)}
            onClose={() => setActiveDropdown(null)}
            position={dropdownPosition}
          />
        )}
      </AnimatePresence>

      {/* Quick Category Legend */}
      {quickCategoryMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-blue-50 rounded-xl"
        >
          <h4 className="font-medium text-blue-900 mb-3">Quick Category Keys</h4>
          <div className="grid grid-cols-3 gap-2">
            {categories.slice(0, 9).map((category, index) => {
              const categoryStyle = getCategoryColorStyle(category.name, categories);
              return (
                <div key={category.id} className="flex items-center space-x-2">
                  <kbd className="px-2 py-1 bg-white rounded text-xs font-mono border">
                    {index + 1}
                  </kbd>
                  <div 
                    className={`px-2 py-1 rounded text-xs ${categoryStyle.bg} ${categoryStyle.text}`}
                    style={categoryStyle.style}
                  >
                    {category.name}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};
