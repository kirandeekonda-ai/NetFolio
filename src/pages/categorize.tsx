import { NextPage } from 'next';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ToastProvider, useToast } from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchTransactions, refreshTransactions, updateTransaction, updateTransactionFromRealtime } from '@/store/enhancedTransactionsSlice';
import { setCategories } from '@/store/categoriesSlice';
import { Transaction, Category } from '@/types';
import { formatAmount } from '@/utils/currency';
import { getCategoryColorStyle } from '@/utils/categoryColors';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/utils/supabase';
import { Portal } from '@/components/Portal';

// Import new components
import { AdvancedFilters, FilterCriteria } from '@/components/categorize/AdvancedFilters';
import { BulkOperations } from '@/components/categorize/BulkOperations';
import { EnhancedTable } from '@/components/categorize/EnhancedTable';
import { ExportImportTools } from '@/components/categorize/ExportImportTools';
import { CategorizationVisualAnalytics } from '@/components/categorize/CategorizationVisualAnalytics';
import { TransferDetectionPanel } from '@/components/categorize/TransferDetectionPanel';

const Categorize: NextPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useUser();
  const { toasts, addToast, removeToast, updateToast } = useToast();

  // Redux state
  const { items: transactions, isLoading, error } = useSelector((state: RootState) => state.enhancedTransactions);
  const categories = useSelector((state: RootState) => state.categories.items);

  // Enhanced state management
  const [filters, setFilters] = useState<FilterCriteria>({
    searchTerm: '',
    dateRange: { start: '', end: '' },
    amountRange: { min: null, max: null },
    categoryStatus: 'all',
    selectedCategory: null,
    transactionType: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'table' | 'insights' | 'analytics' | 'tools' | 'transfers'>('table');
  const [undoStack, setUndoStack] = useState<Array<{ action: string; data: any }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ action: string; data: any }>>([]);

  // Legacy state for compatibility
  const [currency, setCurrency] = useState<string>('INR');
  const [showNoTransactionsMessage, setShowNoTransactionsMessage] = useState(false);
  const [currentStatement, setCurrentStatement] = useState<any>(null);
  const [highlightedRows, setHighlightedRows] = useState<Set<string>>(new Set());

  // Initialize component
  useEffect(() => {
    if (router.query.message === 'no_transactions') {
      setShowNoTransactionsMessage(true);
      const { message, ...cleanQuery } = router.query;
      router.replace({
        pathname: router.pathname,
        query: cleanQuery
      }, undefined, { shallow: true });
    }

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
      }
    } catch (error) {
      console.error('Error fetching statement context:', error);
    }
  };

  // Load user preferences and transactions
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('currency, categories')
          .eq('user_id', user.id)
          .single();

        if (data) {
          if (data.currency) setCurrency(data.currency);
          if (data.categories) dispatch(setCategories(data.categories));
        }
      }
    };

    fetchUserPreferences();
  }, [user]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (user?.id && !isLoading) {
        try {
          await dispatch(fetchTransactions({ userId: user.id })).unwrap();
        } catch (error) {
          console.error('Failed to load transactions', error);
        }
      }
    };

    loadTransactions();
  }, [user?.id, dispatch]);

  // Enhanced filtering and sorting logic
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter((transaction) => {
      // Basic validation
      if (!transaction || !transaction.id || !transaction.description) return false;

      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch =
          transaction.description.toLowerCase().includes(searchLower) ||
          (transaction.category_name && transaction.category_name.toLowerCase().includes(searchLower)) ||
          (transaction.amount && transaction.amount.toString().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const txnDate = new Date(transaction.transaction_date);
        if (filters.dateRange.start && txnDate < new Date(filters.dateRange.start)) return false;
        if (filters.dateRange.end && txnDate > new Date(filters.dateRange.end)) return false;
      }

      // Amount range filter
      if (filters.amountRange.min !== null || filters.amountRange.max !== null) {
        const amount = Math.abs(transaction.amount || 0);
        if (filters.amountRange.min !== null && amount < filters.amountRange.min) return false;
        if (filters.amountRange.max !== null && amount > filters.amountRange.max) return false;
      }

      // Category status filter
      const isUncategorized = !transaction.category_name || transaction.category_name === 'Uncategorized';
      switch (filters.categoryStatus) {
        case 'categorized':
          if (isUncategorized) return false;
          break;
        case 'uncategorized':
          if (!isUncategorized) return false;
          break;
        case 'specific-category':
          if (transaction.category_name !== filters.selectedCategory) return false;
          break;
      }

      // Transaction type filter
      if (filters.transactionType !== 'all') {
        const isCredit = (transaction.amount || 0) > 0;
        if (filters.transactionType === 'credit' && !isCredit) return false;
        if (filters.transactionType === 'debit' && isCredit) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'date':
          aValue = new Date(a.transaction_date);
          bValue = new Date(b.transaction_date);
          break;
        case 'amount':
          aValue = Math.abs(a.amount || 0);
          bValue = Math.abs(b.amount || 0);
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'category':
          aValue = a.category_name || 'Uncategorized';
          bValue = b.category_name || 'Uncategorized';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [transactions, filters]);

  // Selection handlers
  const handleTransactionSelect = useCallback((transactionId: string, selected: boolean) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(transactionId);
      } else {
        newSet.delete(transactionId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedTransactions(new Set(filteredAndSortedTransactions.map(t => t.id)));
  }, [filteredAndSortedTransactions]);

  const handleDeselectAll = useCallback(() => {
    setSelectedTransactions(new Set());
  }, []);

  // Category change with undo support
  const handleCategoryChange = async (transaction: Transaction, category: Category) => {
    const oldCategory = transaction.category_name;

    // Add to undo stack
    setUndoStack(prev => [...prev.slice(-19), {
      action: 'category_change',
      data: { transactionId: transaction.id, oldCategory, newCategory: category.name }
    }]);
    setRedoStack([]);

    const updatedTransaction = {
      ...transaction,
      category_name: category.name,
      category: category.name,
    };

    dispatch(updateTransactionFromRealtime(updatedTransaction));

    // Persist to database if valid UUID
    if (isValidUUID(transaction.id)) {
      try {
        await dispatch(updateTransaction({
          id: transaction.id,
          updates: { category_name: category.name, category: category.name }
        })).unwrap();

        setHighlightedRows(new Set([transaction.id]));
        setTimeout(() => setHighlightedRows(new Set()), 1000);

        addToast({
          type: 'success',
          message: `Category updated: ${category.name}`,
          duration: 2000
        });
      } catch (error) {
        addToast({
          type: 'error',
          message: 'Failed to save category',
          duration: 3000
        });
      }
    }
  };

  // Bulk operations
  const handleBulkCategorize = async (transactionIds: string[], category: Category) => {
    const loadingToastId = addToast({
      type: 'loading',
      message: `Categorizing ${transactionIds.length} transactions...`,
      duration: 0
    });

    try {
      for (const id of transactionIds) {
        const transaction = transactions.find(t => t.id === id);
        if (transaction && isValidUUID(id)) {
          await dispatch(updateTransaction({
            id,
            updates: { category_name: category.name, category: category.name }
          })).unwrap();
        }
      }

      removeToast(loadingToastId);
      addToast({
        type: 'success',
        message: `${transactionIds.length} transactions categorized as ${category.name}`,
        duration: 3000
      });

      setSelectedTransactions(new Set());
    } catch (error) {
      removeToast(loadingToastId);
      addToast({
        type: 'error',
        message: 'Bulk categorization failed',
        duration: 3000
      });
    }
  };

  const handleBulkDelete = async (transactionIds: string[]) => {
    // Implementation would depend on your backend API
    console.log('Bulk delete:', transactionIds);
  };

  const handleExportSelected = (transactions: Transaction[]) => {
    const csvContent = [
      'Date,Description,Amount,Category',
      ...transactions.map(t =>
        `${new Date(t.transaction_date).toLocaleDateString()},"${t.description}",${t.amount},"${t.category_name || 'Uncategorized'}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `selected-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // AI suggestion handler
  const handleApplySuggestion = async (transactionIds: string[], category: Category) => {
    await handleBulkCategorize(transactionIds, category);
  };

  // AI batch categorization handler
  const handleAiBatchCategorize = async (categorizations: { transactionId: string; categoryName: string; confidence: number }[]) => {
    const loadingToastId = addToast({
      type: 'loading',
      message: `Applying ${categorizations.length} AI suggestions...`,
      duration: 0
    });

    try {
      for (const cat of categorizations) {
        const transaction = transactions.find(t => t.id === cat.transactionId);
        const category = categories.find(c => c.name === cat.categoryName);

        if (transaction && category && isValidUUID(cat.transactionId)) {
          await dispatch(updateTransaction({
            id: cat.transactionId,
            updates: { category_name: cat.categoryName, category: cat.categoryName }
          })).unwrap();
        }
      }

      removeToast(loadingToastId);
      addToast({
        type: 'success',
        message: `${categorizations.length} transactions categorized by AI`,
        duration: 3000
      });
    } catch (error) {
      removeToast(loadingToastId);
      addToast({
        type: 'error',
        message: 'AI categorization failed',
        duration: 3000
      });
    }
  };

  // Import categories handler
  const handleImportCategories = async (categorizations: { transactionId: string; categoryName: string }[]) => {
    // Implementation for importing categorization data
    console.log('Import categories:', categorizations);
  };

  // Undo/Redo handlers
  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastAction]);

    // Implement undo logic based on action type
    if (lastAction.action === 'category_change') {
      const { transactionId, oldCategory } = lastAction.data;
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction) {
        // Revert category change
        console.log('Undo category change:', transactionId, oldCategory);
      }
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const lastUndone = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, lastUndone]);

    // Implement redo logic
    console.log('Redo action:', lastUndone);
  };

  // Helper function
  const isValidUUID = (id: string): boolean => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(id);
  };

  // View tabs
  const viewTabs = [
    { id: 'table', label: 'Transactions', icon: '📋' },
    { id: 'transfers', label: 'Transfers', icon: '🔗' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'tools', label: 'Tools', icon: '🔧' }
  ];

  return (
    <Layout>
      <ToastProvider toasts={toasts} onRemove={removeToast} />

      <motion.div
        className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-2 md:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Enhanced Header */}
        <motion.div
          className="mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-2xl">🏷️</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Categorization
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Advanced tools for organizing your financial data
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                {/* View Tabs */}
                <div className="flex-grow flex justify-center w-full sm:w-auto">
                  <div className="flex w-full sm:w-auto overflow-x-auto no-scrollbar space-x-2 bg-slate-100 rounded-full p-1.5 border border-slate-200/80">
                    {viewTabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveView(tab.id as any)}
                        className={`relative flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-300 focus:outline-none whitespace-nowrap ${activeView === tab.id
                          ? 'text-slate-800'
                          : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        {activeView === tab.id && (
                          <motion.div
                            layoutId="active-tab-indicator-professional"
                            className="absolute inset-0 bg-white rounded-full shadow-sm"
                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                          />
                        )}
                        <div className="relative z-10 flex items-center justify-center">
                          <span className="mr-1.5 sm:mr-2">{tab.icon}</span>
                          <span>{tab.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push('/statements')}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl 
                             hover:bg-white/80 text-gray-700 font-medium text-xs sm:text-sm transition-all duration-200"
                  >
                    ← Statements
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl 
                             hover:from-green-600 hover:to-emerald-700 font-medium text-xs sm:text-sm transition-all duration-200"
                  >
                    📊 Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{filteredAndSortedTransactions.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Filtered</div>
              </div>
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {filteredAndSortedTransactions.filter(t => t.category_name && t.category_name !== 'Uncategorized').length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Categorized</div>
              </div>
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-600">
                  {filteredAndSortedTransactions.filter(t => !t.category_name || t.category_name === 'Uncategorized').length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">🏷️ Pending</div>
              </div>
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{selectedTransactions.size}</div>
                <div className="text-xs sm:text-sm text-gray-600">Selected</div>
              </div>
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-3 sm:p-4 text-center hidden sm:block">
                <div className="text-xl sm:text-2xl font-bold text-purple-600">{categories.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Categories</div>
              </div>
            </div>


          </div>
        </motion.div>

        {/* Advanced Filters */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-6"
        >
          <AdvancedFilters
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            transactions={transactions}
            activeView={activeView}
            setActiveView={setActiveView}
            viewTabs={viewTabs}
          />
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {activeView === 'table' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <EnhancedTable
                transactions={filteredAndSortedTransactions}
                categories={categories}
                currency={currency}
                selectedTransactions={selectedTransactions}
                onTransactionSelect={handleTransactionSelect}
                onCategoryChange={handleCategoryChange}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onTransferLinked={() => {
                  // Refresh transactions after linking
                  if (user?.id) {
                    dispatch(fetchTransactions({ userId: user.id }));
                  }
                }}
              />
            </motion.div>
          )}

          {activeView === 'transfers' && (
            <motion.div
              key="transfers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <TransferDetectionPanel
                transactions={filteredAndSortedTransactions}
                currency={currency}
                onTransferLinked={() => {
                  // Refresh transactions after linking
                  if (user?.id) {
                    dispatch(fetchTransactions({ userId: user.id }));
                  }
                }}
              />
            </motion.div>
          )}

          {activeView === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 text-center py-16"
            >
              <h2 className="text-2xl font-bold text-gray-700 mb-4">AI Insights</h2>
              <p className="text-gray-500">This feature is coming soon. Stay tuned for intelligent transaction analysis!</p>
            </motion.div>
          )}

          {activeView === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CategorizationVisualAnalytics
                transactions={filteredAndSortedTransactions}
                categories={categories}
                currency={currency}
              />
            </motion.div>
          )}

          {activeView === 'tools' && (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ExportImportTools
                transactions={filteredAndSortedTransactions}
                categories={categories}
                currency={currency}
                onImportCategories={handleImportCategories}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Operations (always visible when transactions selected) */}
        <BulkOperations
          selectedTransactions={selectedTransactions}
          allTransactions={filteredAndSortedTransactions}
          categories={categories}
          onBulkCategorize={handleBulkCategorize}
          onBulkDelete={handleBulkDelete}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onExportSelected={handleExportSelected}
        />
      </motion.div>
    </Layout >
  );
};

export default Categorize;
