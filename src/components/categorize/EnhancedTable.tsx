import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, Category } from '@/types';
import { formatAmount } from '@/utils/currency';
import { getCategoryColorStyle } from '@/utils/categoryColors';
import { Portal } from '../Portal';
import { TransferLinkingModal } from './TransferLinkingModal';
import { useTransferLinking } from '@/hooks/useTransferLinking';

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
  onTransferLinked?: () => void;
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
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, categories.length);
  }, [categories]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prevIndex) => (prevIndex + 1) % categories.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prevIndex) => (prevIndex - 1 + categories.length) % categories.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(categories[focusedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [categories, focusedIndex, onSelect, onClose]);

  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [focusedIndex]);

  return (
    <Portal>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden"
        style={{
          top: Math.min(position.top, window.innerHeight - 260), // Ensure dropdown doesn't go below viewport
          left: position.left,
          width: position.width,
          maxHeight: '240px', // Consistent with max-h-60
        }}
        onMouseDown={(e) => e.stopPropagation()} // Prevent event bubbling
      >
        <div className="py-1 max-h-60 overflow-y-auto">
          {categories.map((category, index) => {
            const categoryStyle = getCategoryColorStyle(category.name, categories);
            const isFocused = index === focusedIndex;
            return (
              <button
                key={category.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                onClick={() => onSelect(category)}
                className={`w-full px-4 py-3 text-left transition-all duration-150 group flex items-center space-x-3 hover:bg-gray-50 ${isFocused ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 border border-white/40 shadow-sm ring-1 ring-black/5"
                  style={{ backgroundColor: categoryStyle.style?.backgroundColor || '#6B7280' }}
                />
                <span className="text-sm font-medium text-gray-800 flex-1 min-w-0 truncate group-hover:text-gray-900">{category.name}</span>
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
  onTransferLinked,
}) => {
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [quickCategoryMode, setQuickCategoryMode] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransactionForTransfer, setSelectedTransactionForTransfer] = useState<Transaction | null>(null);

  // Transfer linking functionality
  const { unlinkTransaction, isLoading: isUnlinking } = useTransferLinking();
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const handleCategoryButtonClick = (transactionId: string) => {
    // Close any existing dropdown first
    if (activeDropdown) {
      setActiveDropdown(null);
      return;
    }

    const button = buttonRefs.current[transactionId];
    if (button) {
      const rect = button.getBoundingClientRect();
      const dropdownHeight = 240; // max-h-60 = 240px
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Position dropdown above if there's not enough space below
      const shouldPositionAbove = spaceBelow < dropdownHeight + 16 && spaceAbove > dropdownHeight;

      setDropdownPosition({
        top: shouldPositionAbove ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
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

  const handleTransferLinkClick = (transaction: Transaction) => {
    setSelectedTransactionForTransfer(transaction);
    setShowTransferModal(true);
  };

  const handleTransferDelinkClick = async (transaction: Transaction) => {
    if (!transaction.id) return;

    const success = await unlinkTransaction(transaction.id);
    if (success && onTransferLinked) {
      onTransferLinked();
    }
  };

  const handleTransferLinked = () => {
    if (onTransferLinked) {
      onTransferLinked();
    }
    setShowTransferModal(false);
    setSelectedTransactionForTransfer(null);
  };

  const isTransferLinked = (transaction: Transaction) => {
    return transaction.is_internal_transfer || transaction.linked_transaction_id;
  };

  const getTransferIndicator = (transaction: Transaction) => {
    if (transaction.is_internal_transfer && transaction.linked_transaction_id) {
      return (
        <div className="flex items-center space-x-1 text-xs text-blue-600">
          <span>🔄</span>
          <span>Linked Transfer</span>
        </div>
      );
    }
    return null;
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

  // Focus on the row when focusedRowIndex changes
  useEffect(() => {
    if (focusedRowIndex !== null) {
      rowRefs.current[focusedRowIndex]?.focus();
    }
  }, [focusedRowIndex]);

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    { key: 'Ctrl+A', description: 'Select all transactions', action: onSelectAll },
    { key: 'Ctrl+D', description: 'Deselect all transactions', action: onDeselectAll },
    {
      key: 'Ctrl+F', description: 'Focus search box', action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
    },
    { key: 'Shift+?', description: 'Show keyboard shortcuts', action: () => setShowShortcutsHelp(!showShortcutsHelp) },
    { key: 'Q', description: 'Toggle quick category mode', action: () => setQuickCategoryMode(!quickCategoryMode) },
    {
      key: 'ArrowUp', description: 'Navigate up', action: () => {
        setFocusedRowIndex(prev => prev === null ? 0 : Math.max(0, prev - 1));
      }
    },
    {
      key: 'ArrowDown', description: 'Navigate down', action: () => {
        setFocusedRowIndex(prev => prev === null ? 0 : Math.min(transactions.length - 1, (prev || 0) + 1));
      }
    },
    {
      key: ' ', description: 'Select/deselect focused row', action: () => {
        if (focusedRowIndex !== null && transactions[focusedRowIndex]) {
          const transaction = transactions[focusedRowIndex];
          onTransactionSelect(transaction.id, !selectedTransactions.has(transaction.id));
        }
      }
    },
    {
      key: 'Enter', description: 'Open category selector for focused row', action: () => {
        if (focusedRowIndex !== null) {
          const row = document.querySelector(`[data-row-index="${focusedRowIndex}"] button`);
          (row as HTMLButtonElement)?.click();
        }
      }
    }
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
    if (activeDropdown) return;

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
      <div className="overflow-hidden rounded-2xl bg-white/90 shadow-sm border border-gray-100">
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                    onChange={(e) => e.target.checked ? onSelectAll() : onDeselectAll()}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="w-20 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Transfer</th>
                <th className="w-32 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                <th className="w-56 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
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
                  <tr
                    key={transaction.id}
                    ref={(el) => { rowRefs.current[index] = el; }}
                    tabIndex={-1}
                    data-row-index={index}
                    className={`
                      cursor-pointer transition-all duration-200 hover:bg-blue-50/50 relative group
                      focus:outline-none focus:ring-1 focus:ring-blue-400
                      ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                      ${isFocused ? 'bg-blue-25' : ''}
                    `}
                    onClick={() => handleRowClick(index, transaction)}
                    onMouseEnter={() => setHoveredRow(transaction.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3 relative">
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
                      <div className="text-sm font-medium text-gray-900 truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                      {getTransferIndicator(transaction)}
                      {quickCategoryMode && isFocused && (
                        <div className="mt-1 text-xs text-blue-600">
                          Press 1-{Math.min(9, categories.length)} to categorize
                        </div>
                      )}
                    </td>

                    {/* Transfer Actions - Show before amount */}
                    <td className="px-2 py-3 text-center relative">
                      {hoveredRow === transaction.id && (
                        <AnimatePresence>
                          {!isTransferLinked(transaction) ? (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTransferLinkClick(transaction);
                              }}
                              className="bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-lg flex items-center space-x-1"
                              title="Link Transfer"
                            >
                              <span>🔗</span>
                              <span>Link</span>
                            </motion.button>
                          ) : (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTransferDelinkClick(transaction);
                              }}
                              disabled={isUnlinking}
                              className="bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors shadow-lg flex items-center space-x-1 disabled:opacity-50"
                              title="Unlink Transfer"
                            >
                              <span>🔗❌</span>
                              <span>{isUnlinking ? 'Unlinking...' : 'Unlink'}</span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      )}
                      {/* Show transfer status when not hovering */}
                      {hoveredRow !== transaction.id && isTransferLinked(transaction) && (
                        <div className="flex items-center justify-center text-xs text-blue-600">
                          <span>🔄</span>
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium whitespace-nowrap ${(transaction.amount || 0) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {formatAmount(transaction.amount || 0, currency)}
                      </span>
                      {transaction.transfer_detection_confidence && (
                        <div className="text-xs text-gray-500 mt-1">
                          AI Confidence: {Math.round(transaction.transfer_detection_confidence * 100)}%
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <button
                        ref={(el) => { buttonRefs.current[transaction.id] = el; }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryButtonClick(transaction.id);
                        }}
                        disabled={!!isTransferLinked(transaction)}
                        className={`
                          px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border shadow-sm w-full text-left
                          flex items-center justify-between group truncate
                          ${isTransferLinked(transaction)
                            ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                            : (transaction.category_name === 'Uncategorized' || !transaction.category_name)
                              ? 'bg-white/90 text-gray-600 border-gray-200 hover:bg-white hover:border-gray-300'
                              : `${categoryStyle.bg} ${categoryStyle.text} border-gray-200`
                          }
                        `}
                        style={(transaction.category_name !== 'Uncategorized' && transaction.category_name && !isTransferLinked(transaction)) ? categoryStyle.style : undefined}
                      >
                        <span className="truncate pr-2 group-hover:text-opacity-90">
                          {isTransferLinked(transaction)
                            ? 'Internal Transfer'
                            : transaction.category_name === 'Uncategorized' || !transaction.category_name
                              ? '🏷️ Uncategorized'
                              : transaction.category_name
                          }
                        </span>
                        {!isTransferLinked(transaction) && <span className="ml-2 text-xs flex-shrink-0 group-hover:text-opacity-90">▼</span>}
                      </button>
                    </td>
                  </tr>
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

      {/* Transfer Linking Modal */}
      {showTransferModal && selectedTransactionForTransfer && (
        <TransferLinkingModal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedTransactionForTransfer(null);
          }}
          sourceTransaction={selectedTransactionForTransfer}
          currency={currency}
          onTransferLinked={handleTransferLinked}
        />
      )}
    </div>
  );
};
