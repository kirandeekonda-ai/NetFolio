import { NextPage } from 'next';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { Table } from '@/components/Table';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ToastProvider, useToast } from '@/components/Toast';
import { Portal } from '@/components/Portal';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { setTransactions } from '@/store/transactionsSlice';
import { fetchTransactions, refreshTransactions, updateTransaction, updateTransactionFromRealtime } from '@/store/enhancedTransactionsSlice';
import { setCategories } from '@/store/categoriesSlice';
import { Transaction, Category } from '@/types';
import { formatAmount } from '@/utils/currency';
import { getCategoryColorStyle } from '@/utils/categoryColors';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/utils/supabase';

const Categorize: NextPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useUser();
  const { toasts, addToast, removeToast, updateToast } = useToast();
  
  // Use enhanced transactions slice that has API integration
  const { items: transactions, isLoading, error } = useSelector((state: RootState) => state.enhancedTransactions);
  const categories = useSelector((state: RootState) => state.categories.items);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number; isNearBottom: boolean } | null>(null);
  const [dropdownButtonRef, setDropdownButtonRef] = useState<HTMLButtonElement | null>(null);
  const [currency, setCurrency] = useState<string>('INR');
  const [showNoTransactionsMessage, setShowNoTransactionsMessage] = useState(false);
  const [currentStatement, setCurrentStatement] = useState<any>(null);
  
  // UI state
  const [highlightedRows, setHighlightedRows] = useState<Set<string>>(new Set());
  
  // Ref for click-outside handling
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user came from upload with no transactions
    if (router.query.message === 'no_transactions') {
      setShowNoTransactionsMessage(true);
      // Clear the query parameter after showing the message
      const { message, ...cleanQuery } = router.query;
      router.replace({
        pathname: router.pathname,
        query: cleanQuery
      }, undefined, { shallow: true });
    }

    // Check if we're categorizing transactions for a specific statement
    if (router.query.statement && typeof router.query.statement === 'string') {
      fetchStatementContext(router.query.statement);
    }
  }, [router.query]);

  const fetchStatementContext = async (statementId: string) => {
    try {
      const response = await fetch(`/api/transactions/by-statement/${statementId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentStatement(data.statement);
        // Transactions should already be loaded in Redux store from StatementDashboard
      } else {
        console.error('Failed to fetch statement context');
      }
    } catch (error) {
      console.error('Error fetching statement context:', error);
    }
  };

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('currency, categories')
          .eq('user_id', user.id)
          .single();

        if (data) {
          if (data.currency) {
            setCurrency(data.currency);
          }
          if (data.categories) {
            dispatch(setCategories(data.categories));
          }
        }
      }
    };

    fetchUserPreferences();
  }, [user]);

  // Fetch transactions when component loads or user changes
  useEffect(() => {
    const loadTransactions = async () => {
      if (user?.id && !isLoading) {
        try {
          console.log('Categorize page: Loading transactions for user', user.id);
          await dispatch(fetchTransactions({ userId: user.id })).unwrap();
          console.log('Categorize page: Transactions loaded successfully');
        } catch (error) {
          console.error('Categorize page: Failed to load transactions', error);
        }
      }
    };

    loadTransactions();
  }, [user?.id, dispatch]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside the portal dropdown
      const target = event.target as Element;
      if (target.closest('[data-dropdown-portal]')) {
        return;
      }
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setDropdownPosition(null);
        setDropdownButtonRef(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Function to calculate dropdown position
  const calculateDropdownPosition = useCallback((buttonElement: HTMLButtonElement, isNearBottom: boolean) => {
    const buttonRect = buttonElement.getBoundingClientRect();
    
    return {
      top: isNearBottom ? buttonRect.top - 8 : buttonRect.bottom + 8,
      right: window.innerWidth - buttonRect.right,
      isNearBottom
    };
  }, []);

  // Debug: Log when transactions change
  useEffect(() => {
    console.log('=== TRANSACTIONS LOADED/CHANGED ===');
    console.log('Total transactions:', transactions.length);
    console.log('Transaction details:', transactions.map(t => ({
      id: t.id,
      description: t.description,
      isValidUUID: isValidUUID(t.id),
      category: t.category,
      amount: t.amount,
      amountType: typeof t.amount,
      amountIsNegative: t.amount < 0,
      transaction_type: t.transaction_type,
      type: t.type
    })));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const shouldFilterUncategorized = router.query.filter === 'uncategorized';
    
    return transactions
      .filter((transaction) => {
        // Filter out null/undefined transactions and ensure required fields exist
        if (!transaction || !transaction.id || !transaction.description) {
          console.warn('Filtering out invalid transaction:', transaction);
          return false;
        }
        
        // Ensure transaction has proper structure
        if (typeof transaction.id !== 'string' || 
            typeof transaction.description !== 'string' ||
            (transaction.amount !== undefined && typeof transaction.amount !== 'number')) {
          console.warn('Filtering out malformed transaction:', transaction);
          return false;
        }
        
        return true;
      })
      .filter((transaction) => {
        // Apply search filter
        const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        // If filtering for uncategorized, only show transactions without categories
        if (shouldFilterUncategorized) {
          const isUncategorized = !transaction.category_name || 
                                 transaction.category_name === 'Uncategorized' || 
                                 !transaction.category || 
                                 transaction.category === 'Uncategorized';
          return matchesSearch && isUncategorized;
        }
        
        return matchesSearch;
      });
  }, [transactions, searchTerm, router.query.filter]);

  // Update dropdown position on scroll
  useEffect(() => {
    let animationFrameId: number;
    
    const handleScroll = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        if (openDropdown && dropdownButtonRef) {
          const currentIndex = filteredTransactions.findIndex(t => t.id === openDropdown);
          const isNearBottom = currentIndex >= filteredTransactions.length - 3;
          const newPosition = calculateDropdownPosition(dropdownButtonRef, isNearBottom);
          setDropdownPosition(newPosition);
        }
      });
    };

    if (openDropdown && dropdownButtonRef) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [openDropdown, dropdownButtonRef, filteredTransactions, calculateDropdownPosition]);

  // Helper function to check if an ID is a valid UUID (not a mock ID)
  const isValidUUID = (id: string): boolean => {
    // UUID v4 regex pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(id);
  };

  const handleCategoryChange = async (transaction: Transaction, category: Category) => {
    console.log('=== CATEGORY CHANGE DEBUG ===');
    console.log('Transaction ID:', transaction.id);
    console.log('Transaction description:', transaction.description);
    console.log('Is valid UUID:', isValidUUID(transaction.id));
    console.log('New category:', category.name);
    console.log('Current transaction object:', transaction);
    
    // Update Redux store immediately for UI feedback using the enhanced slice
    const updatedTransaction = {
      ...transaction,
      category_name: category.name,
      category: category.name, // Keep legacy field in sync
    };
    
    console.log('Updated transaction:', updatedTransaction);
    
    dispatch(updateTransactionFromRealtime(updatedTransaction));
    setOpenDropdown(null); // Close dropdown after selection
    setDropdownPosition(null); // Clear dropdown position
    setDropdownButtonRef(null); // Clear button reference
    
    // If it's a valid UUID (persisted transaction), save to database
    if (isValidUUID(transaction.id)) {
      try {
        const loadingToastId = addToast({
          type: 'loading',
          message: 'Saving category...',
          duration: 0
        });

        // Use the enhanced slice's updateTransaction for database persistence
        await dispatch(updateTransaction({
          id: transaction.id,
          updates: {
            category_name: category.name,
            category: category.name
          }
        })).unwrap();

        removeToast(loadingToastId);

        // Show brief success feedback
        setHighlightedRows(new Set([transaction.id]));
        addToast({
          type: 'success',
          message: `Category saved: ${category.name}`,
          duration: 2000
        });

        // Remove highlighting after 1 second
        setTimeout(() => {
          setHighlightedRows(new Set());
        }, 1000);

        // Check if all transactions are categorized and show completion message
        const allTransactions = transactions.filter(t => t.id && isValidUUID(t.id));
        const categorizedCount = allTransactions.filter(t => t.category_name && t.category_name !== 'Uncategorized').length;
        
        if (categorizedCount === allTransactions.length && allTransactions.length > 0) {
          setTimeout(() => {
            addToast({
              type: 'success',
              message: '🎉 All transactions categorized! Ready to view your dashboard.',
              duration: 5000,
              action: {
                label: 'View Dashboard',
                onClick: () => router.push('/dashboard')
              }
            });
          }, 2000);
        }
      } catch (error) {
        console.error('Error saving category:', error);
        addToast({
          type: 'error',
          message: 'Failed to save category',
          duration: 3000
        });
      }
    } else {
      // For mock transactions, just show info that they need to upload first
      addToast({
        type: 'info',
        message: 'Category will be saved when you upload the statement to database',
        duration: 4000
      });
    }
  };

  const columns = [
    { 
      key: 'transaction_date' as keyof Transaction,
      header: 'Date',
      render: (value: string) => {
        if (!value) return <span className="text-gray-400">-</span>;
        try {
          return new Date(value).toLocaleDateString();
        } catch (error) {
          return <span className="text-gray-400">Invalid Date</span>;
        }
      },
      className: 'w-2/12',
    },
    { 
      key: 'description' as keyof Transaction,
      header: 'Description',
      className: 'w-6/12',
    },
    {
      key: 'amount' as keyof Transaction,
      header: 'Amount',
      render: (value: number) => {
        if (value === undefined || value === null || isNaN(value)) {
          return <span className="text-gray-400">-</span>;
        }
        return (
          <span className={value > 0 ? 'text-green-600' : 'text-red-600'}>
            {formatAmount(value, currency)}
          </span>
        );
      },
      className: 'w-2/12 text-right',
    },
    {
      key: 'category_name' as keyof Transaction,
      header: 'Category',
      render: (value: string, item: Transaction) => {
        console.log('Rendering category for item:', item?.id, 'value:', value, 'category_name:', item?.category_name, 'legacy category:', item?.category);
        
        // Safety check: ensure item exists and has required properties
        if (!item || !item.id) {
          console.warn('Invalid item passed to category render:', item);
          return <span className="text-gray-400">-</span>;
        }
        
        // Use category_name first, fallback to legacy category field
        const categoryName = value || item?.category || 'Uncategorized';
        const style = getCategoryColorStyle(categoryName, categories);
        const isHighlighted = highlightedRows.has(item.id);
        
        // Check if this is one of the last few rows to position dropdown above
        const currentIndex = filteredTransactions.findIndex(t => t.id === item.id);
        const isNearBottom = currentIndex >= filteredTransactions.length - 3;
        
        return (
          <div className="relative" ref={dropdownRef}>
            <motion.button
              ref={(ref) => {
                if (openDropdown === item.id) {
                  setDropdownButtonRef(ref);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (openDropdown === item.id) {
                  setOpenDropdown(null);
                  setDropdownPosition(null);
                  setDropdownButtonRef(null);
                } else {
                  const buttonElement = e.currentTarget;
                  const newPosition = calculateDropdownPosition(buttonElement, isNearBottom);
                  setDropdownPosition(newPosition);
                  setDropdownButtonRef(buttonElement);
                  setOpenDropdown(item.id);
                }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border shadow-sm ${
                isHighlighted 
                  ? 'bg-green-100 text-green-800 border-green-200 shadow-md scale-105' 
                  : categoryName === 'Uncategorized'
                    ? 'bg-white/90 text-gray-600 border-gray-200 hover:bg-white hover:border-gray-300'
                    : `${style.bg} ${style.text} border-gray-200`
              }`}
              style={!isHighlighted && categoryName !== 'Uncategorized' ? style.style : undefined}
            >
              {categoryName === 'Uncategorized' ? 'Select Category' : categoryName}
              <motion.span
                className="ml-2 inline-block text-xs"
                animate={{ rotate: openDropdown === item.id ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ▼
              </motion.span>
            </motion.button>
          </div>
        );
      },
      className: 'w-2/12',
    },
  ];

  // Render dropdown in portal
  const renderDropdown = () => {
    if (!openDropdown || !dropdownPosition) return null;

    const currentItem = filteredTransactions.find(t => t.id === openDropdown);
    if (!currentItem) return null;

    const categoryName = currentItem.category_name || currentItem?.category || 'Uncategorized';

    return (
      <Portal>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: dropdownPosition.isNearBottom ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropdownPosition.isNearBottom ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed bg-white rounded-xl shadow-2xl border border-gray-200/50 overflow-hidden z-[9999]"
            data-dropdown-portal
            style={{ 
              minWidth: '200px',
              maxHeight: '300px',
              overflowY: 'auto',
              top: dropdownPosition.isNearBottom ? dropdownPosition.top - 300 : dropdownPosition.top,
              right: dropdownPosition.right,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {categories.map((category, index) => {
                const categoryStyle = getCategoryColorStyle(category.name, categories);
                const isSelected = category.name === categoryName;
                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Dropdown option clicked:', category.name);
                      handleCategoryChange(currentItem, category);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150 flex items-center justify-between hover:bg-gray-50 cursor-pointer ${
                      isSelected ? `${categoryStyle.bg} ${categoryStyle.text}` : 'text-gray-700'
                    }`}
                    style={isSelected ? categoryStyle.style : undefined}
                    whileHover={{ backgroundColor: isSelected ? undefined : '#f9fafb' }}
                  >
                    <span>{category.name}</span>
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xs"
                      >
                        ✓
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </Portal>
    );
  };

  return (
    <Layout>
      <ToastProvider toasts={toasts} onRemove={removeToast} />
      
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Modern Header Section */}
        <motion.div 
          className="mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-2xl">🏷️</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {currentStatement ? 'Categorize Statement Transactions' : 'Categorize Transactions'}
                  </h1>
                  {currentStatement ? (
                    <p className="text-gray-600 mt-1">
                      {currentStatement.statement_month}/{currentStatement.statement_year} Statement • 
                      <span className="font-medium ml-1">{filteredTransactions.length} transactions</span>
                    </p>
                  ) : (
                    <p className="text-gray-600 mt-1">Organize your financial data with smart categorization</p>
                  )}
                </div>
              </div>
              
              {/* Navigation Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push('/statements')}
                  className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl 
                           hover:bg-white/80 text-gray-700 font-medium transition-all duration-200 
                           shadow-sm hover:shadow-md"
                >
                  ← Statements
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl 
                           hover:from-green-600 hover:to-emerald-700 font-medium transition-all duration-200 
                           shadow-sm hover:shadow-md"
                >
                  📊 Dashboard
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</div>
                <div className="text-sm text-gray-600">Total Transactions</div>
              </div>
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredTransactions.filter(t => t.category_name && t.category_name !== 'Uncategorized').length}
                </div>
                <div className="text-sm text-gray-600">Categorized</div>
              </div>
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {filteredTransactions.filter(t => !t.category_name || t.category_name === 'Uncategorized').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>

            {/* Search Control */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <span className="text-gray-500 text-lg">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/90 border border-gray-200 rounded-2xl shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300
                         placeholder-gray-400 text-gray-900 transition-all duration-200"
              />
            </div>
          </div>
        </motion.div>

        {/* Filter Indicator */}
        {router.query.filter === 'uncategorized' && (
          <motion.div 
            className="mb-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="backdrop-blur-xl bg-gradient-to-r from-yellow-50/80 to-orange-50/80 rounded-2xl shadow-lg border border-yellow-200/30 p-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                  <span className="text-xl">�</span>
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-900 text-lg">
                    Focus Mode: Uncategorized Transactions
                  </h3>
                  <p className="text-yellow-800 text-sm">
                    Showing {filteredTransactions.length} uncategorized transactions for efficient processing
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* No Transactions Message */}
        {showNoTransactionsMessage && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="mb-6"
          >
            <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Statement Uploaded Successfully
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Your statement was uploaded but no transactions were extracted. This could happen if:
                </p>
                <div className="bg-gray-50/80 rounded-2xl p-4 mb-6 max-w-lg mx-auto">
                  <ul className="text-left text-sm text-gray-700 space-y-2">
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-500">•</span>
                      <span>The file format is not supported by the AI processor</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-500">•</span>
                      <span>The statement is empty or has no transaction data</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-500">•</span>
                      <span>The statement format is unclear or contains only images</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowNoTransactionsMessage(false)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl 
                           hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 
                           font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        {filteredTransactions.length === 0 && !showNoTransactionsMessage ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-12">
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">📊</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Ready to Categorize
                </h2>
                <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                  Upload a bank statement to start organizing your financial transactions with AI-powered categorization.
                </p>
                <button
                  onClick={() => router.push('/statements')}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl 
                           hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 
                           font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
                >
                  Upload Statement →
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Transactions Table */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 overflow-visible"
            >
              <div className="overflow-x-auto overflow-y-visible">
                <Table
                  data={filteredTransactions}
                  columns={columns}
                />
              </div>
            </motion.div>

            {/* Bottom Stats */}
            <motion.div 
              className="mt-8 text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="backdrop-blur-xl bg-white/60 rounded-2xl shadow-lg border border-white/20 px-6 py-3 inline-block">
                <p className="text-gray-700 font-medium">
                  <span className="text-blue-600 font-bold">{filteredTransactions.length}</span> transactions • 
                  <span className="text-green-600 font-bold ml-2">
                    {filteredTransactions.filter(t => t.category_name && t.category_name !== 'Uncategorized').length}
                  </span> categorized
                </p>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
      {renderDropdown()}
    </Layout>
  );
};

export default Categorize;
