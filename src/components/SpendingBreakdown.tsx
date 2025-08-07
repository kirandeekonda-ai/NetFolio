/**
 * Enhanced Spending Breakdown Component
 * Interactive donut chart with drill-down capability
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import { Card } from './Card';
import { Button } from './Button';
import { formatAmount } from '@/utils/currency';

interface SpendingBreakdownProps {
  categoryData: Array<{ name: string; value: number }>;
  totalExpenses: number;
  className?: string;
}

interface CategoryWithPercentage {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

const COLORS = [
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5A2B',
  '#6366F1', '#EC4899', '#84CC16', '#F97316', '#3B82F6', '#78716C'
];

export const SpendingBreakdown: React.FC<SpendingBreakdownProps> = ({
  categoryData,
  totalExpenses,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'donut' | 'pie'>('donut');

  const enhancedCategoryData: CategoryWithPercentage[] = categoryData.map((item, index) => ({
    ...item,
    percentage: totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0,
    color: COLORS[index % COLORS.length]
  }));

  const chartData = enhancedCategoryData.map(item => ({
    name: item.name,
    value: item.value,
    percentage: item.percentage,
    color: item.color
  }));

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Amount: {formatAmount(data.value)}
            </p>
            <p className="text-sm text-gray-600">
              {data.percentage.toFixed(1)}% of total spending
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(selectedCategory === categoryName ? null : categoryName);
  };

  if (enhancedCategoryData.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🥧</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Spending Breakdown</h3>
          <p className="text-gray-600">
            No categorized expenses found. Start categorizing your transactions to see spending patterns.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={className}
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
              <span className="text-white text-lg">🥧</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Where Your Money Goes</h3>
              <p className="text-sm text-gray-600">Spending breakdown by category</p>
            </div>
          </div>
          
          {/* Chart Type Toggle */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setChartType('donut')}
              variant={chartType === 'donut' ? 'primary' : 'secondary'}
              className="text-xs px-3 py-1.5"
            >
              Donut
            </Button>
            <Button
              onClick={() => setChartType('pie')}
              variant={chartType === 'pie' ? 'primary' : 'secondary'}
              className="text-xs px-3 py-1.5"
            >
              Pie
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="relative">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={chartType === 'donut' ? 60 : 0}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(data) => handleCategoryClick(data.name)}
                  className="cursor-pointer focus:outline-none"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke={selectedCategory === entry.name ? '#374151' : 'none'}
                      strokeWidth={selectedCategory === entry.name ? 3 : 0}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label for Donut Chart */}
            {chartType === 'donut' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatAmount(totalExpenses)}
                  </p>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {enhancedCategoryData.length} categories
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Category List with Progressive Disclosure */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span>Categories</span>
              <span className="text-xs text-gray-500">
                {enhancedCategoryData.length} total
              </span>
            </h4>
            
            <div className="max-h-80 overflow-y-auto space-y-2">
              {enhancedCategoryData.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === category.name
                      ? 'border-purple-300 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-gray-900 truncate">
                        {category.name}
                      </span>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-semibold text-gray-900">
                        {formatAmount(category.value)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${category.percentage}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ backgroundColor: category.color }}
                      />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedCategory === category.name && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3 border-t border-gray-200"
                    >
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Daily Average:</span>
                          <span className="ml-1">{formatAmount(category.value / 30)}</span>
                        </div>
                        <div>
                          <span className="font-medium">Rank:</span>
                          <span className="ml-1">#{index + 1} of {enhancedCategoryData.length}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Largest Category
            </p>
            <p className="text-lg font-bold text-purple-600">
              {enhancedCategoryData[0]?.percentage.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 truncate">
              {enhancedCategoryData[0]?.name}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Categories
            </p>
            <p className="text-lg font-bold text-blue-600">
              {enhancedCategoryData.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Avg per Category
            </p>
            <p className="text-lg font-bold text-green-600">
              {formatAmount(totalExpenses / enhancedCategoryData.length)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Diversification
            </p>
            <p className={`text-lg font-bold ${
              enhancedCategoryData.length >= 5 ? 'text-green-600' : 
              enhancedCategoryData.length >= 3 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {enhancedCategoryData.length >= 5 ? 'Good' : 
               enhancedCategoryData.length >= 3 ? 'Fair' : 'Low'}
            </p>
          </div>
        </div>

        {/* Insights */}
        {enhancedCategoryData.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-start space-x-2 text-sm">
              <span className="text-purple-600">💡</span>
              <div className="text-gray-700">
                <span className="font-medium">Insight:</span> Your top category ({enhancedCategoryData[0]?.name}) represents{' '}
                {enhancedCategoryData[0]?.percentage.toFixed(1)}% of your spending.{' '}
                {enhancedCategoryData[0]?.percentage > 40 ? (
                  'Consider if this allocation aligns with your priorities.'
                ) : enhancedCategoryData[0]?.percentage > 25 ? (
                  'This is a significant portion of your budget.'
                ) : (
                  'Your spending appears well-diversified across categories.'
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};
