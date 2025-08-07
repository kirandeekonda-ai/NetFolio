import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Transaction, Category } from '@/types';
import { formatAmount } from '@/utils/currency';
import { getCategoryColorStyle } from '@/utils/categoryColors';

interface VisualizationProps {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
}

interface CategoryData {
  name: string;
  count: number;
  totalAmount: number;
  percentage: number;
  color: string;
}

interface MonthlyData {
  month: string;
  categorized: number;
  uncategorized: number;
  total: number;
}

export const CategorizationVisualAnalytics: React.FC<VisualizationProps> = ({
  transactions,
  categories,
  currency
}) => {
  // Calculate category distribution
  const categoryData = useMemo((): CategoryData[] => {
    const categoryMap = new Map<string, { count: number; totalAmount: number }>();
    
    transactions.forEach(transaction => {
      const categoryName = transaction.category_name || 'Uncategorized';
      const amount = Math.abs(transaction.amount || 0);
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { count: 0, totalAmount: 0 });
      }
      
      const data = categoryMap.get(categoryName)!;
      data.count += 1;
      data.totalAmount += amount;
    });

    const totalTransactions = transactions.length;
    const data: CategoryData[] = [];

    categoryMap.forEach((value, categoryName) => {
      const categoryStyle = getCategoryColorStyle(categoryName, categories);
      data.push({
        name: categoryName,
        count: value.count,
        totalAmount: value.totalAmount,
        percentage: totalTransactions > 0 ? (value.count / totalTransactions) * 100 : 0,
        color: categoryStyle.style?.backgroundColor || '#6B7280'
      });
    });

    return data.sort((a, b) => b.count - a.count);
  }, [transactions, categories]);

  // Calculate monthly progress
  const monthlyProgress = useMemo((): MonthlyData[] => {
    const monthMap = new Map<string, { categorized: number; uncategorized: number }>();
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { categorized: 0, uncategorized: 0 });
      }
      
      const data = monthMap.get(monthKey)!;
      const isCategorized = transaction.category_name && transaction.category_name !== 'Uncategorized';
      
      if (isCategorized) {
        data.categorized += 1;
      } else {
        data.uncategorized += 1;
      }
    });

    const result: MonthlyData[] = [];
    monthMap.forEach((value, month) => {
      const total = value.categorized + value.uncategorized;
      result.push({
        month,
        categorized: value.categorized,
        uncategorized: value.uncategorized,
        total
      });
    });

    return result.sort((a, b) => a.month.localeCompare(b.month)).slice(-6); // Last 6 months
  }, [transactions]);

  const totalCategorized = transactions.filter(t => t.category_name && t.category_name !== 'Uncategorized').length;
  const totalUncategorized = transactions.length - totalCategorized;
  const categorizationProgress = transactions.length > 0 ? (totalCategorized / transactions.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Categorization Progress</h3>
            <p className="text-sm text-gray-600">Visual overview of your categorization status</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-900">Overall Progress</span>
            <span className="text-sm font-bold text-gray-900">{Math.round(categorizationProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${categorizationProgress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>{totalCategorized} categorized</span>
            <span>{totalUncategorized} remaining</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalCategorized}</div>
            <div className="text-sm text-green-700">Categorized</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{totalUncategorized}</div>
            <div className="text-sm text-orange-700">Pending</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
            <div className="text-sm text-blue-700">Categories</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(categorizationProgress)}%</div>
            <div className="text-sm text-purple-700">Complete</div>
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">Category Distribution</h4>
        
        <div className="space-y-3">
          {categoryData.slice(0, 8).map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-4"
            >
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{category.count}</div>
                    <div className="text-xs text-gray-600">{formatAmount(category.totalAmount, currency)}</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${category.percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(category.percentage)}% of transactions
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {categoryData.length > 8 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show all {categoryData.length} categories →
            </button>
          </div>
        )}
      </div>

      {/* Monthly Trends */}
      <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">Monthly Categorization Trends</h4>
        
        <div className="space-y-4">
          {monthlyProgress.map((month, index) => {
            const categorizationRate = month.total > 0 ? (month.categorized / month.total) * 100 : 0;
            const monthName = new Date(month.month + '-01').toLocaleDateString('en-US', { 
              month: 'short', 
              year: 'numeric' 
            });
            
            return (
              <motion.div
                key={month.month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/60 rounded-xl p-4"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">{monthName}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{Math.round(categorizationRate)}%</div>
                    <div className="text-xs text-gray-600">{month.categorized}/{month.total}</div>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <motion.div
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${categorizationRate}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-600">
                  <span className="text-green-600">{month.categorized} categorized</span>
                  <span className="text-orange-600">{month.uncategorized} pending</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Categorization Insights */}
      <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">📈 Insights & Recommendations</h4>
        
        <div className="space-y-3">
          {categorizationProgress >= 90 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">🎉</span>
                <span className="text-sm font-medium text-green-800">Excellent Progress!</span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                You've categorized {Math.round(categorizationProgress)}% of your transactions. Great job maintaining organized financial records!
              </p>
            </div>
          )}
          
          {categorizationProgress < 50 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600">⚡</span>
                <span className="text-sm font-medium text-yellow-800">Boost Your Progress</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                Consider using bulk categorization or AI suggestions to speed up the process. {totalUncategorized} transactions are still pending.
              </p>
            </div>
          )}
          
          {categoryData.find(c => c.name === 'Uncategorized' && c.percentage > 30) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600">💡</span>
                <span className="text-sm font-medium text-blue-800">AI Suggestion Available</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Many transactions are uncategorized. Check the AI Insights tab for smart categorization suggestions.
              </p>
            </div>
          )}
          
          {categories.length < 5 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-purple-600">🎯</span>
                <span className="text-sm font-medium text-purple-800">Add More Categories</span>
              </div>
              <p className="text-xs text-purple-700 mt-1">
                Consider adding more specific categories for better expense tracking and budgeting insights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
