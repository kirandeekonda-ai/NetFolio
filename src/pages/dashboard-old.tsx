import { NextPage } from 'next';
import { useMemo, useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setTransactions } from '@/store/transactionsSlice';
import { Transaction } from '@/types';
import { formatAmount } from '@/utils/currency';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/router';
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
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';

const COLORS = [
  '#5A67D8', // primary
  '#FA8072', // accent
  '#4A54B3', // primary-dark
  '#E5675A', // accent-dark
  '#8B96E5', // primary-light
];

const Dashboard: NextPage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useUser();
  const transactions = useSelector((state: RootState) => state.transactions.items);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Load user's actual transactions from database on component mount
  useEffect(() => {
    const loadTransactionsFromDatabase = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data: dbTransactions, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false });

        if (error) {
          console.error('Error loading transactions:', error);
          return;
        }

        if (dbTransactions && dbTransactions.length > 0) {
          // Convert database transactions to Redux format
          const formattedTransactions: Transaction[] = dbTransactions.map(t => ({
            ...t,
            // Ensure legacy fields for compatibility
            date: t.transaction_date,
            type: t.transaction_type,
            category: t.category_name || 'Uncategorized'
          }));

          dispatch(setTransactions(formattedTransactions));
          setLastRefresh(new Date());
        }
      } catch (error) {
        console.error('Error loading transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactionsFromDatabase();
  }, [user, dispatch]);

  // Manual refresh function
  const handleRefreshData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: dbTransactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error refreshing transactions:', error);
        return;
      }

      if (dbTransactions) {
        const formattedTransactions: Transaction[] = dbTransactions.map(t => ({
          ...t,
          date: t.transaction_date,
          type: t.transaction_type,
          category: t.category_name || 'Uncategorized'
        }));

        dispatch(setTransactions(formattedTransactions));
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    categoryData,
    monthlyData,
  } = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(transaction => {
      const date = new Date(transaction.date);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    const income = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Category breakdown - use category_name field primarily, fallback to legacy category
    const categoryTotals = monthlyTransactions
      .filter(t => t.type === 'expense' && (t.category_name || t.category))
      .reduce((acc, t) => {
        const category = t.category_name || t.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Monthly trend
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthTransactions = transactions.filter(transaction => {
        const date = new Date(transaction.date);
        return date.getMonth() === i && date.getFullYear() === thisYear;
      });

      const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      return {
        name: new Date(thisYear, i).toLocaleString('default', { month: 'short' }),
        income: monthIncome,
        expenses: monthExpenses,
      };
    });

    return {
      totalBalance: transactions.reduce((sum, t) => sum + t.amount, 0),
      monthlyIncome: income,
      monthlyExpenses: expenses,
      categoryData,
      monthlyData,
    };
  }, [transactions]);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-heading font-bold">
            Financial Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            {lastRefresh && (
              <span className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={handleRefreshData}
              disabled={isLoading}
              variant="secondary"
              className="text-sm"
            >
              {isLoading ? 'Refreshing...' : '🔄 Refresh Data'}
            </Button>
          </div>
        </div>

        {/* Show message if no transactions */}
        {transactions.length === 0 && !isLoading && (
          <Card className="p-8 text-center mb-6">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Transaction Data Found
            </h2>
            <p className="text-gray-600 mb-6">
              Upload and categorize your bank statements to see financial insights here.
            </p>
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => router.push('/statements')}
                className="bg-blue-600 text-white"
              >
                Upload Statements
              </Button>
              <Button
                onClick={() => router.push('/categorize')}
                variant="secondary"
              >
                Categorize Transactions
              </Button>
            </div>
          </Card>
        )}

        {/* Show loading state */}
        {isLoading && (
          <Card className="p-8 text-center mb-6">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-lg font-semibold text-gray-900">
              Loading Your Financial Data...
            </h2>
          </Card>
        )}

        {/* Show dashboard content when transactions are available */}
        {transactions.length > 0 && (
          <>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-neutral-500 mb-2">
              Total Balance
            </h3>
            <p className="text-2xl font-bold text-primary">
              {formatAmount(totalBalance)}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-neutral-500 mb-2">
              Monthly Income
            </h3>
            <p className="text-2xl font-bold text-green-600">
              {formatAmount(monthlyIncome)}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-neutral-500 mb-2">
              Monthly Expenses
            </h3>
            <p className="text-2xl font-bold text-red-600">
              {formatAmount(monthlyExpenses)}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Monthly Trend</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatAmount(value)}
                  />
                  <Bar dataKey="income" name="Income" fill="#5A67D8" />
                  <Bar dataKey="expenses" name="Expenses" fill="#FA8072" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Expense Categories</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({
                      cx,
                      cy,
                      midAngle = 0,
                      innerRadius = 0,
                      outerRadius = 0,
                      name,
                      value = 0,
                    }: {
                      cx?: number;
                      cy?: number;
                      midAngle?: number;
                      innerRadius?: number;
                      outerRadius?: number;
                      name?: string;
                      value?: number;
                    }) => {
                      if (!cx || !cy) return null;
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#2D3748"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          className="text-xs"
                        >
                          {`${name} (${formatAmount(value)})`}
                        </text>
                      );
                    }}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatAmount(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Dashboard;
