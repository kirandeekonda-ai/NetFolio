/**
 * Dashboard V2 - Incremental New Features Development
 * Starting with a simple welcome message, we'll build this up feature by feature
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { IncomeExpenseCharts } from '@/components/IncomeExpenseCharts';
import { useRouter } from 'next/router';
import { useUser } from '@supabase/auth-helpers-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchTransactions } from '@/store/enhancedTransactionsSlice';

const DashboardV2: React.FC = () => {
  const router = useRouter();
  const user = useUser();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const { items: transactions, isLoading } = useSelector((state: RootState) => state.enhancedTransactions);

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
    if (user?.id && transactions.length === 0) {
      dispatch(fetchTransactions({ userId: user.id }));
    }
  }, [user?.id, dispatch, transactions.length]);

  // Handle date range changes
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // Get user's display name
  const displayName = user?.user_metadata?.full_name || 
                     user?.user_metadata?.name || 
                     user?.email?.split('@')[0] || 
                     'there';

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50/30 to-fuchsia-50/50">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-sm border-b border-gray-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <span className="mr-3">⚡</span>
                  Dashboard V2
                </h1>
                <p className="mt-1 text-gray-600">
                  Next-generation financial insights (Feature by Feature Development)
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                  Version 2.0
                </div>
                <div className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                  In Development
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Analysis Period Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8"
          >
            <Card className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">📊</span>
                    Analysis Period
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Select date range for financial data</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">From:</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => handleDateRangeChange('start', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">To:</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => handleDateRangeChange('end', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
              
              {/* Quick Period Selector */}
              <div className="mt-6 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600 font-medium">Quick Select:</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                      <motion.button
                        key={period.label}
                        onClick={() => {
                          const end = new Date();
                          const start = new Date();
                          start.setMonth(start.getMonth() - period.months);
                          handleDateRangeChange('start', start.toISOString().split('T')[0]);
                          handleDateRangeChange('end', end.toISOString().split('T')[0]);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                          ${isActive 
                            ? `bg-gradient-to-r ${period.gradient} text-white shadow-lg shadow-purple-500/25` 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300'
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
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center"
                          >
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Income vs Expense Charts */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <IncomeExpenseCharts 
              transactions={transactions}
              dateRange={dateRange}
              className="mb-8"
            />
          </motion.div>

          {/* Navigation Options */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8"
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🧭</span>
                Explore Other Dashboards
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="secondary"
                  className="flex items-center justify-center space-x-2 p-4 h-auto flex-col"
                >
                  <span className="text-2xl mb-1">📊</span>
                  <span className="font-medium">Classic Dashboard</span>
                  <span className="text-xs text-gray-500">Original version with full analytics</span>
                </Button>
                
                <Button
                  onClick={() => router.push('/dashboard-new')}
                  variant="secondary"
                  className="flex items-center justify-center space-x-2 p-4 h-auto flex-col"
                >
                  <span className="text-2xl mb-1">🚀</span>
                  <span className="font-medium">Modern Dashboard</span>
                  <span className="text-xs text-gray-500">Redesigned with new UX patterns</span>
                </Button>

                <Button
                  onClick={() => router.push('/landing')}
                  variant="secondary"
                  className="flex items-center justify-center space-x-2 p-4 h-auto flex-col"
                >
                  <span className="text-2xl mb-1">🏠</span>
                  <span className="font-medium">Home Dashboard</span>
                  <span className="text-xs text-gray-500">Main landing experience</span>
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Development Notes */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-8"
          >
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Development Philosophy
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Dashboard V2 is being built with an incremental approach. Each feature will be carefully 
                    designed, implemented, and tested before moving to the next. This ensures quality, 
                    maintainability, and allows for user feedback at each step.
                  </p>
                  <div className="mt-3 text-xs text-gray-600">
                    <strong>Next Feature:</strong> Enhanced spending visualization with interactive charts
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="mt-8 text-center text-gray-500 text-sm"
          >
            <p>🔧 Dashboard V2 • Built with modern React patterns • Designed for scalability</p>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardV2;
