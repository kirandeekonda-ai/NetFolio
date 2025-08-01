import { NextPage } from 'next';
import { useMemo, useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchTransactions } from '@/store/enhancedTransactionsSlice';
import { Transaction } from '@/types';
import { formatAmount } from '@/utils/currency';
import { useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useRealtimeIntegration } from '@/hooks/useRealtimeIntegration';
import { LoggingService } from '@/services/logging/LoggingService';
import { EnhancedAnalytics } from '@/components/EnhancedAnalytics';
import { DateRange } from '@/components/EnhancedAnalytics/types/analytics.types';
import { balanceService } from '@/services/BalanceService';
import SimplifiedBalanceService, { NetWorthSummary } from '@/services/SimplifiedBalanceService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0',
  '#ffb347', '#87ceeb', '#dda0dd', '#98fb98', '#f0e68c', '#ff6347'
];

const Dashboard: NextPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const user = useUser();

  const {
    items: transactions,
    isLoading: loading,
    error,
    lastUpdated: lastFetch
  } = useSelector((state: RootState) => state.enhancedTransactions);

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // State for bank account balances
  const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Setup real-time integration
  useRealtimeIntegration();

  useEffect(() => {
    if (user) {
      dispatch(fetchTransactions({ userId: user.id }));
      // Fetch actual bank account balances
      fetchNetWorth();
    }
  }, [dispatch, user]);

  const fetchNetWorth = async () => {
    if (!user) return;
    
    setBalanceLoading(true);
    setBalanceError(null);
    
    try {
      console.log('🔍 Fetching net worth with Simplified Balance Service...');
      const netWorthData = await SimplifiedBalanceService.getNetWorth(user.id);
      setNetWorth(netWorthData);
      console.log('✅ Net worth updated:', netWorthData);
    } catch (error) {
      console.error('❌ Error fetching net worth:', error);
      setBalanceError('Failed to load account balances');
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleRefresh = () => {
    if (!loading && user) {
      LoggingService.info('Dashboard: Manual refresh triggered');
      dispatch(fetchTransactions({ userId: user.id }));
    }
  };

  const handleDebugLog = () => {
    LoggingService.debug('Dashboard State:', {
      transactionCount: transactions?.length || 0,
      dateRange,
      loading,
      error,
      lastFetch
    });
    if (!user) return;
  };

  // Early return if user is not authenticated
  if (!user) return;

  const {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    categoryData,
    monthlyData,
    filteredTransactionsCount,
  } = useMemo(() => {
    // Add null check for transactions
    if (!transactions || !Array.isArray(transactions)) {
      return {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        categoryData: [],
        monthlyData: [],
        filteredTransactionsCount: 0,
      };
    }

    // Use the selected date range instead of current month
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // Filter transactions for the selected date range
    const filteredTransactions = transactions.filter((transaction: Transaction) => {
      const transactionDate = new Date(transaction.transaction_date || transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Calculate totals for selected date range
    const income = filteredTransactions
      .filter((t: Transaction) => (t.transaction_type || t.type) === 'income')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const expenses = filteredTransactions
      .filter((t: Transaction) => (t.transaction_type || t.type) === 'expense')
      .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

    // Category breakdown using enhanced transaction data
    const categoryTotals = filteredTransactions
      .filter((t: Transaction) => (t.transaction_type || t.type) === 'expense')
      .reduce((acc: Record<string, number>, t: Transaction) => {
        const category = t.category_name || t.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);

    // Monthly trend data for the current year (based on end date)
    const currentYear = endDate.getFullYear();
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthTransactions = transactions.filter((transaction: Transaction) => {
        const date = new Date(transaction.transaction_date || transaction.date);
        return date.getMonth() === i && date.getFullYear() === currentYear;
      });

      const monthIncome = monthTransactions
        .filter((t: Transaction) => (t.transaction_type || t.type) === 'income')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      const monthExpenses = monthTransactions
        .filter((t: Transaction) => (t.transaction_type || t.type) === 'expense')
        .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

      return {
        name: new Date(currentYear, i).toLocaleString('default', { month: 'short' }),
        income: monthIncome,
        expenses: monthExpenses,
      };
    });

    return {
      totalBalance: netWorth?.total_balance || 0, // Use actual bank account balances
      monthlyIncome: income,
      monthlyExpenses: expenses,
      categoryData,
      monthlyData,
      filteredTransactionsCount: filteredTransactions.length,
    };
  }, [transactions, dateRange, netWorth]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Financial Dashboard
                </h1>
                <p className="mt-2 text-gray-600">
                  Track your financial health and spending patterns
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <ConnectionStatus />
                {lastFetch && (
                  <div className="text-sm text-gray-500">
                    Updated {new Date(lastFetch).toLocaleTimeString()}
                  </div>
                )}
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="secondary"
                  className="text-sm"
                >
                  {loading ? 'Syncing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

          {/* Date Range Filter */}
          <Card className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h3 className="font-medium text-gray-900">Analysis Period</h3>
                <p className="text-sm text-gray-600">Select date range for financial data</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Quick Period Selector */}
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">Quick Select:</p>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: '1M', icon: '🌱', months: 1, gradient: 'from-green-400 to-green-600', desc: 'Recent Activity' },
                  { label: '3M', icon: '🌿', months: 3, gradient: 'from-blue-400 to-blue-600', desc: 'Quarterly Trends' },
                  { label: '6M', icon: '🌳', months: 6, gradient: 'from-purple-400 to-purple-600', desc: 'Mid-term Patterns' },
                  { label: '1Y', icon: '🌲', months: 12, gradient: 'from-orange-400 to-orange-600', desc: 'Annual Overview' }
                ].map((period) => {
                  const isActive = (() => {
                    const diffInMs = new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime();
                    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
                    const expectedDays = period.months * 30; // Approximate
                    return Math.abs(diffInDays - expectedDays) < 10; // Within 10 days tolerance
                  })();
                  
                  return (
                    <button
                      key={period.label}
                      onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setMonth(start.getMonth() - period.months);
                        handleDateRangeChange('start', start.toISOString().split('T')[0]);
                        handleDateRangeChange('end', end.toISOString().split('T')[0]);
                      }}
                      className={`
                        relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105 transform
                        ${isActive 
                          ? `bg-gradient-to-r ${period.gradient} text-white shadow-lg` 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                        }
                      `}
                    >
                      <span className="text-xl">{period.icon}</span>
                      <div className="text-left">
                        <div className={`font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                          {period.label}
                        </div>
                        <div className={`text-xs ${isActive ? 'text-white/90' : 'text-gray-500'}`}>
                          {period.desc}
                        </div>
                      </div>
                      {isActive && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Error Handling */}
          {error && (
            <Card className="p-6 bg-red-50 border-l-4 border-red-400">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-xl text-red-600">⚠️</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-1">Unable to Load Financial Data</h3>
                  <p className="text-red-700 text-sm mb-3">{error}</p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Empty State */}
          {transactions && transactions.length === 0 && !loading && !error && (
            <Card className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-4xl">💼</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Welcome to Your Financial Journey
              </h3>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                Your dashboard is ready to track your financial health. Start by uploading bank statements 
                or adding transactions to see personalized insights and analytics.
              </p>
              <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Button
                  onClick={() => router.push('/statements')}
                  className="bg-blue-600 text-white px-6 py-3"
                >
                  Upload Statements
                </Button>
                <Button
                  onClick={() => router.push('/categorize')}
                  variant="secondary"
                  className="px-6 py-3"
                >
                  Categorize Transactions
                </Button>
              </div>
            </Card>
          )}

          {/* No Data in Date Range State */}
          {transactions && transactions.length > 0 && filteredTransactionsCount === 0 && !loading && !error && (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Transactions in Selected Date Range
              </h3>
              <p className="text-gray-600 mb-6">
                There are no transactions for the selected date range. Try adjusting your date filter 
                or selecting a different time period to view your financial data.
              </p>
              <Button
                onClick={() => setDateRange({
                  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                  end: new Date().toISOString().split('T')[0]
                })}
                className="bg-amber-600 text-white px-6 py-3"
              >
                Reset to Current Month
              </Button>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl animate-pulse">⚡</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Analyzing Your Financial Data
              </h2>
              <p className="text-gray-600">
                Processing transactions and calculating insights...
              </p>
            </Card>
          )}

          {/* Show dashboard content when filtered transactions are available */}
          {transactions && transactions.length > 0 && filteredTransactionsCount > 0 && !loading && !error && (
            <>
              {/* Summary Cards - Compact Design */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Total Balance Card */}
                <Card className="p-4 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <span className="text-blue-600">💰</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Net Worth
                      </div>
                      <button 
                        onClick={fetchNetWorth}
                        disabled={balanceLoading}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        title="Refresh balances"
                      >
                        {balanceLoading ? '🔄' : '↻'}
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">
                    Total Balance
                  </h3>
                  {balanceLoading ? (
                    <div className="text-2xl font-bold text-gray-400 mb-2">
                      Loading...
                    </div>
                  ) : balanceError ? (
                    <div className="text-2xl font-bold text-red-500 mb-2">
                      Error
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      {formatAmount(totalBalance)}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${totalBalance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {totalBalance >= 0 ? 'Positive' : 'Negative'}
                    </span>
                    {netWorth && (
                      <div className="text-xs text-gray-500">
                        {netWorth.account_count} account{netWorth.account_count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  {netWorth?.last_updated && (
                    <div className="text-xs text-gray-400 mt-2">
                      Updated: {new Date(netWorth.last_updated).toLocaleDateString()}
                    </div>
                  )}
                  {netWorth?.latest_statement_month && netWorth.latest_statement_month !== 'No statements' && (
                    <div className="text-xs text-blue-600 mt-1 font-medium">
                      Latest Statement: {netWorth.latest_statement_month}
                    </div>
                  )}
                </Card>

                {/* Income Card */}
                <Card className="p-4 border-l-4 border-green-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <span className="text-green-600">📈</span>
                    </div>
                    <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      Selected Period
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">
                    Total Income
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {formatAmount(monthlyIncome)}
                  </p>
                  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                    Revenue
                  </span>
                </Card>

                {/* Expenses Card */}
                <Card className="p-4 border-l-4 border-red-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-1.5 bg-red-100 rounded-lg">
                      <span className="text-red-600">📉</span>
                    </div>
                    <div className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                      Selected Period
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">
                    Total Expenses
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {formatAmount(monthlyExpenses)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                      Spending
                    </span>
                    {monthlyIncome > 0 && (
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                        {((monthlyExpenses / monthlyIncome) * 100).toFixed(0)}% of income
                      </span>
                    )}
                  </div>
                </Card>
              </div>

              {/* Enhanced Charts & Analytics Section */}
              <div className="mt-6">
                <EnhancedAnalytics 
                  transactions={transactions || []}
                  dateRange={dateRange}
                  onDateRangeChange={(newDateRange: DateRange) => setDateRange(newDateRange)}
                />
              </div>
            </>
          )}
        
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
