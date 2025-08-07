/**
 * Modern NetFolio Dashboard - Redesigned for Clear Budgeting & Insights
 * Emphasizes "Where Your Money Goes" with enhanced visual hierarchy
 */

import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { SpendingBreakdown } from '@/components/SpendingBreakdown';
import { IncomeVsSpending } from '@/components/IncomeVsSpending';
import { AIInsights } from '@/components/AIInsights';
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
import SimplifiedBalanceService, { NetWorthSummary } from '@/services/SimplifiedBalanceService';

interface QuickMetric {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: string;
  color: string;
}

const ModernDashboard: React.FC = () => {
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

  // Setup real-time integration
  useRealtimeIntegration();

  useEffect(() => {
    if (user) {
      dispatch(fetchTransactions({ userId: user.id }));
      fetchNetWorth();
    }
  }, [dispatch, user]);

  const fetchNetWorth = async () => {
    if (!user) return;
    
    setBalanceLoading(true);
    try {
      const netWorthData = await SimplifiedBalanceService.getNetWorth(user.id);
      setNetWorth(netWorthData);
    } catch (error) {
      LoggingService.error('Modern Dashboard: Error fetching net worth', error as Error);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Enhanced financial calculations
  const financialMetrics = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) {
      return {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        netCashFlow: 0,
        categoryData: [],
        totalTransactions: 0,
        uncategorizedCount: 0,
        topSpendingCategory: null,
        savingsRate: 0,
        spendingTrend: 'neutral' as 'positive' | 'negative' | 'neutral'
      };
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    const filteredTransactions = transactions.filter((transaction: Transaction) => {
      const transactionDate = new Date(transaction.transaction_date || transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    const monthlyIncome = filteredTransactions
      .filter((t: Transaction) => (t.transaction_type || t.type) === 'income')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const monthlyExpenses = filteredTransactions
      .filter((t: Transaction) => (t.transaction_type || t.type) === 'expense')
      .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

    const netCashFlow = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (netCashFlow / monthlyIncome) * 100 : 0;

    // Category breakdown
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

    const topSpendingCategory = categoryData.length > 0 ? categoryData[0] : null;
    const uncategorizedCount = filteredTransactions.filter(t => !t.category && !t.category_name).length;

    // Calculate spending trend (compare current month to previous month)
    const currentMonth = new Date();
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    
    const currentMonthExpenses = transactions
      .filter((t: Transaction) => {
        const tDate = new Date(t.transaction_date || t.date);
        return tDate.getMonth() === currentMonth.getMonth() && 
               tDate.getFullYear() === currentMonth.getFullYear() &&
               (t.transaction_type || t.type) === 'expense';
      })
      .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

    const previousMonthExpenses = transactions
      .filter((t: Transaction) => {
        const tDate = new Date(t.transaction_date || t.date);
        return tDate.getMonth() === previousMonth.getMonth() && 
               tDate.getFullYear() === previousMonth.getFullYear() &&
               (t.transaction_type || t.type) === 'expense';
      })
      .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

    let spendingTrend: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (previousMonthExpenses > 0) {
      const changePercent = ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100;
      if (changePercent > 10) spendingTrend = 'negative';
      else if (changePercent < -10) spendingTrend = 'positive';
    }

    return {
      totalBalance: netWorth?.total_balance || 0,
      monthlyIncome,
      monthlyExpenses,
      netCashFlow,
      categoryData,
      totalTransactions: filteredTransactions.length,
      uncategorizedCount,
      topSpendingCategory,
      savingsRate,
      spendingTrend
    };
  }, [transactions, dateRange, netWorth]);

  // Quick metrics for dashboard hero section
  const quickMetrics = useMemo(() => {
    const metrics: QuickMetric[] = [
      {
        title: 'Total Balance',
        value: formatAmount(financialMetrics.totalBalance),
        icon: '💰',
        color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
        change: balanceLoading ? 'Loading...' : undefined
      },
      {
        title: 'Monthly Net',
        value: formatAmount(financialMetrics.netCashFlow),
        icon: financialMetrics.netCashFlow >= 0 ? '📈' : '📉',
        color: financialMetrics.netCashFlow >= 0 
          ? 'bg-gradient-to-br from-green-500 to-emerald-600'
          : 'bg-gradient-to-br from-red-500 to-pink-600',
        change: `${financialMetrics.savingsRate.toFixed(1)}% savings rate`,
        changeType: financialMetrics.netCashFlow >= 0 ? 'positive' : 'negative'
      },
      {
        title: 'Top Category',
        value: financialMetrics.topSpendingCategory ? formatAmount(financialMetrics.topSpendingCategory.value) : 'N/A',
        icon: '🥧',
        color: 'bg-gradient-to-br from-purple-500 to-indigo-600',
        change: financialMetrics.topSpendingCategory?.name || 'No data'
      },
      {
        title: 'Transactions',
        value: financialMetrics.totalTransactions.toString(),
        icon: '📝',
        color: 'bg-gradient-to-br from-blue-500 to-cyan-600',
        change: financialMetrics.uncategorizedCount > 0 
          ? `${financialMetrics.uncategorizedCount} uncategorized`
          : 'All categorized',
        changeType: financialMetrics.uncategorizedCount > 0 ? 'negative' : 'positive'
      }
    ];

    return metrics;
  }, [financialMetrics, balanceLoading]);

  const handleRefresh = () => {
    if (!loading && user) {
      LoggingService.info('Modern Dashboard: Manual refresh triggered');
      dispatch(fetchTransactions({ userId: user.id }));
      fetchNetWorth();
    }
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <span className="mr-3">🚀</span>
                  Modern Financial Dashboard
                </h1>
                <p className="mt-1 text-gray-600">
                  Clear budgeting insights with AI-powered recommendations
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <ConnectionStatus />
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="secondary"
                  className="flex items-center space-x-2"
                >
                  <span className={loading ? 'animate-spin' : ''}>🔄</span>
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            {/* Date Range Selector */}
            <div className="mt-4 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">To:</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="p-4 bg-red-50 border-l-4 border-red-400">
                <div className="flex items-center">
                  <span className="text-red-400 mr-3">⚠️</span>
                  <div>
                    <h3 className="font-semibold text-red-800">Unable to Load Financial Data</h3>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Quick Metrics Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickMetrics.map((metric, index) => (
                <motion.div
                  key={metric.title}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group"
                >
                  <Card className="p-6 hover:shadow-lg transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm hover:bg-white/90">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${metric.color} flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform duration-300`}>
                        {metric.icon}
                      </div>
                      {metric.changeType && (
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          metric.changeType === 'positive' ? 'bg-green-100 text-green-700' :
                          metric.changeType === 'negative' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {metric.changeType === 'positive' ? '↗' : metric.changeType === 'negative' ? '↘' : '→'}
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">{metric.title}</h3>
                    <p className="text-2xl font-bold text-gray-900 mb-2">{metric.value}</p>
                    {metric.change && (
                      <p className="text-xs text-gray-500">{metric.change}</p>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {transactions && transactions.length > 0 ? (
            <>
              {/* Primary Focus: Income vs Spending */}
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-8"
              >
                <IncomeVsSpending
                  monthlyIncome={financialMetrics.monthlyIncome}
                  monthlyExpenses={financialMetrics.monthlyExpenses}
                />
              </motion.section>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Spending Breakdown - Takes 2 columns */}
                <div className="lg:col-span-2">
                  <SpendingBreakdown
                    categoryData={financialMetrics.categoryData}
                    totalExpenses={financialMetrics.monthlyExpenses}
                  />
                </div>

                {/* AI Insights - Takes 1 column */}
                <div className="lg:col-span-1">
                  <AIInsights
                    transactions={transactions}
                    monthlyIncome={financialMetrics.monthlyIncome}
                    monthlyExpenses={financialMetrics.monthlyExpenses}
                    categoryData={financialMetrics.categoryData}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mb-8"
              >
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Button
                      onClick={() => router.push('/statements')}
                      className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <span>📄</span>
                      <span>Upload Statements</span>
                    </Button>
                    <Button
                      onClick={() => router.push('/categorize')}
                      className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700"
                    >
                      <span>🏷️</span>
                      <span>Categorize</span>
                    </Button>
                    <Button
                      onClick={() => router.push('/bank-accounts')}
                      className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700"
                    >
                      <span>🏦</span>
                      <span>Manage Accounts</span>
                    </Button>
                    <Button
                      onClick={() => router.push('/dashboard')}
                      variant="secondary"
                      className="flex items-center justify-center space-x-2"
                    >
                      <span>📊</span>
                      <span>Classic Dashboard</span>
                    </Button>
                  </div>
                </Card>
              </motion.section>
            </>
          ) : (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-12 text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🚀</span>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Welcome to Your Modern Dashboard
                </h3>
                <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                  Get started by uploading your bank statements to see powerful insights about where your money goes, 
                  AI-driven recommendations, and clear visualizations of your financial health.
                </p>
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <Button
                    onClick={() => router.push('/statements')}
                    className="bg-blue-600 text-white px-8 py-3 flex items-center justify-center space-x-2"
                  >
                    <span>📄</span>
                    <span>Upload Your First Statement</span>
                  </Button>
                  <Button
                    onClick={() => router.push('/bank-accounts')}
                    variant="secondary"
                    className="px-8 py-3 flex items-center justify-center space-x-2"
                  >
                    <span>🏦</span>
                    <span>Add Bank Account</span>
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-gray-500 text-sm"
          >
            <p>
              {lastFetch && `Last updated: ${new Date(lastFetch).toLocaleString()}`}
            </p>
            <p className="mt-1">
              🔒 Your data stays private and secure on your device
            </p>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default ModernDashboard;
