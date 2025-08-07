/**
 * Main Financial Dashboard - Enhanced with Modern Charts and Analytics
 * Primary dashboard with improved styling and comprehensive financial insights
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { IncomeExpenseCharts } from '@/components/IncomeExpenseCharts';
import { SpendingAnalytics } from '@/components/SpendingAnalytics';
import { useRouter } from 'next/router';
import { useUser } from '@supabase/auth-helpers-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchTransactions } from '@/store/enhancedTransactionsSlice';
import { NextPage } from 'next';

const Dashboard: NextPage = () => {
  const router = useRouter();
  const user = useUser();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const { items: transactions, isLoading: loading, error } = useSelector((state: RootState) => state.enhancedTransactions);

  // Chart tab state
  const [activeChartTab, setActiveChartTab] = useState<'overview' | 'analytics'>('overview');

  // Date Range State
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1); // Default to 1 month
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  // Fetch transactions when user is available
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchTransactions({ userId: user.id }));
    }
  }, [user?.id, dispatch]);

  // Handle date range changes
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const displayName = user?.user_metadata?.full_name || 
                     user?.user_metadata?.name || 
                     user?.email?.split('@')[0] || 
                     'there';

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
              
              {/* Quick Period Selector - Header */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500">Quick Period:</span>
                <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
                  {[
                    { label: '1M', icon: '🌱', months: 1, gradient: 'from-green-400 to-green-600', desc: 'Recent' },
                    { label: '3M', icon: '🌿', months: 3, gradient: 'from-blue-400 to-blue-600', desc: 'Quarter' },
                    { label: '6M', icon: '🌳', months: 6, gradient: 'from-purple-400 to-purple-600', desc: 'Half Year' },
                    { label: '1Y', icon: '🌲', months: 12, gradient: 'from-orange-400 to-orange-600', desc: 'Annual' }
                  ].map((period) => {
                    const isActive = (() => {
                      const diffInMs = new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime();
                      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
                      const expectedDays = period.months * 30;
                      return Math.abs(diffInDays - expectedDays) < 10;
                    })();
                    
                    return (
                      <motion.button
                        key={period.label}
                        onClick={() => {
                          const end = new Date();
                          const start = new Date();
                          start.setMonth(start.getMonth() - period.months);
                          handleDateRangeChange('start', start.toISOString().split('T')[0]);
                          handleDateRangeChange('end', end.toISOString().split('T')[0]);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          relative flex items-center justify-center w-14 h-14 rounded-lg transition-all duration-200 group shadow-sm
                          ${isActive 
                            ? `bg-gradient-to-r ${period.gradient} text-white shadow-lg border-2 border-transparent` 
                            : 'bg-white hover:shadow-md text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                          }
                        `}
                        title={`${period.desc} - ${period.label}`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-lg mb-0.5">{period.icon}</span>
                          <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-700'}`}>
                            {period.label}
                          </span>
                        </div>
                        {isActive && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
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
          </Card>

          {/* Error Handling */}
          {error && (
            <Card className="p-6 bg-red-50 border-l-4 border-red-400">
              <div className="flex items-center">
                <span className="text-red-400 mr-3">⚠️</span>
                <div>
                  <h3 className="font-semibold text-red-800">Unable to Load Financial Data</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Analytics Hub */}
          <Card className="p-6">
            {/* Header with Tabs */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-gray-900">Financial Analytics</h3>
              
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveChartTab('overview')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeChartTab === 'overview'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>🍩</span>
                    <span>Overview</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveChartTab('analytics')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeChartTab === 'analytics'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>Analytics</span>
                  </span>
                </button>
              </div>
            </div>
            
            {/* Chart Content */}
            <div className="min-h-[400px]">
              {activeChartTab === 'overview' ? (
                <IncomeExpenseCharts 
                  transactions={transactions}
                  dateRange={dateRange}
                />
              ) : (
                <SpendingAnalytics 
                  transactions={transactions}
                  dateRange={dateRange}
                />
              )}
            </div>
          </Card>

          {transactions.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Card className="p-12 max-w-2xl mx-auto">
                <div className="text-6xl mb-6">💼</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome to Your Financial Dashboard
                </h3>
                <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                  Get started by uploading your bank statements to unlock powerful insights about your spending patterns, 
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
            className="mt-8 text-center text-gray-500 text-sm"
          >
            <p>🔧 Enhanced Dashboard • Built with modern React patterns • Financial insights at your fingertips</p>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
