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
import { IncomeExpenseCategories } from '@/components/IncomeExpenseCategories';
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
  const [activeChartTab, setActiveChartTab] = useState<'overview' | 'insights' | 'analytics'>('overview');

  // Date Range State - Default to last complete month
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Get previous complete month
    const lastCompleteMonth = currentMonth - 1;
    const lastCompleteYear = lastCompleteMonth < 0 ? currentYear - 1 : currentYear;
    const adjustedLastMonth = lastCompleteMonth < 0 ? 11 : lastCompleteMonth;

    // First day of last complete month
    const start = new Date(lastCompleteYear, adjustedLastMonth, 1);
    // Last day of last complete month
    const end = new Date(lastCompleteYear, adjustedLastMonth + 1, 0);

    // Format dates properly to avoid timezone issues
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatDate(start),
      end: formatDate(end)
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

  // Enhanced Quick Period Calculator - Uses complete months
  const calculateCompleteMonthsRange = (monthsBack: number) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // For 1M: Show previous complete month (e.g., if August, show July 1-31)
    // For 3M: Show 3 previous complete months (e.g., if August, show May 1 - July 31)

    // Calculate the last complete month (previous month)
    const lastCompleteMonth = currentMonth - 1;
    const lastCompleteYear = lastCompleteMonth < 0 ? currentYear - 1 : currentYear;
    const adjustedLastMonth = lastCompleteMonth < 0 ? 11 : lastCompleteMonth;

    // Calculate start month (monthsBack months before the last complete month)
    const startMonthIndex = adjustedLastMonth - monthsBack + 1;
    let startYear = lastCompleteYear;
    let startMonth = startMonthIndex;

    // Handle year boundary crossing
    if (startMonth < 0) {
      startYear -= 1;
      startMonth = 12 + startMonth;
    }

    // Start of first month in range (1st day)
    const start = new Date(startYear, startMonth, 1);

    // End of last complete month (last day)
    const end = new Date(lastCompleteYear, adjustedLastMonth + 1, 0);

    // Format dates properly to avoid timezone issues
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatDate(start),
      end: formatDate(end),
      monthsIncluded: getMonthsInRange(start, end)
    };
  };

  // Helper to get month names in range
  const getMonthsInRange = (startDate: Date, endDate: Date) => {
    const months = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      months.push(current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
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

              {/* Enhanced Quick Period Selector - Header */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">Quick Periods</div>
                  <div className="text-xs text-gray-500">Complete month ranges</div>
                </div>
                <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-2 shadow-sm border">
                  {[
                    {
                      label: '1M',
                      icon: '🌱',
                      months: 1,
                      gradient: 'from-emerald-400 to-emerald-600',
                      desc: 'Last Month',
                      tooltip: 'Previous complete month'
                    },
                    {
                      label: '3M',
                      icon: '🌿',
                      months: 3,
                      gradient: 'from-blue-400 to-blue-600',
                      desc: 'Quarter',
                      tooltip: 'Last 3 complete months'
                    },
                    {
                      label: '6M',
                      icon: '🌳',
                      months: 6,
                      gradient: 'from-purple-400 to-purple-600',
                      desc: 'Half Year',
                      tooltip: 'Last 6 complete months'
                    },
                    {
                      label: '1Y',
                      icon: '🌲',
                      months: 12,
                      gradient: 'from-amber-400 to-amber-600',
                      desc: 'Annual',
                      tooltip: 'Last 12 complete months'
                    }
                  ].map((period) => {
                    // Calculate the range for this period
                    const periodRange = calculateCompleteMonthsRange(period.months);

                    // Check if this period is currently active
                    const isActive = (() => {
                      return dateRange.start === periodRange.start && dateRange.end === periodRange.end;
                    })();

                    return (
                      <div key={period.label} className="relative group">
                        <motion.button
                          onClick={() => {
                            const range = calculateCompleteMonthsRange(period.months);
                            setDateRange({
                              start: range.start,
                              end: range.end
                            });
                          }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className={`
                            relative flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 group shadow-sm border-2
                            ${isActive
                              ? `bg-gradient-to-br ${period.gradient} text-white shadow-lg border-transparent transform scale-105`
                              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-md'
                            }
                          `}
                          title={period.tooltip}
                        >
                          <span className={`text-lg mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                            {period.icon}
                          </span>
                          <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-700'}`}>
                            {period.label}
                          </span>

                          {/* Active indicator */}
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                            >
                              <span className="text-xs text-white">✓</span>
                            </motion.div>
                          )}
                        </motion.button>

                        {/* Enhanced Tooltip */}
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          whileHover={{ opacity: 1, y: 0, scale: 1 }}
                          className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
                        >
                          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap">
                            <div className="font-medium">{period.desc}</div>
                            <div className="text-gray-300">
                              {(() => {
                                const range = calculateCompleteMonthsRange(period.months);
                                return range.monthsIncluded.length > 2
                                  ? `${range.monthsIncluded[0]} - ${range.monthsIncluded[range.monthsIncluded.length - 1]}`
                                  : range.monthsIncluded.join(', ');
                              })()}
                            </div>
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">


          {/* Enhanced Date Range Filter */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                  <span>📅</span>
                  <span>Analysis Period</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Viewing complete months for accurate financial insights
                </p>

                {/* Period Summary */}
                <div className="mt-3 flex items-center space-x-4">
                  <div className="bg-white px-3 py-1 rounded-full border shadow-sm">
                    <span className="text-xs font-medium text-gray-700">
                      {(() => {
                        const start = new Date(dateRange.start);
                        const end = new Date(dateRange.end);
                        const startMonth = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                        const endMonth = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                        if (startMonth === endMonth) {
                          return `${startMonth} Only`;
                        } else {
                          return `${startMonth} → ${endMonth}`;
                        }
                      })()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {(() => {
                      const start = new Date(dateRange.start);
                      const end = new Date(dateRange.end);
                      const diffInMs = end.getTime() - start.getTime();
                      const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
                      return `${diffInDays} days of data`;
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
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
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeChartTab === 'overview'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>📂</span>
                    <span>Overview</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveChartTab('insights')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeChartTab === 'insights'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>🎯</span>
                    <span>Insights</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveChartTab('analytics')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeChartTab === 'analytics'
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
                <IncomeExpenseCategories
                  transactions={transactions}
                  dateRange={dateRange}
                />
              ) : activeChartTab === 'insights' ? (
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
