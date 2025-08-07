/**
 * Spending Analytics Chart Component
 * Daily spending visualization with interactive bars and insights
 * Similar to the provided reference image but tailored for NetFolio
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { Card } from './Card';
import { Button } from './Button';
import { formatAmount } from '@/utils/currency';
import { Transaction } from '@/types';

interface SpendingAnalyticsProps {
  transactions: Transaction[];
  dateRange: { start: string; end: string };
  className?: string;
}

interface DailySpending {
  date: string;
  amount: number;
  dayOfMonth: number;
  monthDay: string; // Combined month/day for better X-axis labels
  fullDate: string; // Full formatted date for tooltips
  isWeekend: boolean;
  transactionCount: number;
  topCategory?: string;
}

export const SpendingAnalytics: React.FC<SpendingAnalyticsProps> = ({
  transactions,
  dateRange,
  className = ''
}) => {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Calculate the period type based on date range
  const periodInfo = useMemo(() => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const diffInMs = endDate.getTime() - startDate.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    
    let periodType: string;
    let periodLabel: string;
    
    if (diffInDays <= 35) {
      periodType = 'last30';
      periodLabel = `Last ${diffInDays} Days`;
    } else if (diffInDays <= 100) {
      periodType = 'last90';
      periodLabel = `Last ${diffInDays} Days`;
    } else if (diffInDays <= 200) {
      periodType = 'last180';
      periodLabel = `Last ${diffInDays} Days`;
    } else {
      periodType = 'lastYear';
      periodLabel = `Last ${Math.round(diffInDays / 30)} Months`;
    }
    
    return { periodType, periodLabel, totalDays: diffInDays };
  }, [dateRange]);

  // Process daily spending data
  const dailySpendingData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // Create daily buckets
    const dailyBuckets: { [key: string]: Transaction[] } = {};
    
    // Initialize all days in range
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      dailyBuckets[dateKey] = [];
      current.setDate(current.getDate() + 1);
    }

    // Group transactions by day (only expenses - negative amounts)
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.transaction_date || transaction.date);
      const dateKey = transactionDate.toISOString().split('T')[0];
      
      if (dailyBuckets[dateKey] && (transaction.amount || 0) < 0) {
        dailyBuckets[dateKey].push(transaction);
      }
    });

    // Convert to chart data
    return Object.entries(dailyBuckets).map(([date, dayTransactions]) => {
      const totalSpending = Math.abs(dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0));
      const dateObj = new Date(date);
      
      // Create better X-axis labels
      const monthDay = dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      const fullDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      });
      
      // Find top category for the day
      const categoryTotals: { [key: string]: number } = {};
      dayTransactions.forEach(t => {
        const category = t.category_name || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(t.amount || 0);
      });
      
      const topCategory = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0]?.[0];

      return {
        date,
        amount: totalSpending,
        dayOfMonth: dateObj.getDate(),
        monthDay,
        fullDate,
        isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
        transactionCount: dayTransactions.length,
        topCategory
      } as DailySpending;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, dateRange]);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (dailySpendingData.length === 0) return null;

    const amounts = dailySpendingData.map(d => d.amount).filter(a => a > 0);
    const totalSpending = amounts.reduce((sum, amount) => sum + amount, 0);
    const averageDaily = totalSpending / Math.max(1, dailySpendingData.length);
    const maxSpending = Math.max(...amounts);
    const maxSpendingDay = dailySpendingData.find(d => d.amount === maxSpending);
    
    // Weekend vs Weekday analysis
    const weekendSpending = dailySpendingData.filter(d => d.isWeekend).reduce((sum, d) => sum + d.amount, 0);
    const weekdaySpending = dailySpendingData.filter(d => !d.isWeekend).reduce((sum, d) => sum + d.amount, 0);
    
    const weekendDays = dailySpendingData.filter(d => d.isWeekend).length;
    const weekdayDays = dailySpendingData.filter(d => !d.isWeekend).length;
    
    return {
      totalSpending,
      averageDaily,
      maxSpending,
      maxSpendingDay,
      weekendAvg: weekendDays > 0 ? weekendSpending / weekendDays : 0,
      weekdayAvg: weekdayDays > 0 ? weekdaySpending / weekdayDays : 0,
      totalDays: dailySpendingData.length,
      activeDays: amounts.length
    };
  }, [dailySpendingData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as DailySpending;
      
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 backdrop-blur-sm p-4 border border-gray-200 rounded-xl shadow-lg"
        >
          <div className="text-sm font-semibold text-gray-900 mb-2">
            {data.fullDate}
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-blue-600">
              {formatAmount(data.amount)}
            </p>
            {data.transactionCount > 0 && (
              <p className="text-xs text-gray-600">
                {data.transactionCount} transaction{data.transactionCount !== 1 ? 's' : ''}
              </p>
            )}
            {data.topCategory && (
              <p className="text-xs text-gray-600">
                Top: {data.topCategory}
              </p>
            )}
          </div>
        </motion.div>
      );
    }
    return null;
  };

  if (!analytics) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Spending Analytics</h3>
          <p className="text-gray-600">
            No spending data available for the selected period.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="p-6 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Spending Analytics</h3>
              <p className="text-sm text-gray-400">Daily spending patterns and insights</p>
            </div>
          </div>
          
          {/* Period Display */}
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
              <span className="text-blue-400 font-medium">{periodInfo.periodLabel}</span>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-400">
              {formatAmount(analytics.maxSpending)}
            </div>
            <div className="text-xs text-gray-400">Highest Day</div>
            {analytics.maxSpendingDay && (
              <div className="text-xs text-blue-300 mt-1">
                {new Date(analytics.maxSpendingDay.date).toLocaleDateString()}
              </div>
            )}
          </div>
          
          <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
            <div className="text-2xl font-bold text-purple-400">
              {formatAmount(analytics.averageDaily)}
            </div>
            <div className="text-xs text-gray-400">Daily Average</div>
          </div>
          
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="text-2xl font-bold text-green-400">
              {analytics.activeDays}
            </div>
            <div className="text-xs text-gray-400">Active Days</div>
          </div>
          
          <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
            <div className="text-2xl font-bold text-orange-400">
              {formatAmount(analytics.totalSpending)}
            </div>
            <div className="text-xs text-gray-400">Total Spent</div>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailySpendingData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                onMouseEnter={(data) => setHoveredDay(data?.activeLabel || null)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <defs>
                  <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#374151" 
                  opacity={0.3}
                />
                
                <XAxis 
                  dataKey="monthDay"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  interval={periodInfo.totalDays > 60 ? 'preserveStartEnd' : 0}
                  angle={periodInfo.totalDays > 30 ? -45 : 0}
                  textAnchor={periodInfo.totalDays > 30 ? 'end' : 'middle'}
                  height={60}
                />
                
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => value > 0 ? `₹${Math.round(value)}` : '₹0'}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <ReferenceLine 
                  y={analytics.averageDaily} 
                  stroke="#F59E0B" 
                  strokeDasharray="5 5"
                  strokeOpacity={0.7}
                />
                
                <Bar 
                  dataKey="amount" 
                  fill="url(#spendingGradient)"
                  radius={[2, 2, 0, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart Legend */}
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 mt-2">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Daily Spending</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 bg-yellow-500 rounded"></div>
              <span>Average ({formatAmount(analytics.averageDaily)})</span>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="border-t border-gray-700 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2 flex items-center">
                <span className="mr-2">📈</span>
                Spending Pattern
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Weekend Average:</span>
                  <span className="text-green-400">{formatAmount(analytics.weekendAvg)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Weekday Average:</span>
                  <span className="text-blue-400">{formatAmount(analytics.weekdayAvg)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {analytics.weekendAvg > analytics.weekdayAvg 
                    ? "You tend to spend more on weekends" 
                    : "You spend more on weekdays"}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2 flex items-center">
                <span className="mr-2">💡</span>
                Quick Insights
              </h4>
              <div className="space-y-1 text-sm text-gray-300">
                <p>• Active spending on {analytics.activeDays} out of {analytics.totalDays} days</p>
                <p>• Highest spending: {analytics.maxSpendingDay && 
                  new Date(analytics.maxSpendingDay.date).toLocaleDateString()}</p>
                <p>• {analytics.weekendAvg > analytics.weekdayAvg ? 
                  `Weekend spending ${Math.round(((analytics.weekendAvg / analytics.weekdayAvg) - 1) * 100)}% higher` :
                  `Weekday spending ${Math.round(((analytics.weekdayAvg / analytics.weekendAvg) - 1) * 100)}% higher`}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
