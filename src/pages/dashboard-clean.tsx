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
    transactions, 
    loading, 
    error, 
    lastFetch 
  } = useSelector((state: RootState) => state.enhancedTransactions);

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Setup real-time integration
  useRealtimeIntegration();

  useEffect(() => {
    if (user) {
      dispatch(fetchTransactions({ userId: user.id }));
    }
  }, [dispatch, user]);

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
      transactionCount: transactions.length,
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
  } = useMemo(() => {
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
      .map(([name, value]) => ({ name, value }))
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
      totalBalance: transactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0),
      monthlyIncome: income,
      monthlyExpenses: expenses,
      categoryData,
      monthlyData,
    };
  }, [transactions, dateRange]);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100"
      >
        {/* Enhanced Header Section */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <span className="text-2xl text-white">📊</span>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                    Financial Dashboard
                  </h1>
                  <p className="text-sm text-gray-600">
                    Track your financial health at a glance
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <ConnectionStatus compact={true} />
                {lastFetch && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span>Last updated: {new Date(lastFetch).toLocaleTimeString()}</span>
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleDebugLog}
                    variant="secondary"
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border-0"
                  >
                    🐛 Debug
                  </Button>
                  <Button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg transition-all duration-200"
                  >
                    {loading ? (
                      <span className="flex items-center space-x-2">
                        <span className="animate-spin">⚡</span>
                        <span>Syncing...</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-2">
                        <span>🔄</span>
                        <span>Refresh</span>
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

          {/* Enhanced Date Range Filter */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-6 bg-gradient-to-r from-white to-blue-50 border border-blue-200 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-blue-600">📅</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Date Range Filter</h3>
                    <p className="text-sm text-gray-600">Select period to analyze your finances</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">From:</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => handleDateRangeChange('start', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">To:</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => handleDateRangeChange('end', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Enhanced Error Handling */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 mb-1">Unable to Load Financial Data</h3>
                    <p className="text-red-700 text-sm mb-3">{error}</p>
                    <Button
                      onClick={() => window.location.reload()}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
                    >
                      <span className="flex items-center space-x-2">
                        <span>🔄</span>
                        <span>Try Again</span>
                      </span>
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Enhanced Empty State */}
          {transactions.length === 0 && !loading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 shadow-lg">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-inner">
                  <span className="text-5xl">💼</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Welcome to Your Financial Journey
                </h3>
                <p className="text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
                  Your dashboard is ready to track your financial health. Start by uploading bank statements 
                  or adding transactions to see personalized insights and analytics.
                </p>
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-6">
                  <Button
                    onClick={() => router.push('/statements')}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <span className="flex items-center space-x-3">
                      <span className="text-lg">📄</span>
                      <span className="font-semibold">Upload Statements</span>
                    </span>
                  </Button>
                  <Button
                    onClick={() => router.push('/categorize')}
                    variant="secondary"
                    className="px-8 py-4 rounded-xl border-2 border-gray-300 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <span className="flex items-center space-x-3">
                      <span className="text-lg">🏷️</span>
                      <span className="font-semibold">Categorize Transactions</span>
                    </span>
                  </Button>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Need help getting started? <a href="#" className="text-blue-600 hover:underline">View documentation</a>
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Enhanced Loading State */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-12 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-lg">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl text-white animate-pulse">⚡</span>
                </div>
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-gray-900">
                    Analyzing Your Financial Data
                  </h2>
                  <p className="text-gray-600">
                    Processing transactions and calculating insights...
                  </p>
                  <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Show dashboard content when transactions are available */}
          {transactions.length > 0 && !loading && !error && (
            <>
              {/* Enhanced Summary Cards */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                {/* Total Balance Card */}
                <motion.div
                  whileHover={{ scale: 1.02, rotateY: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="relative p-6 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-indigo-300/30 rounded-full transform translate-x-16 -translate-y-16"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500 rounded-xl shadow-md">
                          <span className="text-xl text-white">💰</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                            Net Worth
                          </div>
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-blue-700 mb-1 uppercase tracking-wide">
                        Total Balance
                      </h3>
                      <p className="text-3xl font-bold text-blue-900 mb-2">
                        {formatAmount(totalBalance)}
                      </p>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${totalBalance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {totalBalance >= 0 ? '↗️ Positive' : '↘️ Negative'}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Income Card */}
                <motion.div
                  whileHover={{ scale: 1.02, rotateY: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="relative p-6 bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-300/30 rounded-full transform translate-x-16 -translate-y-16"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500 rounded-xl shadow-md">
                          <span className="text-xl text-white">📈</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            Selected Period
                          </div>
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-green-700 mb-1 uppercase tracking-wide">
                        Total Income
                      </h3>
                      <p className="text-3xl font-bold text-green-900 mb-2">
                        {formatAmount(monthlyIncome)}
                      </p>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
                          💡 Revenue Stream
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Expenses Card */}
                <motion.div
                  whileHover={{ scale: 1.02, rotateY: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="relative p-6 bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 border border-red-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-200/30 to-pink-300/30 rounded-full transform translate-x-16 -translate-y-16"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-500 rounded-xl shadow-md">
                          <span className="text-xl text-white">📉</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                            Selected Period
                          </div>
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-red-700 mb-1 uppercase tracking-wide">
                        Total Expenses
                      </h3>
                      <p className="text-3xl font-bold text-red-900 mb-2">
                        {formatAmount(monthlyExpenses)}
                      </p>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                          🛒 Spending
                        </span>
                        {monthlyIncome > 0 && (
                          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {((monthlyExpenses / monthlyIncome) * 100).toFixed(0)}% of income
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Charts and Quick Actions sections... */}
              <div className="text-center p-8 bg-blue-50 rounded-xl">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">🚧 Enhanced Charts & Analytics</h2>
                <p className="text-gray-600 mb-4">Advanced visualizations and insights coming soon!</p>
                <div className="flex justify-center space-x-4">
                  <Button onClick={() => router.push('/statements')} className="bg-blue-600 text-white">
                    📄 Upload Statements
                  </Button>
                  <Button onClick={() => router.push('/categorize')} variant="secondary">
                    🏷️ Categorize Transactions
                  </Button>
                </div>
              </div>
            </>
          )}
        
        </div>
      </motion.div>
    </Layout>
  );
};

export default Dashboard;
