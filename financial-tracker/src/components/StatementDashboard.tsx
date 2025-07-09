import { FC, useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { BankAccount, BankStatement, StatementCompletion } from '@/types';
import { setTransactions } from '@/store/transactionsSlice';
import { Card } from './Card';
import { Button } from './Button';

interface StatementDashboardProps {
  accounts: BankAccount[];
  onUploadStatement: (accountId: string, month?: number, year?: number) => void;
  onViewStatement: (statement: BankStatement) => void;
  onRemoveStatement: (statementId: string) => void;
  onReuploadStatement: (accountId: string, month: number, year: number, existingStatementId: string) => void;
  isLoading?: boolean;
}

export interface StatementDashboardRef {
  refreshStatements: () => Promise<void>;
}

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'completed':
      return '✅';
    case 'processing':
      return '⏳';
    case 'failed':
      return '❌';
    case 'pending':
      return '⏳';
    default:
      return '📄';
  }
};

export const StatementDashboard = forwardRef<StatementDashboardRef, StatementDashboardProps>(({
  accounts,
  onUploadStatement,
  onViewStatement,
  onRemoveStatement,
  onReuploadStatement,
  isLoading = false,
}, ref) => {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [statementCompletion, setStatementCompletion] = useState<StatementCompletion[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const router = useRouter();
  const dispatch = useDispatch();

  const activeAccounts = accounts.filter(acc => acc.is_active);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const availableYears = [currentYear - 1, currentYear, currentYear + 1];

  useEffect(() => {
    fetchStatements();
  }, [selectedYear, selectedAccount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if the click is outside any dropdown
      if (openDropdown && !target.closest('[data-dropdown]')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const fetchStatements = async () => {
    try {
      setIsRefreshing(true);
      const params = new URLSearchParams({
        year: selectedYear.toString(),
      });

      if (selectedAccount !== 'all') {
        params.append('account_id', selectedAccount);
      }

      const response = await fetch(`/api/bank-statements?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setStatements(data.statements || []);
      } else {
        console.error('Failed to fetch statements');
      }
    } catch (error) {
      console.error('Error fetching statements:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshStatements: fetchStatements
  }));

  // Enhanced remove statement handler with immediate UI updates
  const handleRemoveStatementWithUpdate = async (statementId: string) => {
    if (!confirm('Are you sure you want to remove this statement? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(statementId);
      
      // Optimistically remove from UI first
      setStatements(prev => prev.filter(stmt => stmt.id !== statementId));
      
      // Call the parent's remove handler
      await onRemoveStatement(statementId);
      
      // Refresh data to ensure consistency
      await fetchStatements();
    } catch (error) {
      console.error('Error removing statement:', error);
      // Revert the optimistic update on error
      await fetchStatements();
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle categorizing transactions for a specific statement
  const handleCategorizeStatement = async (statementId: string) => {
    console.log('Categorize button clicked for statement:', statementId);
    try {
      // Fetch transactions for this specific statement
      const response = await fetch(`/api/transactions/by-statement/${statementId}`);
      
      if (response.ok) {
        const data = await response.json();
        const transactions = data.transactions || [];
        
        console.log('Fetched transactions:', transactions.length);
        
        if (transactions.length === 0) {
          alert('No transactions found for this statement.');
          return;
        }
        
        // Store transactions in Redux store
        dispatch(setTransactions(transactions));
        
        // Navigate to categorize page with statement context
        router.push(`/categorize?statement=${statementId}`);
      } else {
        const error = await response.json();
        console.error('Failed to fetch transactions:', error);
        alert('Failed to load transactions for categorization.');
      }
    } catch (error) {
      console.error('Error fetching transactions for categorization:', error);
      alert('Error loading transactions for categorization.');
    }
  };

  const getAccountStatements = (accountId: string) => {
    return statements.filter(stmt => stmt.bank_account_id === accountId);
  };

  const getStatementForMonth = (accountId: string, month: number) => {
    return statements.find(stmt => 
      stmt.bank_account_id === accountId && 
      stmt.statement_month === month && 
      stmt.statement_year === selectedYear
    );
  };

  const getCompletionStats = () => {
    const totalSlots = activeAccounts.length * 12;
    const completedSlots = statements.filter(stmt => stmt.processing_status === 'completed').length;
    const pendingSlots = statements.filter(stmt => stmt.processing_status === 'pending').length;
    const failedSlots = statements.filter(stmt => stmt.processing_status === 'failed').length;

    return {
      total: totalSlots,
      completed: completedSlots,
      pending: pendingSlots,
      failed: failedSlots,
      missing: totalSlots - statements.length,
      completion: totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0,
    };
  };

  const stats = getCompletionStats();

  if (activeAccounts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏦</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Bank Accounts</h3>
        <p className="text-gray-600 mb-6">
          You need to add active bank accounts before managing statements
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            Statement Dashboard
            {isRefreshing && (
              <div className="ml-3 animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            )}
          </h2>
          <p className="text-gray-600">
            Track your monthly statement uploads and processing status
          </p>
        </div>
        <Button 
          onClick={() => onUploadStatement(selectedAccount !== 'all' ? selectedAccount : activeAccounts[0].id, currentMonth, selectedYear)}
          disabled={isLoading || isRefreshing}
        >
          {isLoading ? 'Loading...' : 'Upload Statement'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Accounts</option>
              {activeAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_nickname || `${account.bank_name} ${account.account_type}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.completion}%</div>
            <div className="text-sm text-gray-600">Completion</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.missing}</div>
            <div className="text-sm text-gray-600">Missing</div>
          </div>
        </Card>
      </div>

      {/* Statement Grid */}
      <div className="space-y-6">
        {(selectedAccount === 'all' ? activeAccounts : activeAccounts.filter(acc => acc.id === selectedAccount)).map((account) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {account.account_nickname || `${account.bank_name} ${account.account_type}`}
                </h3>
                <p className="text-sm text-gray-600">
                  {account.bank_name} • {account.account_type}
                  {account.account_number_last4 && ` • ...${account.account_number_last4}`}
                </p>
              </div>

              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {months.map((month, index) => {
                  const monthNumber = index + 1;
                  const statement = getStatementForMonth(account.id, monthNumber);
                  const isFuture = selectedYear === currentYear && monthNumber > currentMonth;
                  const isCurrent = selectedYear === currentYear && monthNumber === currentMonth;

                  return (
                    <div
                      key={month}
                      className={`relative p-3 border rounded-lg text-center transition-all duration-200 ${
                        isDeleting === statement?.id
                          ? 'border-red-300 bg-red-100 opacity-50 pointer-events-none'
                          : isFuture 
                          ? 'border-gray-200 bg-gray-50 opacity-50' 
                          : statement 
                          ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' 
                          : isCurrent
                          ? 'border-orange-200 bg-orange-50 hover:bg-orange-100 cursor-pointer'
                          : 'border-gray-200 bg-white hover:bg-gray-50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!statement && !isFuture) {
                          onUploadStatement(account.id, monthNumber, selectedYear);
                        }
                      }}
                    >
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        {month}
                      </div>
                      
                      {statement ? (
                        <div className="space-y-1">
                          <div className="text-lg">
                            {getStatusIcon(statement.processing_status)}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded ${getStatusColor(statement.processing_status)}`}>
                            {statement.processing_status}
                          </div>
                          <div className="flex justify-center mt-2 relative">
                            <button
                              data-dropdown
                              onClick={(e) => {
                                console.log('Three dots clicked for statement:', statement.id);
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === statement.id ? null : statement.id);
                              }}
                              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                              title="Actions"
                            >
                              ⋯
                            </button>
                            {openDropdown === statement.id && (
                              <div 
                                data-dropdown
                                className="absolute top-8 right-0 bg-white rounded-lg shadow-lg border z-50 min-w-48"
                              >
                                <div className="py-1">
                                  <button
                                    onClick={(e) => {
                                      console.log('View Statement clicked for:', statement.id);
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                      onViewStatement(statement);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <span className="text-blue-500">👁️</span>
                                    View Statement
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      console.log('Categorize Transactions clicked');
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                      handleCategorizeStatement(statement.id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <span className="text-green-500">🏷️</span>
                                    Categorize Transactions
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                      onReuploadStatement(account.id, monthNumber, selectedYear, statement.id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <span className="text-yellow-500">🔄</span>
                                    Reupload Statement
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                      handleRemoveStatementWithUpdate(statement.id);
                                    }}
                                    disabled={isDeleting === statement.id}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 ${
                                      isDeleting === statement.id 
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    <span>{isDeleting === statement.id ? '⏳' : '🗑️'}</span>
                                    {isDeleting === statement.id ? 'Deleting...' : 'Delete Statement'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : isFuture ? (
                        <div className="text-lg opacity-50">📅</div>
                      ) : isCurrent ? (
                        <div className="text-lg">📄</div>
                      ) : (
                        <div className="text-lg text-gray-400">📄</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center mb-4">
          <span className="text-xl mr-2">ℹ️</span>
          <h4 className="font-semibold text-gray-900">Statement Status Guide</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Icons Section */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Status Icons</h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                <span className="text-xl">✅</span>
                <span className="text-sm text-gray-700">Statement processed successfully</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                <span className="text-xl">⏳</span>
                <span className="text-sm text-gray-700">Processing or pending upload</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                <span className="text-xl">❌</span>
                <span className="text-sm text-gray-700">Processing failed - needs attention</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                <span className="text-xl">📄</span>
                <span className="text-sm text-gray-700">No statement uploaded (click to upload)</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                <span className="text-xl opacity-50">📅</span>
                <span className="text-sm text-gray-700">Future month (not available yet)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Available Actions</h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded font-medium">👁️</span>
                <span className="text-sm text-gray-700">View statement details and transactions</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                <span className="text-xs px-2 py-1 bg-green-500 text-white rounded font-medium">🏷️</span>
                <span className="text-sm text-gray-700">Categorize transactions for this statement</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                <span className="text-xs px-2 py-1 bg-yellow-500 text-white rounded font-medium">🔄</span>
                <span className="text-sm text-gray-700">Reupload or replace existing statement</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                <span className="text-xs px-2 py-1 bg-red-500 text-white rounded font-medium">🗑️</span>
                <span className="text-sm text-gray-700">Permanently remove statement</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">💡</span>
            <div className="text-sm text-blue-800">
              <strong>Pro Tips:</strong> Click on empty months to quickly upload statements. 
              Orange highlighted months indicate the current month. 
              Use filters above to focus on specific accounts or years.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

StatementDashboard.displayName = 'StatementDashboard';
