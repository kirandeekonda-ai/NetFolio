import { FC } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';
import { RootState } from '@/store';
import { formatAmount } from '@/utils/currency';

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

export const LandingDashboard: FC<LandingDashboardProps> = ({ user, profile }) => {
  const router = useRouter();
  const transactions = useSelector((state: RootState) => state.transactions.items);

  // Calculate metrics from transactions
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

  // Get user's display name
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'there';

  const quickActions = [
    {
      title: 'Upload Statement',
      description: 'Import transactions from your bank',
      icon: '📄',
      href: '/upload',
      color: 'blue'
    },
    {
      title: 'Categorise Transactions',
      description: 'Organize your spending patterns',
      icon: '🏷️',
      href: '/categorize',
      color: 'green'
    },
    {
      title: 'View Dashboard',
      description: 'See your financial insights',
      icon: '📊',
      href: '/dashboard',
      color: 'purple'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {displayName}! 👋
        </h1>
        <p className="text-xl text-gray-600">
          Here's your financial overview
        </p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <QuickActionButton
                key={action.title}
                {...action}
              />
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Snapshot Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatsCard
          title="Monthly Income"
          value={formatAmount(monthlyIncome)}
          icon="💰"
          color="green"
          trend={{
            value: "vs last month",
            isPositive: true
          }}
        />
        <StatsCard
          title="Monthly Expenses"
          value={formatAmount(monthlyExpenses)}
          icon="💸"
          color="red"
        />
        <StatsCard
          title="Net Balance"
          value={formatAmount(netBalance)}
          icon="📈"
          color={netBalance >= 0 ? "green" : "red"}
        />
        <StatsCard
          title="Total Transactions"
          value={transactions.length.toString()}
          icon="📊"
          color="blue"
        />
      </motion.div>

      {/* Notifications Panel */}
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
            {uncategorizedCount > 0 && (
              <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-semibold text-yellow-800">
                      Uncategorized Transactions
                    </h3>
                    <p className="text-yellow-700">
                      You have {uncategorizedCount} transactions that need categorizing
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

            {transactions.length === 0 && (
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
                  onClick={() => router.push('/upload')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Upload Statement
                </Button>
              </div>
            )}

            {uncategorizedCount === 0 && transactions.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <h3 className="font-semibold text-green-800">
                      All Caught Up!
                    </h3>
                    <p className="text-green-700">
                      All your transactions are properly categorized
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Recent Activity Preview */}
      {transactions.length > 0 && (
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
              </h2>
              <Button
                variant="secondary"
                onClick={() => router.push('/dashboard')}
              >
                View All
              </Button>
            </div>
            
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
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
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
