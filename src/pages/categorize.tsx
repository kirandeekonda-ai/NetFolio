import { NextPage } from 'next';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { Table } from '@/components/Table';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ToastProvider, useToast } from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { updateTransaction, setTransactions } from '@/store/transactionsSlice';
import { setCategories } from '@/store/categoriesSlice';
import { Transaction, Category } from '@/types';
import { formatAmount } from '@/utils/currency';
import { getCategoryColorStyle } from '@/utils/categoryColors';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/utils/supabase';

const Categorize: NextPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useUser();
  const { toasts, addToast, removeToast, updateToast } = useToast();
  const transactions = useSelector((state: RootState) => state.transactions.items);
  const categories = useSelector((state: RootState) => state.categories.items);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
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

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

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
      .filter((transaction) =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [transactions, searchTerm]);

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
    
    // Update Redux store immediately for UI feedback
    dispatch(updateTransaction({
      ...transaction,
      category_name: category.name,
      category: category.name, // Keep legacy field in sync
    }));
    
    setOpenDropdown(null); // Close dropdown after selection
    
    // If it's a valid UUID (persisted transaction), save immediately to database
    if (isValidUUID(transaction.id)) {
      try {
        const loadingToastId = addToast({
          type: 'loading',
          message: 'Saving category...',
          duration: 0
        });

        const response = await fetch('/api/transactions/batch-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            updates: [{
              id: transaction.id,
              category_name: category.name,
              transaction_type: transaction.transaction_type
            }]
          }),
        });

        const result = await response.json();
        removeToast(loadingToastId);

        if (result.success) {
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
        } else {
          addToast({
            type: 'error',
            message: 'Failed to save category',
            duration: 3000
          });
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
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(openDropdown === item.id ? null : item.id);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-3 py-1 rounded-label text-sm transition-all duration-200 hover:shadow-sm ${
                isHighlighted 
                  ? 'bg-green-200 text-green-800 shadow-md scale-105' 
                  : `${style.bg} ${style.text}`
              }`}
              style={!isHighlighted ? style.style : undefined}
            >
              {categoryName === 'Uncategorized' ? 'Select Category' : categoryName}
              <motion.span
                className="ml-2 inline-block"
                animate={{ rotate: openDropdown === item.id ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ▼
              </motion.span>
            </motion.button>
            
            <AnimatePresence>
              {openDropdown === item.id && (
                <motion.div
                  initial={{ opacity: 0, y: isNearBottom ? 10 : -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: isNearBottom ? 10 : -10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                  style={{ 
                    minWidth: '200px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    right: '0',
                    ...(isNearBottom 
                      ? { bottom: '100%', marginBottom: '8px' } 
                      : { top: '100%', marginTop: '8px' }
                    )
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1">
                    {categories.map((category, index) => {
                      const categoryStyle = getCategoryColorStyle(category.name, categories);
                      const isSelected = category.name === value;
                      return (
                        <motion.button
                          key={category.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => handleCategoryChange(item, category)}
                          className={`w-full px-4 py-2 text-left text-sm transition-all duration-150 flex items-center justify-between hover:bg-gray-50 ${
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
              )}
            </AnimatePresence>
          </div>
        );
      },
      className: 'w-2/12',
    },
  ];

  return (
    <Layout>
      <ToastProvider toasts={toasts} onRemove={removeToast} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-heading font-bold">
              {currentStatement ? 'Categorize Statement Transactions' : 'Categorize Transactions'}
            </h1>
            {currentStatement && (
              <p className="text-sm text-gray-600 mt-1">
                {currentStatement.statement_month}/{currentStatement.statement_year} Statement
                {currentStatement.bank_account_id && ' • '}
                <span className="font-medium">
                  {filteredTransactions.length} transactions
                </span>
              </p>
            )}
          </div>
          <div className="flex space-x-4 items-center">
            <Button
              onClick={() => router.push('/statements')}
              variant="secondary"
              className="text-sm"
            >
              ← Back to Statements
            </Button>
            <Input
              type="search"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </div>

        {showNoTransactionsMessage && (
          <Card className="mb-6">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Statement Uploaded Successfully
              </h2>
              <p className="text-gray-600 mb-4">
                Your statement was uploaded but no transactions were extracted. This could happen if:
              </p>
              <ul className="text-left text-sm text-gray-600 max-w-md mx-auto space-y-1">
                <li>• The file format is not supported by the AI processor</li>
                <li>• The statement is empty or has no transaction data</li>
                <li>• The statement format is unclear or contains only images</li>
              </ul>
              <div className="mt-4">
                <button
                  onClick={() => setShowNoTransactionsMessage(false)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </Card>
        )}

        {filteredTransactions.length === 0 && !showNoTransactionsMessage ? (
          <Card>
            <div className="text-center p-8">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Transactions to Categorize
              </h2>
              <p className="text-gray-600 mb-6">
                Upload a bank statement to start categorizing transactions.
              </p>
              <button
                onClick={() => router.push('/statements')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Upload Statement
              </button>
            </div>
          </Card>
        ) : (
          <>
            <Card className="overflow-visible">
              <div className="overflow-x-auto">
                <Table
                  data={filteredTransactions}
                  columns={columns}
                />
              </div>
            </Card>

            <div className="mt-6 flex justify-between items-center">
              <p className="text-sm text-neutral-500">
                {filteredTransactions.length} transactions •{' '}
                {filteredTransactions.filter(t => t.category).length} categorized
              </p>
            </div>
          </>
        )}
      </motion.div>
    </Layout>
  );
};

export default Categorize;
