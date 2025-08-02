import { FC, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';
import { ServiceLayerDemo } from './ServiceLayerDemo';
import { ConnectionStatus } from './ConnectionStatus';
import { RootState, AppDispatch } from '@/store';
import { formatAmount } from '@/utils/currency';
import { useRealtimeIntegration } from '@/hooks/useRealtimeIntegration';
import { fetchTransactions, refreshTransactions } from '@/store/enhancedTransactionsSlice';
import { LoggingService } from '@/services/logging/LoggingService';
import SimplifiedBalanceService from '@/services/SimplifiedBalanceService';

interface LandingDashboardProps {
  user: any;
  profile: any;
}

interface QuickActionButtonProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

interface StatsCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const QuickActionButton: FC<QuickActionButtonProps> = ({ title, description, icon, href, color }) => {
  const router = useRouter();
  
  const colorClasses = {
    blue: 'hover:border-blue-300 hover:bg-blue-50 group-hover:bg-blue-200 text-blue-500 group-hover:text-blue-600',
    green: 'hover:border-green-300 hover:bg-green-50 group-hover:bg-green-200 text-green-500 group-hover:text-green-600',
    purple: 'hover:border-purple-300 hover:bg-purple-50 group-hover:bg-purple-200 text-purple-500 group-hover:text-purple-600'
  };
  
  const bgClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100', 
    purple: 'bg-purple-100'
  };
  
  return (
    <button
      onClick={() => router.push(href)}
      className={`group p-6 rounded-lg border-2 border-gray-200 ${colorClasses[color as keyof typeof colorClasses]} transition-all duration-200 text-left w-full`}
    >
      <div className="flex items-center space-x-4">
        <div className={`flex-shrink-0 w-12 h-12 ${bgClasses[color as keyof typeof bgClasses]} rounded-lg flex items-center justify-center transition-colors`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-800">
            {title}
          </h3>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        <div className="flex-shrink-0">
          <span className="group-hover:text-current">→</span>
        </div>
      </div>
    </button>
  );
};

const StatsCard: FC<StatsCardProps> = ({ title, value, icon, color, trend }) => {
  const colorClasses = {
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
    blue: 'text-blue-600 bg-blue-100'
  };
  
  return (
    <Card className="p-6 bg-gradient-to-br from-white to-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses]?.split(' ')[0] || 'text-gray-600'}`}>{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className="mr-1">
                {trend.isPositive ? '↗' : '↘'}
              </span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]?.split(' ')[1] || 'bg-gray-100'}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </Card>
  );
};

export const LandingDashboard: FC<LandingDashboardProps> = ({ user }) => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  // Use enhanced Redux slice with real-time integration
  const { items: transactions, isLoading, error, realtimeConnected, lastUpdated } = useSelector((state: RootState) => state.enhancedTransactions);
  
  // Initialize real-time integration
  const realtimeIntegration = useRealtimeIntegration();
  
  // Local state for refresh functionality and balance data
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balanceData, setBalanceData] = useState<{
    totalBalance: number;
    isLoading: boolean;
    lastUpdated: string | null;
  }>({
    totalBalance: 0,
    isLoading: false,
    lastUpdated: null,
  });
  
  // Memoized calculations for better performance
  const financialMetrics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
    });

    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const monthlyExpenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netBalance = monthlyIncome - monthlyExpenses;
    const uncategorizedCount = transactions.filter(t => !t.category || t.category === 'Uncategorized').length;

    return {
      monthlyIncome,
      monthlyExpenses,
      netBalance,
      uncategorizedCount,
      totalTransactions: transactions.length,
    };
  }, [transactions]);

  // Enhanced balance fetching with BalanceService
  const fetchBalanceData = useCallback(async () => {
    if (!user?.id) return;
    
    setBalanceData(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await SimplifiedBalanceService.getNetWorth(user.id);
      setBalanceData({
        totalBalance: result.total_balance,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      LoggingService.error('LandingDashboard: Failed to fetch balance data', error as Error);
      setBalanceData(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id]);
  
  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      if (!user?.id) return;
      
      try {
        LoggingService.info('LandingDashboard: Initializing financial data');
        
        // Load both transactions and balance data
        const [transactionResult] = await Promise.allSettled([
          dispatch(fetchTransactions({ userId: user.id })).unwrap(),
          fetchBalanceData(),
        ]);
        
        if (transactionResult.status === 'fulfilled') {
          LoggingService.info('LandingDashboard: Successfully loaded data', { 
            transactionCount: transactions.length 
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        LoggingService.error('LandingDashboard: Failed to initialize data', error as Error);
        
        // Don't show error for empty results - this is normal for new users
        if (errorMessage.includes('column') || errorMessage.includes('does not exist')) {
          LoggingService.warn('LandingDashboard: Database schema issue, may need migration');
        }
      }
    };
    
    initializeData();
  }, [dispatch, user?.id, fetchBalanceData]);
  
  // Manual refresh functionality
  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    
    setIsRefreshing(true);
    try {
      LoggingService.info('LandingDashboard: Manual refresh triggered');
      dispatch(refreshTransactions());
      
      // Refresh both transactions and balance data
      await Promise.allSettled([
        dispatch(fetchTransactions({ userId: user.id })).unwrap(),
        fetchBalanceData(),
      ]);
    } catch (error) {
      LoggingService.error('LandingDashboard: Manual refresh failed', error as Error);
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, user?.id, fetchBalanceData]);

  // Enhanced balance refresh
  const handleBalanceRefresh = useCallback(async () => {
    if (!user?.id || balanceData.isLoading) return;
    await fetchBalanceData();
  }, [user?.id, balanceData.isLoading, fetchBalanceData]);

  // Get user's display name with fallback
  const displayName = useMemo(() => {
    return user.user_metadata?.full_name || 
           user.user_metadata?.name || 
           user.email?.split('@')[0] || 
           'there';
  }, [user]);

  const quickActions = [
    {
      title: 'Manage Accounts',
      description: 'Add or update your bank accounts',
      icon: '🏦',
      href: '/bank-accounts',
      color: 'green'
    },
    {
      title: 'Upload Statement',
      description: 'Import transactions from your bank',
      icon: '📄',
      href: '/statements',
      color: 'blue'
    },
    {
      title: 'Categorise Transactions',
      description: 'Organize your spending patterns',
      icon: '🏷️',
      href: '/categorize',
      color: 'purple'
    },
    {
      title: 'View Dashboard',
      description: 'See your financial insights',
      icon: '📊',
      href: '/dashboard',
      color: 'blue'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Premium Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        {/* Geometric Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <h1 className="text-6xl md:text-7xl font-light mb-4 tracking-tight">
                Welcome back,
                <span className="block font-semibold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  {displayName}
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 font-light mb-12 max-w-2xl mx-auto">
                Your financial insights, beautifully organized
              </p>
            </motion.div>
            
            {/* Status Indicator - Minimal and Elegant */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 border border-white/20"
            >
              <div className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></div>
              <span className="text-sm font-medium text-blue-50">
                {realtimeConnected ? 'Live' : 'Syncing'}
              </span>
              {lastUpdated && (
                <span className="text-xs text-blue-200 opacity-75">
                  {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </motion.div>
          </div>
        </div>
      </motion.section>

      <div className="relative -mt-20 z-10 max-w-7xl mx-auto px-6">
        
        {/* Premium Financial Overview */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-16"
        >
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20"
                >
                  <div className="animate-pulse">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl mb-6"></div>
                    <div className="h-6 bg-gray-200 rounded-lg w-1/2 mb-3"></div>
                    <div className="h-10 bg-gray-300 rounded-lg w-3/4"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Total Balance - Hero Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-1 relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 shadow-2xl text-white overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <span className="text-3xl">�</span>
                      </div>
                      <button
                        onClick={handleBalanceRefresh}
                        disabled={balanceData.isLoading}
                        className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
                      >
                        <span className={`text-lg ${balanceData.isLoading ? 'animate-spin' : ''}`}>↻</span>
                      </button>
                    </div>
                    <p className="text-emerald-100 text-sm font-medium mb-2 uppercase tracking-wider">Total Balance</p>
                    <p className="text-4xl font-light mb-2">
                      {balanceData.isLoading ? (
                        <span className="animate-pulse">Updating...</span>
                      ) : (
                        formatAmount(balanceData.totalBalance)
                      )}
                    </p>
                    <p className="text-emerald-200 text-sm opacity-75">Your financial foundation</p>
                  </div>
                </div>
              </motion.div>

              {/* Monthly Net - Elegant Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl"></div>
                <div className="relative bg-white rounded-3xl p-8 shadow-xl border border-gray-100/50 overflow-hidden">
                  <div className={`absolute top-0 right-0 w-full h-1 bg-gradient-to-r ${
                    financialMetrics.netBalance >= 0 
                      ? 'from-emerald-400 to-teal-500' 
                      : 'from-red-400 to-pink-500'
                  }`}></div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      financialMetrics.netBalance >= 0 
                        ? 'bg-gradient-to-br from-emerald-100 to-teal-100' 
                        : 'bg-gradient-to-br from-red-100 to-pink-100'
                    }`}>
                      <span className="text-3xl">{financialMetrics.netBalance >= 0 ? '📈' : '📉'}</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm font-medium mb-2 uppercase tracking-wider">This Month</p>
                  <p className={`text-4xl font-light mb-2 ${
                    financialMetrics.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {financialMetrics.netBalance >= 0 ? '+' : ''}{formatAmount(financialMetrics.netBalance)}
                  </p>
                  <p className="text-gray-400 text-sm">Net cash flow</p>
                </div>
              </motion.div>

              {/* Transactions Overview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl"></div>
                <div className="relative bg-white rounded-3xl p-8 shadow-xl border border-gray-100/50">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                      <span className="text-3xl">📊</span>
                    </div>
                    {financialMetrics.uncategorizedCount > 0 && (
                      <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                        {financialMetrics.uncategorizedCount} pending
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm font-medium mb-2 uppercase tracking-wider">Transactions</p>
                  <p className="text-4xl font-light text-blue-600 mb-2">
                    {financialMetrics.totalTransactions}
                  </p>
                  <p className="text-gray-400 text-sm">Total recorded</p>
                </div>
              </motion.div>
            </div>
          )}
        </motion.section>

        {/* World-Class Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-4xl font-light text-gray-900 mb-4"
            >
              What would you like to do?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-lg text-gray-600 max-w-2xl mx-auto"
            >
              Take control of your financial journey with these powerful tools
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.8 + (index * 0.1), duration: 0.6 }}
                className="group relative h-full"
              >
                {/* Beautiful Glow Effect */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ${
                  action.color === 'green' ? 'bg-emerald-200' :
                  action.color === 'blue' ? 'bg-blue-200' :
                  'bg-purple-200'
                }`}></div>
                
                <button
                  onClick={() => router.push(action.href)}
                  className="relative w-full h-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group-hover:border-gray-200 flex flex-col"
                >
                  {/* Icon Container - Fixed Size */}
                  <div className="flex justify-center mb-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                      action.color === 'green' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                      action.color === 'blue' ? 'bg-gradient-to-br from-blue-400 to-indigo-500' :
                      'bg-gradient-to-br from-purple-400 to-pink-500'
                    }`}>
                      <span className="text-2xl text-white">{action.icon}</span>
                    </div>
                  </div>
                  
                  {/* Content Container - Consistent Spacing */}
                  <div className="flex-1 flex flex-col justify-between text-center">
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg leading-tight">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed h-10 overflow-hidden">
                        {action.description}
                      </p>
                    </div>
                    
                    {/* Arrow - Always at Bottom */}
                    <div className="flex justify-center">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <span className="text-gray-400 group-hover:text-gray-600 transition-colors text-sm">→</span>
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Minimal Critical Notifications Only */}
        {(error || financialMetrics.uncategorizedCount > 5) && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
            className="mb-16"
          >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-amber-400 rounded-full mr-3 animate-pulse"></span>
                Needs Attention
              </h3>
              
              <div className="space-y-4">
                {error && (
                  <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-red-600">⚠️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-red-900 font-medium">Connection Issue</p>
                      <p className="text-red-700 text-sm">Unable to sync latest data</p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleRefresh}
                      className="bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Retry
                    </Button>
                  </div>
                )}
                
                {financialMetrics.uncategorizedCount > 5 && (
                  <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-amber-600">📝</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-amber-900 font-medium">Categorization Pending</p>
                      <p className="text-amber-700 text-sm">
                        {financialMetrics.uncategorizedCount} transactions need organizing
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push('/categorize')}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      Organize
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* Clean Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          className="text-center"
        >
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center space-x-3 mx-auto bg-white shadow-lg"
          >
            <span className={`${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </Button>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-3">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};
