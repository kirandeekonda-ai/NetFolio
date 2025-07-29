/**
 * EnhancedAnalytics Component
 * Main container for all analytics visualizations
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Transaction } from '@/types';
import { DateRange } from './types/analytics.types';
import { useAnalyticsData } from './hooks/useAnalyticsData';
import { SpendingTrendsChart } from './components/SpendingTrendsChart';
import { CategoryBreakdownChart } from './components/CategoryBreakdownChart';
import { IncomeVsExpensesChart } from './components/IncomeVsExpensesChart';
import { FinancialHealthScore } from './components/FinancialHealthScore';

interface EnhancedAnalyticsProps {
  transactions: Transaction[];
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  className?: string;
}

const PRESET_RANGES = [
  { key: 'this_month', label: 'This Month', days: 30 },
  { key: 'last_month', label: 'Last Month', days: 30, offset: 30 },
  { key: 'last_3_months', label: 'Last 3 Months', days: 90 },
  { key: 'last_6_months', label: 'Last 6 Months', days: 180 },
  { key: 'this_year', label: 'This Year', days: 365 },
  { key: 'all_time', label: 'All Time', days: 0 }
];

export const EnhancedAnalytics: React.FC<EnhancedAnalyticsProps> = ({
  transactions,
  dateRange,
  onDateRangeChange,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const analyticsData = useAnalyticsData(transactions, dateRange);

  const handlePresetRange = (preset: typeof PRESET_RANGES[0]) => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    if (preset.key === 'all_time') {
      if (transactions.length > 0) {
        const dates = transactions.map(t => new Date(t.transaction_date || t.date));
        startDate = new Date(Math.min(...dates.map(d => d.getTime())));
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
    } else if (preset.key === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (preset.key === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset.key === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      const offsetDays = preset.offset || 0;
      startDate = new Date(now.getTime() - (preset.days + offsetDays) * 24 * 60 * 60 * 1000);
      if (offsetDays) {
        endDate = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000);
      }
    }

    onDateRangeChange({
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });
  };

  const handleExport = async () => {
    setIsLoading(true);
    // Export functionality would be implemented here
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {/* Analytics Header and Filters */}
      <Card className="p-6 mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg">
              <span className="text-2xl text-white">📊</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Enhanced Analytics
              </h2>
              <p className="text-sm text-gray-600">
                Advanced insights and visualizations for your financial data
              </p>
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isLoading}
            className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white"
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <span className="animate-spin">⚡</span>
                <span>Exporting...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <span>📥</span>
                <span>Export Report</span>
              </span>
            )}
          </Button>
        </div>

        {/* Date Range Filters */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Quick Select:</span>
            {PRESET_RANGES.map(preset => (
              <Button
                key={preset.key}
                onClick={() => handlePresetRange(preset)}
                variant="secondary"
                className="text-xs px-3 py-1.5 bg-white border border-gray-300 hover:border-indigo-300 hover:bg-indigo-50"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Analytics Dashboard Layout */}
      <div className="space-y-8">
        {/* Row 1: Financial Health Score */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <FinancialHealthScore 
              metrics={analyticsData.financialHealth}
              loading={isLoading}
            />
          </div>
          <div className="lg:col-span-2">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
              {[
                {
                  label: 'Total Transactions',
                  value: analyticsData.transactions.length.toString(),
                  icon: '📝',
                  color: 'blue'
                },
                {
                  label: 'Categories',
                  value: analyticsData.categoryBreakdown.length.toString(),
                  icon: '🏷️',
                  color: 'green'
                },
                {
                  label: 'Time Period',
                  value: `${Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24))} days`,
                  icon: '📅',
                  color: 'purple'
                },
                {
                  label: 'Data Quality',
                  value: `${Math.round((analyticsData.transactions.filter(t => t.category_name || t.category).length / Math.max(1, analyticsData.transactions.length)) * 100)}%`,
                  icon: '✅',
                  color: 'orange'
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="p-4 h-full flex flex-col justify-center text-center">
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-600">{stat.label}</div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Spending Trends (Full Width) */}
        <SpendingTrendsChart 
          data={analyticsData.spendingTrends}
          loading={isLoading}
          height={400}
        />

        {/* Row 3: Category Breakdown & Income vs Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryBreakdownChart 
            data={analyticsData.categoryBreakdown}
            loading={isLoading}
            height={400}
          />
          <IncomeVsExpensesChart 
            data={analyticsData.incomeVsExpenses}
            loading={isLoading}
            height={400}
          />
        </div>

        {/* Row 4: Placeholder for Future Components */}
        <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-blue-50 border border-blue-200">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-3xl text-white">🚀</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">More Analytics Coming Soon!</h3>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            We're working on cash flow waterfall charts, predictive insights, spending goals tracking, 
            and AI-powered financial recommendations to make your analytics even more powerful.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-6">
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <span className="flex items-center space-x-2">
                <span>🔔</span>
                <span>Notify Me</span>
              </span>
            </Button>
            <Button variant="secondary">
              <span className="flex items-center space-x-2">
                <span>💡</span>
                <span>Request Feature</span>
              </span>
            </Button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
