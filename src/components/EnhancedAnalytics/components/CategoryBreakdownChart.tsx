/**
 * CategoryBreakdownChart Component
 * Interactive donut chart with drill-down capability for expense categories
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
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatAmount } from '@/utils/currency';
import { CategoryBreakdown } from '../types/analytics.types';

interface CategoryBreakdownChartProps {
  data: CategoryBreakdown[];
  loading?: boolean;
  height?: number;
  className?: string;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  data,
  loading = false,
  height = 400,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'donut' | 'pie'>('donut');

  const chartData = data.map(item => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
    color: item.color
  }));

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
          <p className="text-sm text-gray-600">
            {formatAmount(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-100 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={`p-6 ${className}`}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <span className="text-white text-lg">🥧</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Category Breakdown</h3>
              <p className="text-sm text-gray-600">Expense distribution by category</p>
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

        {data.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="relative">
              <ResponsiveContainer width="100%" height={height}>
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
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke={selectedCategory === entry.name ? '#374151' : 'none'}
                        strokeWidth={selectedCategory === entry.name ? 3 : 0}
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
                      {formatAmount(totalAmount)}
                    </p>
                    <p className="text-sm text-gray-600">Total Expenses</p>
                  </div>
                </div>
              )}
            </div>

            {/* Category List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 mb-4">Categories</h4>
              <div className="max-h-80 overflow-y-auto space-y-2">
                {data.map((category, index) => (
                  <motion.div
                    key={category.category}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => handleCategoryClick(category.category)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCategory === category.category
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium text-gray-900 truncate">
                          {category.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatAmount(category.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {category.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            backgroundColor: category.color,
                            width: `${category.percentage}%`
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-80 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-2">🏷️</div>
              <p className="text-gray-600">No category data available</p>
              <p className="text-sm text-gray-500 mt-1">
                Categorize your transactions to see the breakdown
              </p>
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        {data.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Categories
              </p>
              <p className="text-lg font-bold text-gray-900">{data.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Largest Category
              </p>
              <p className="text-lg font-bold text-green-600">
                {data[0]?.percentage.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Top Category
              </p>
              <p className="text-lg font-bold text-blue-600 truncate">
                {data[0]?.category || 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Avg per Category
              </p>
              <p className="text-lg font-bold text-purple-600">
                {formatAmount(totalAmount / data.length)}
              </p>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};
