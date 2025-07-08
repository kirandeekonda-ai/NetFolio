import { FC, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BankAccount, BankStatement, StatementCompletion } from '@/types';
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

export const StatementDashboard: FC<StatementDashboardProps> = ({
  accounts,
  onUploadStatement,
  onViewStatement,
  onRemoveStatement,
  onReuploadStatement,
  isLoading = false,
}) => {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [statementCompletion, setStatementCompletion] = useState<StatementCompletion[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  const activeAccounts = accounts.filter(acc => acc.is_active);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const availableYears = [currentYear - 1, currentYear, currentYear + 1];

  useEffect(() => {
    fetchStatements();
  }, [selectedYear, selectedAccount]);

  const fetchStatements = async () => {
    try {
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
          <h2 className="text-2xl font-bold text-gray-900">Statement Dashboard</h2>
          <p className="text-gray-600">
            Track your monthly statement uploads and processing status
          </p>
        </div>
        <Button 
          onClick={() => onUploadStatement(selectedAccount !== 'all' ? selectedAccount : activeAccounts[0].id, currentMonth, selectedYear)}
          disabled={isLoading}
        >
          Upload Statement
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
                        isFuture 
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
                          <div className="flex justify-center space-x-1 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewStatement(statement);
                              }}
                              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              title="View Statement"
                            >
                              👁️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReuploadStatement(account.id, monthNumber, selectedYear, statement.id);
                              }}
                              className="text-xs px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                              title="Reupload Statement"
                            >
                              🔄
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to remove this statement? This action cannot be undone.')) {
                                  onRemoveStatement(statement.id);
                                }
                              }}
                              className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                              title="Remove Statement"
                            >
                              🗑️
                            </button>
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
      <Card>
        <h4 className="font-semibold text-gray-900 mb-3">Legend</h4>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-lg">✅</span>
              <span>Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">⏳</span>
              <span>Processing/Pending</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">❌</span>
              <span>Failed</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">📄</span>
              <span>Missing (click to upload)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg opacity-50">📅</span>
              <span>Future month</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded">👁️</span>
              <span>View statement details</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2 py-1 bg-yellow-500 text-white rounded">🔄</span>
              <span>Reupload statement</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2 py-1 bg-red-500 text-white rounded">🗑️</span>
              <span>Remove statement</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
