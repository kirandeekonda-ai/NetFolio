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
import { balanceService } from '@/services/BalanceService';

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
      const result = await balanceService.getNetWorth(user.id);
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header with Real-Time Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {displayName}! 👋
        </h1>
        <p className="text-xl text-gray-600 mb-4">
          Here's your financial overview
        </p>
        
        {/* Connection Status and Refresh */}
        <div className="flex items-center justify-center space-x-4 mt-4">
          <ConnectionStatus />
          
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center space-x-2"
          >
            <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          {/* Balance Refresh Button */}
          <Button
            variant="secondary"
            onClick={handleBalanceRefresh}
            disabled={balanceData.isLoading}
            className="flex items-center space-x-2 bg-green-50 text-green-700 hover:bg-green-100"
          >
            <span className={balanceData.isLoading ? 'animate-pulse' : ''}>🏦</span>
            <span>{balanceData.isLoading ? 'Updating...' : 'Update Balances'}</span>
          </Button>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="text-sm">
              ⚠️ {error.includes('column') || error.includes('does not exist') 
                    ? 'Database connection issue. Please try refreshing the page.' 
                    : `Unable to load financial data: ${error}`}
            </p>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              className="mt-2 text-xs"
            >
              Try Again
            </Button>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <QuickActionButton
                key={action.title}
                {...action}
              />
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Snapshot Cards with Loading States */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {isLoading ? (
          // Loading skeletons
          <>
            {[...Array(3)].map((_, index) => (
              <Card key={index} className="p-6 bg-gradient-to-br from-white to-gray-50">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              </Card>
            ))}
          </>
        ) : (
          // Actual data cards
          <>
            <StatsCard
              title="Total Balance"
              value={balanceData.isLoading ? "Loading..." : formatAmount(balanceData.totalBalance)}
              icon="🏦"
              color="blue"
              trend={{
                value: balanceData.lastUpdated ? "Updated" : "Real-time",
                isPositive: true
              }}
            />
            <StatsCard
              title="This Month's Spending"
              value={formatAmount(financialMetrics.monthlyExpenses)}
              icon="�"
              color="red"
              trend={{
                value: `${new Date().toLocaleDateString('en-US', { month: 'long' })}`,
                isPositive: false
              }}
            />
            <StatsCard
              title="Total Transactions"
              value={transactions.length.toString()}
              icon="📊"
              color="green"
              trend={{
                value: `${financialMetrics.uncategorizedCount} uncategorized`,
                isPositive: financialMetrics.uncategorizedCount === 0
              }}
            />
          </>
        )}
      </motion.div>

      {/* Notifications Panel with Enhanced States */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">🔔</span>
            Notifications
          </h2>
          
          <div className="space-y-4">
            {/* Balance update notification */}
            {balanceData.lastUpdated && (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h3 className="font-semibold text-green-800">
                      Balance Data Updated
                    </h3>
                    <p className="text-green-700">
                      Account balances refreshed at {new Date(balanceData.lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span className="text-green-600 font-semibold">
                  {formatAmount(balanceData.totalBalance)}
                </span>
              </div>
            )}

            {/* Loading state notification */}
            {isLoading && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin text-2xl">⏳</div>
                  <div>
                    <h3 className="font-semibold text-blue-800">
                      Loading Financial Data
                    </h3>
                    <p className="text-blue-700">
                      Fetching your latest transactions and calculations...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Connection status notification */}
            {!isLoading && !realtimeConnected && (
              <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📶</span>
                  <div>
                    <h3 className="font-semibold text-orange-800">
                      Real-time Updates Unavailable
                    </h3>
                    <p className="text-orange-700">
                      Data may not reflect the latest changes. Try refreshing.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleRefresh}
                  className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                >
                  Refresh Now
                </Button>
              </div>
            )}

            {!isLoading && financialMetrics.uncategorizedCount > 0 && (
              <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-semibold text-yellow-800">
                      Uncategorized Transactions
                    </h3>
                    <p className="text-yellow-700">
                      You have {financialMetrics.uncategorizedCount} transactions that need categorizing
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/categorize')}
                  className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                >
                  Categorize Now
                </Button>
              </div>
            )}

            {!isLoading && transactions.length === 0 && !error && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="font-semibold text-blue-800">
                      Get Started
                    </h3>
                    <p className="text-blue-700">
                      Upload your first bank statement to begin tracking
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push('/statements')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Upload Statement
                </Button>
              </div>
            )}

            {!isLoading && financialMetrics.uncategorizedCount === 0 && transactions.length > 0 && realtimeConnected && (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <h3 className="font-semibold text-green-800">
                      All Systems Active!
                    </h3>
                    <p className="text-green-700">
                      Real-time sync active, all transactions categorized
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Recent Activity Preview with Loading States */}
      {(transactions.length > 0 || isLoading) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <span className="mr-3">📝</span>
                Recent Activity
                {realtimeConnected && (
                  <span className="ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ⚡ Live
                  </span>
                )}
              </h2>
              <Button
                variant="secondary"
                onClick={() => router.push('/dashboard')}
                disabled={isLoading}
              >
                View All
              </Button>
            </div>
            
            <div className="space-y-3">
              {isLoading ? (
                // Loading skeletons for transactions
                <>
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-12"></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                transactions.slice(0, 5).map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-600">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatAmount(Math.abs(transaction.amount))}
                      </p>
                      <p className="text-sm text-gray-500">{transaction.category || 'Uncategorized'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Service Layer Demo - Show new infrastructure */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <ServiceLayerDemo />
      </motion.div>
    </div>
  );
};
