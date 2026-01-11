/**
 * Income vs Expenses Categories Component
 * Displays categorized income and expenses in a clean split layout
 */

import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatAmount } from '@/utils/currency';
import { Transaction } from '@/types';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@supabase/auth-helpers-react';

interface IncomeExpenseCategoriesProps {
  transactions: Transaction[];
  dateRange: { start: string; end: string };
}

interface CategoryItem {
  name: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
  icon: string;
}

interface UserCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const CategoryColors = [
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5A2B',
  '#6366F1', '#EC4899', '#84CC16', '#F97316', '#3B82F6', '#78716C'
];

const CategoryIcons: { [key: string]: string } = {
  'Food & Dining': '🍽',
  'Shopping': '🛍',
  'Transportation': '🚗',
  'Bills & Utilities': '⚡',
  'Entertainment': '🎬',
  'Healthcare': '🏥',
  'Travel': '✈',
  'Education': '📚',
  'Groceries': '🛒',
  'Gas': '⛽',
  'Income': '💰',
  'Salary': '💼',
  'Investment': '📈',
  'Transfer': '🔄',
  'ATM': '🏧',
  'Bank Fees': '🏦',
  'Insurance': '🛡',
  'Rent': '🏠',
  'Phone': '📱',
  'Internet': '🌐',
  'Subscriptions': '📺',
  'Fitness': '🏋',
  'Beauty': '💄',
  'Home': '🏡',
  'Gifts': '🎁',
  'Charity': '❤',
  'Taxes': '📋',
  'Business': '💼',
  'Uncategorized': '❓',
  'Extra Income': '💎',
  'Loan Repayment': '💳',
  'Rent & Housing': '🏠',
  'Dividend': '💵',
  'Outgoing Loans': '📤',
  'Credit Card Bill': '💳',
  'Investments': '📊',
  'Work Expenses': '💼'
};

export const IncomeExpenseCategories: React.FC<IncomeExpenseCategoriesProps> = ({
  transactions,
  dateRange
}) => {
  const user = useUser();
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);

  // Fetch user categories with icons
  useEffect(() => {
    const fetchUserCategories = async () => {
      if (!user) return;

      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
          .from('user_preferences')
          .select('categories')
          .eq('user_id', user.id)
          .single();

        if (data?.categories) {
          setUserCategories(data.categories);
        }
      } catch (error) {
        console.error('Error fetching user categories:', error);
      }
    };

    fetchUserCategories();
  }, [user]);

  // Create a map of category names to icons from user categories
  const getUserCategoryIcon = (categoryName: string): string => {
    const userCategory = userCategories.find(
      cat => cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    return userCategory?.icon || CategoryIcons[categoryName] || CategoryIcons['Uncategorized'];
  };

  const { incomeCategories, expenseCategories, totalIncome, totalExpenses } = useMemo(() => {
    // Filter transactions by date range
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.transaction_date || transaction.date);
      const isInDateRange = transactionDate >= startDate && transactionDate <= endDate;
      const isNotInternalTransfer = !transaction.is_internal_transfer;
      return isInDateRange && isNotInternalTransfer;
    });

    // Separate income and expenses
    const income = filteredTransactions.filter(t => (t.amount || 0) > 0);
    const expenses = filteredTransactions.filter(t => (t.amount || 0) < 0);

    // Calculate totals
    const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpenses = Math.abs(expenses.reduce((sum, t) => sum + (t.amount || 0), 0));

    // Group by categories
    const groupByCategory = (transactionList: Transaction[], total: number) => {
      const categoryMap = new Map<string, { amount: number; count: number; transactions: Transaction[] }>();

      transactionList.forEach(transaction => {
        const categoryName = transaction.category_name || 'Uncategorized';
        const amount = Math.abs(transaction.amount || 0);

        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, { amount: 0, count: 0, transactions: [] });
        }

        const category = categoryMap.get(categoryName)!;
        category.amount += amount;
        category.count += 1;
        category.transactions.push(transaction);
      });

      return Array.from(categoryMap.entries())
        .map(([name, data], index) => ({
          name,
          amount: data.amount,
          percentage: total > 0 ? (data.amount / total) * 100 : 0,
          count: data.count,
          color: CategoryColors[index % CategoryColors.length],
          icon: getUserCategoryIcon(name)
        }))
        .sort((a, b) => b.amount - a.amount); // Show all categories sorted by amount
    };

    return {
      incomeCategories: groupByCategory(income, totalIncome),
      expenseCategories: groupByCategory(expenses, totalExpenses),
      totalIncome,
      totalExpenses
    };
  }, [transactions, dateRange, userCategories]);

  const CategoryCard: React.FC<{ category: CategoryItem; index: number }> = ({ category, index }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -1 }}
      className="bg-white rounded-lg p-3.5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 cursor-pointer"
    >
      <div className="flex items-center space-x-3">
        {/* Icon - Clean Outline Design */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border-2"
          style={{ borderColor: category.color }}
        >
          <span className="text-lg font-medium" style={{ color: category.color }}>
            {category.icon}
          </span>
        </div>

        {/* Content - Balanced Layout */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate pr-2">
              {category.name}
            </h4>
            <span
              className="text-xs font-bold px-2 py-1 rounded text-white text-center min-w-[36px]"
              style={{ backgroundColor: category.color }}
            >
              {category.percentage.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900">
              {formatAmount(category.amount)}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              {category.count}tx
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="h-full">
      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

        {/* Income Section */}
        <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-3xl p-4 md:p-8 border border-emerald-100 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-6 md:mb-8">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-2xl font-bold">₹</span>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-green-700 bg-clip-text text-transparent">
                  Income
                </h3>
                <p className="text-emerald-600 font-medium">Revenue sources</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-3xl font-black text-emerald-600">
                {formatAmount(totalIncome)}
              </div>
              <div className="text-sm text-emerald-500 font-medium">
                {incomeCategories.length} categories
              </div>
            </div>
          </div>

          {/* Income Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-h-[400px] overflow-y-auto pr-2">
            {incomeCategories.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-200 to-green-300 rounded-3xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">No income categories</p>
                <p className="text-sm text-gray-500 mt-2">
                  Add income transactions to see beautiful breakdowns
                </p>
              </div>
            ) : (
              incomeCategories.map((category, index) => (
                <CategoryCard key={category.name} category={category} index={index} />
              ))
            )}
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 rounded-3xl p-4 md:p-8 border border-rose-100 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-6 md:mb-8">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose-400 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 7l-9.2 9.2M7 7v10h10" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-rose-700 to-red-700 bg-clip-text text-transparent">
                  Expenses
                </h3>
                <p className="text-rose-600 font-medium">Spending breakdown</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-3xl font-black text-rose-600">
                {formatAmount(totalExpenses)}
              </div>
              <div className="text-sm text-rose-500 font-medium">
                {expenseCategories.length} categories
              </div>
            </div>
          </div>

          {/* Expense Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-h-[400px] overflow-y-auto pr-2">
            {expenseCategories.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-rose-200 to-red-300 rounded-3xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">No expense categories</p>
                <p className="text-sm text-gray-500 mt-2">
                  Categorize your expenses to see beautiful breakdowns
                </p>
              </div>
            ) : (
              expenseCategories.map((category, index) => (
                <CategoryCard key={category.name} category={category} index={index} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Summary Stats */}
      {(incomeCategories.length > 0 || expenseCategories.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-6 border border-blue-100 shadow-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center group hover:scale-105 transition-transform duration-200">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">₹</span>
              </div>
              <div className="text-2xl font-black text-emerald-600 mb-1">
                {formatAmount(totalIncome)}
              </div>
              <div className="text-sm text-emerald-600 font-semibold uppercase tracking-wide">
                Total Income
              </div>
            </div>

            <div className="text-center group hover:scale-105 transition-transform duration-200">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">₹</span>
              </div>
              <div className="text-2xl font-black text-rose-600 mb-1">
                {formatAmount(totalExpenses)}
              </div>
              <div className="text-sm text-rose-600 font-semibold uppercase tracking-wide">
                Total Expenses
              </div>
            </div>

            <div className="text-center group hover:scale-105 transition-transform duration-200">
              <div className={`w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-lg ${totalIncome - totalExpenses >= 0
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                  : 'bg-gradient-to-br from-rose-500 to-red-600'
                }`}>
                <span className="text-white text-2xl font-bold">₹</span>
              </div>
              <div className={`text-2xl font-black mb-1 ${totalIncome - totalExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                {formatAmount(totalIncome - totalExpenses)}
              </div>
              <div className={`text-sm font-semibold uppercase tracking-wide ${totalIncome - totalExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                Net Balance
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
