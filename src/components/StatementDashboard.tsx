import { FC, useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { BankAccount, BankStatement, StatementCompletion } from '@/types';
import { setTransactions } from '@/store/transactionsSlice';
import { Card } from './Card';
import { Button } from './Button';
import { BankLogo } from './BankLogo';
import { getBankEmoji, getBankLogoPath, getBankSpecificEmoji } from '@/utils/bankLogos';
import ModernDropdown from './ModernDropdown';

interface StatementDashboardProps {
  accounts: BankAccount[];
  onUploadStatement: (accountId: string, month?: number, year?: number) => void;
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

  const availableYears = [currentYear - 1, currentYear];

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

  // Enhanced remove statement handler - delegate to parent for confirmation
  const handleRemoveStatementWithUpdate = async (statementId: string) => {
    // Call the parent's remove handler which will show the custom confirmation dialog
    await onRemoveStatement(statementId);
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
        console.log('Transaction category fields debug:', transactions.map((t: any) => ({
          id: t.id,
          description: t.description,
          category_name: t.category_name,
          category: t.category
        })));

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
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12

    // Calculate total slots based on current date
    let totalSlots = 0;
    for (const account of activeAccounts) {
      if (selectedYear < currentYear) {
        // Previous years: count all 12 months
        totalSlots += 12;
      } else if (selectedYear === currentYear) {
        // Current year: only count months up to current month
        totalSlots += currentMonth;
      } else {
        // Future years: count 0 months (shouldn't happen in normal usage)
        totalSlots += 0;
      }
    }

    const completedSlots = statements.filter(stmt => stmt.processing_status === 'completed').length;

    return {
      total: totalSlots,
      completed: completedSlots,
      missing: totalSlots - statements.length,
      completion: totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0,
    };
  };

  const stats = getCompletionStats();

  // Show loading skeleton while fetching accounts to prevent flash of empty state  
  if (isLoading && accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-600">Loading statements...</p>
        </div>
      </div>
    );
  }

  if (activeAccounts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50">
        {/* Premium Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 mb-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
          <div className="relative px-6 py-12 sm:py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Statement Dashboard
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Monitor and manage your monthly statement uploads with intelligent processing status tracking
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="text-center py-16 bg-white/80 backdrop-blur-sm border-white/50 shadow-xl">
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-4xl text-white">🏦</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">No Active Bank Accounts</h3>
                <p className="text-lg text-slate-600 max-w-md mx-auto">
                  You need to add active bank accounts before managing statements. Get started by adding your first account.
                </p>
              </div>
              <Button
                onClick={() => window.location.href = '/bank-accounts'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Add Bank Account
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 mb-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative px-6 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Statement Dashboard
              {isRefreshing && (
                <div className="inline-block ml-4 animate-spin h-6 w-6 border-2 border-white/30 border-t-white rounded-full"></div>
              )}
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Monitor and manage your monthly statement uploads with intelligent processing status tracking
            </p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Pro Tips - Enhanced Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200/50 shadow-lg shadow-emerald-100/50 backdrop-blur-sm">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">💡</span>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-emerald-900 mb-3">Pro Tips for Efficient Statement Management</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-emerald-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>Click empty months for instant upload</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>Orange highlights show current month</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>Use filters for focused account views</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>Three dots menu for advanced actions</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Premium Filters Section with Modern Dropdowns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative z-20"
        >
          <Card className="bg-white/70 backdrop-blur-sm border-white/50 shadow-xl shadow-slate-900/5 relative z-20">
            <div className="flex flex-wrap gap-6 items-center">
              {/* Year Selector */}
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  📅 Select Year
                </label>
                <ModernDropdown
                  value={String(selectedYear)}
                  onChange={(value: string | number) => setSelectedYear(Number(value))}
                  options={availableYears.map(year => ({
                    value: year,
                    label: year,
                    description: `Financial data for ${year}`,
                    icon: '📅'
                  }))}
                  placeholder="Select Year"
                  className="w-full"
                />
              </div>

              {/* Account Selector */}
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  🏦 Filter Account
                </label>
                <ModernDropdown
                  value={selectedAccount}
                  onChange={(value: string | number) => setSelectedAccount(String(value))}
                  options={[
                    {
                      value: 'all',
                      label: 'All Accounts',
                      description: 'View all bank accounts',
                      icon: '🏦'
                    },
                    ...activeAccounts.map(account => ({
                      value: account.id,
                      label: account.account_nickname || account.bank_name,
                      description: `${account.bank_name}${account.account_number_last4 ? ` • ...${account.account_number_last4}` : ''}`,
                      icon: <BankLogo bankName={account.bank_name} accountType={account.account_type} size="sm" />
                    }))
                  ]}
                  placeholder="Select Account"
                  className="w-full"
                  searchable
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Premium Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl shadow-blue-500/25">
              <div className="text-center relative overflow-hidden">
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl mb-4">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stats.completion}%</div>
                  <div className="text-blue-100 font-medium">Completion Rate</div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-xl shadow-emerald-500/25">
              <div className="text-center relative overflow-hidden">
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl mb-4">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stats.completed}</div>
                  <div className="text-emerald-100 font-medium">Completed</div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-xl shadow-amber-500/25">
              <div className="text-center relative overflow-hidden">
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl mb-4">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stats.missing}</div>
                  <div className="text-amber-100 font-medium">Missing</div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Premium Statement Grid */}
        <div className="space-y-8">
          {(selectedAccount === 'all' ? activeAccounts : activeAccounts.filter(acc => acc.id === selectedAccount)).map((account, accountIndex) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + accountIndex * 0.1 }}
              className="group"
            >
              <Card className="bg-white/80 backdrop-blur-sm border-white/50 shadow-xl shadow-slate-900/5 hover:shadow-2xl hover:shadow-slate-900/10 transition-all duration-500 overflow-hidden">
                {/* Account Header */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-100 p-6 mb-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                    <div className="flex items-start md:items-center space-x-0 md:space-x-4">
                      {/* Bank Logo */}
                      <div className="hidden md:block">
                        <BankLogo
                          bankName={account.bank_name}
                          accountType={account.account_type}
                          size="lg"
                          className="shadow-md"
                        />
                      </div>
                      <div className="md:hidden mb-3">
                        <BankLogo
                          bankName={account.bank_name}
                          accountType={account.account_type}
                          size="md"
                          className="shadow-md"
                        />
                      </div>

                      {/* Account Details */}
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">
                          {account.account_nickname || account.bank_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                            </svg>
                            {account.bank_name}
                          </span>
                          <span className="hidden sm:inline text-slate-400">•</span>
                          <span className="capitalize">{account.account_type}</span>
                          {account.account_number_last4 && (
                            <>
                              <span className="hidden sm:inline text-slate-400">•</span>
                              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                ...{account.account_number_last4}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Decorative Account Icon - Hidden on mobile to save space and prevent overlap */}
                    <div className="hidden md:flex w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Monthly Statement Grid */}
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
                    {months.map((month, index) => {
                      const monthNumber = index + 1;
                      const statement = getStatementForMonth(account.id, monthNumber);
                      const isFuture = selectedYear === currentYear && monthNumber > currentMonth;
                      const isCurrent = selectedYear === currentYear && monthNumber === currentMonth;

                      const getMonthCardStyles = () => {
                        if (isDeleting === statement?.id) {
                          return 'border-red-300 bg-red-100/80 opacity-50 pointer-events-none';
                        }
                        if (isFuture) {
                          return 'border-slate-200 bg-slate-50/50 opacity-50';
                        }
                        if (statement) {
                          const statusStyles = {
                            completed: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 shadow-emerald-100/50',
                            processing: 'border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 shadow-blue-100/50',
                            failed: 'border-red-200 bg-gradient-to-br from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 shadow-red-100/50',
                            pending: 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 shadow-amber-100/50'
                          };
                          return statusStyles[statement.processing_status as keyof typeof statusStyles] || 'border-slate-200 bg-slate-50 hover:bg-slate-100';
                        }
                        if (isCurrent) {
                          return 'border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 cursor-pointer shadow-orange-100/50 ring-2 ring-orange-200/50';
                        }
                        return 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer hover:border-slate-300 hover:shadow-sm';
                      };

                      const getStatusIcon = (status?: string) => {
                        const iconMap = {
                          completed: { icon: '✅', color: 'text-emerald-600' },
                          processing: { icon: '⏳', color: 'text-blue-600' },
                          failed: { icon: '❌', color: 'text-red-600' },
                          pending: { icon: '⏳', color: 'text-amber-600' }
                        };
                        return iconMap[status as keyof typeof iconMap] || { icon: '📄', color: 'text-slate-600' };
                      };

                      const getStatusBadge = (status?: string) => {
                        const badgeMap = {
                          completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                          processing: 'bg-blue-100 text-blue-800 border-blue-200',
                          failed: 'bg-red-100 text-red-800 border-red-200',
                          pending: 'bg-amber-100 text-amber-800 border-amber-200'
                        };
                        return badgeMap[status as keyof typeof badgeMap] || 'bg-slate-100 text-slate-800 border-slate-200';
                      };

                      return (
                        <motion.div
                          key={month}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.7 + index * 0.02 }}
                          whileHover={{ scale: statement || !isFuture ? 1.05 : 1 }}
                          className={`relative p-4 border rounded-xl text-center transition-all duration-300 group/month shadow-sm ${getMonthCardStyles()}`}
                          onClick={() => {
                            if (!statement && !isFuture) {
                              onUploadStatement(account.id, monthNumber, selectedYear);
                            }
                          }}
                        >
                          <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                            {month}
                          </div>

                          {statement ? (
                            <div className="space-y-2">
                              <div className="text-2xl">
                                {getStatusIcon(statement.processing_status).icon}
                              </div>
                              <div className="flex justify-center mt-3 relative">
                                <button
                                  data-dropdown
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(openDropdown === statement.id ? null : statement.id);
                                  }}
                                  className="px-3 py-1.5 bg-white/80 text-slate-700 rounded-lg hover:bg-white transition-all duration-200 shadow-sm border border-slate-200 hover:border-slate-300 text-xs font-medium"
                                >
                                  ⋯
                                </button>
                                {openDropdown === statement.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                    data-dropdown
                                    className="absolute bottom-10 right-0 bg-white rounded-xl shadow-xl border border-slate-200 z-50 min-w-52 overflow-hidden"
                                    style={{ transformOrigin: 'bottom right' }}
                                  >
                                    <div className="py-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenDropdown(null);
                                          handleCategorizeStatement(statement.id);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                      >
                                        <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-xs">🏷️</span>
                                        <span className="font-medium">Categorize Transactions</span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenDropdown(null);
                                          onReuploadStatement(account.id, monthNumber, selectedYear, statement.id);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                      >
                                        <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-xs">🔄</span>
                                        <span className="font-medium">Reupload Statement</span>
                                      </button>
                                      <div className="border-t border-slate-100 my-2"></div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenDropdown(null);
                                          handleRemoveStatementWithUpdate(statement.id);
                                        }}
                                        disabled={isDeleting === statement.id}
                                        className={`w-full text-left px-4 py-3 text-sm hover:bg-red-50 flex items-center gap-3 transition-colors ${isDeleting === statement.id
                                          ? 'text-slate-400 cursor-not-allowed'
                                          : 'text-red-600'
                                          }`}
                                      >
                                        <span className={`w-6 h-6 ${isDeleting === statement.id ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-600'} rounded-lg flex items-center justify-center text-xs`}>
                                          {isDeleting === statement.id ? '⏳' : '🗑️'}
                                        </span>
                                        <span className="font-medium">{isDeleting === statement.id ? 'Deleting...' : 'Delete Statement'}</span>
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          ) : isFuture ? (
                            <div className="flex flex-col items-center space-y-2">
                              <div className="text-2xl opacity-40">📅</div>
                              <div className="text-xs text-slate-500 font-medium">Future</div>
                            </div>
                          ) : isCurrent ? (
                            <div className="flex flex-col items-center space-y-2">
                              <div className="text-2xl">📄</div>
                              <div className="text-xs text-orange-600 font-semibold bg-orange-100 px-2 py-1 rounded-md">Current</div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center space-y-2">
                              <div className="text-2xl text-slate-400 group-hover/month:text-slate-600 transition-colors">📄</div>
                              <div className="text-xs text-slate-500 font-medium">Click to upload</div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Premium Legend Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-200/50 shadow-xl shadow-indigo-100/50 backdrop-blur-sm">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mr-4">
                <span className="text-white text-lg">ℹ️</span>
              </div>
              <h4 className="text-xl font-bold text-slate-900">Statement Status Guide</h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Status Icons Section */}
              <div>
                <h5 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Status Indicators</h5>
                <div className="space-y-3">
                  <div className="flex items-center space-x-4 p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">✓</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Successfully Processed</div>
                      <div className="text-sm text-slate-600">Statement uploaded and analyzed</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">⏳</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Processing in Progress</div>
                      <div className="text-sm text-slate-600">Analysis in progress, please wait</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">✕</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Processing Failed</div>
                      <div className="text-sm text-slate-600">Requires attention or reupload</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <div className="w-10 h-10 bg-slate-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">📄</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Ready for Upload</div>
                      <div className="text-sm text-slate-600">Click to upload your statement</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div>
                <h5 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Available Actions</h5>
                <div className="space-y-3">
                  <div className="flex items-center space-x-4 p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-sm font-bold">🏷️</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Categorize Transactions</div>
                      <div className="text-sm text-slate-600">Organize and label transactions</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-sm font-bold">🔄</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Reupload Statement</div>
                      <div className="text-sm text-slate-600">Replace with updated version</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-sm font-bold">�️</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Delete Statement</div>
                      <div className="text-sm text-slate-600">Permanently remove statement</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
                      <span className="text-slate-600 text-lg">�</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Future Month</div>
                      <div className="text-sm text-slate-600">Not available for upload yet</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
});

StatementDashboard.displayName = 'StatementDashboard';
