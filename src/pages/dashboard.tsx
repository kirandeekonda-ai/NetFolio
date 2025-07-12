import { NextPage } from 'next';
import { useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Transaction } from '@/types';
import { formatAmount } from '@/utils/currency';
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
  const transactions = useSelector((state: RootState) => state.transactions.items);

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

    // Category breakdown
    const categoryTotals = monthlyTransactions
      .filter(t => t.type === 'expense' && t.category)
      .reduce((acc, t) => {
        const category = t.category;
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
        <h1 className="text-heading font-bold mb-6">
          Financial Dashboard
        </h1>

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
