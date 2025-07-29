/**
 * EnhancedAnalytics Component
 * Main container for all analytics visualizations
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/Card';
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

export const EnhancedAnalytics: React.FC<EnhancedAnalyticsProps> = ({
  transactions,
  dateRange,
  onDateRangeChange,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const analyticsData = useAnalyticsData(transactions, dateRange);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {/* Analytics Dashboard Layout */}
      <div className="space-y-4">
        {/* Compact Row: Financial Health Score + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
          {/* Financial Health Score - Takes 2 columns */}
          <div className="lg:col-span-2">
            <FinancialHealthScore 
              metrics={analyticsData.financialHealth}
              loading={isLoading}
            />
          </div>
          
          {/* Quick Stats - Horizontal layout in 3 columns */}
          <div className="lg:col-span-3">
            <Card className="p-4 h-full flex flex-col">
              <h4 className="font-medium text-gray-900 mb-3">Key Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 items-center">
                <div className="text-center">
                  <div className="text-lg mb-1">📝</div>
                  <div className="text-xl font-bold text-gray-900">{analyticsData.transactions.length}</div>
                  <div className="text-xs text-gray-500">Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg mb-1">🏷️</div>
                  <div className="text-xl font-bold text-gray-900">{analyticsData.categoryBreakdown.length}</div>
                  <div className="text-xs text-gray-500">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-lg mb-1">📅</div>
                  <div className="text-xl font-bold text-gray-900">
                    {Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="text-xs text-gray-500">Days</div>
                </div>
                <div className="text-center">
                  <div className="text-lg mb-1">✅</div>
                  <div className="text-xl font-bold text-green-600">
                    {Math.round((analyticsData.transactions.filter(t => t.category_name || t.category).length / Math.max(1, analyticsData.transactions.length)) * 100)}%
                  </div>
                  <div className="text-xs text-gray-500">Quality</div>
                </div>
              </div>
            </Card>
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
      </div>
    </motion.div>
  );
};
