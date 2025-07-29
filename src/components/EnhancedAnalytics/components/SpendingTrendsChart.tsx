/**
 * SpendingTrendsChart Component
 * Interactive line chart showing spending patterns over time
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatAmount } from '@/utils/currency';
import { TrendDataPoint } from '../types/analytics.types';

interface SpendingTrendsChartProps {
  data: TrendDataPoint[];
  loading?: boolean;
  height?: number;
  className?: string;
}

export const SpendingTrendsChart: React.FC<SpendingTrendsChartProps> = ({
  data,
  loading = false,
  height = 400,
  className = ''
}) => {
  const [visibleLines, setVisibleLines] = useState({
    income: true,
    expenses: true,
    netFlow: true,
    runningBalance: false
  });

  // Use all data provided (date range is controlled by parent component)
  const chartData = React.useMemo(() => {
    return data.filter(point => {
      // Only include days with actual transaction data to avoid flat lines
      return point.income > 0 || point.expenses > 0;
    });
  }, [data]);

  const toggleLine = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }));
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">
            {new Date(label).toLocaleDateString()}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatAmount(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
      transition={{ duration: 0.5 }}
    >
      <Card className={`p-6 ${className}`}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <span className="text-white text-lg">📈</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Spending Trends</h3>
              <p className="text-sm text-gray-600">Track your financial patterns over time</p>
            </div>
          </div>
        </div>

        {/* Legend Controls */}
        <div className="flex flex-wrap items-center space-x-4 mb-4">
          {Object.entries(visibleLines).map(([key, visible]) => (
            <button
              key={key}
              onClick={() => toggleLine(key as keyof typeof visibleLines)}
              className={`flex items-center space-x-2 text-sm px-3 py-1 rounded-full transition-all ${
                visible 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              <div 
                className={`w-3 h-3 rounded-full ${
                  key === 'income' ? 'bg-green-500' :
                  key === 'expenses' ? 'bg-red-500' :
                  key === 'netFlow' ? 'bg-blue-500' :
                  'bg-purple-500'
                }`}
              />
              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="w-full" style={{ height }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatAmount(value).replace('$', '$')}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={customTooltip} />
                <Legend />
                
                {visibleLines.income && (
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    name="Income"
                  />
                )}
                
                {visibleLines.expenses && (
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2 }}
                    name="Expenses"
                  />
                )}
                
                {visibleLines.netFlow && (
                  <Line
                    type="monotone"
                    dataKey="netFlow"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    name="Net Flow"
                  />
                )}
                
                {visibleLines.runningBalance && (
                  <Line
                    type="monotone"
                    dataKey="runningBalance"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                    name="Running Balance"
                  />
                )}
                
                <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600">No trend data available for selected period</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
            {[
              {
                label: 'Avg Daily Income',
                value: chartData.reduce((sum: number, d: any) => sum + d.income, 0) / chartData.length,
                color: 'text-green-600'
              },
              {
                label: 'Avg Daily Expenses',
                value: chartData.reduce((sum: number, d: any) => sum + d.expenses, 0) / chartData.length,
                color: 'text-red-600'
              },
              {
                label: 'Net Change',
                value: chartData[chartData.length - 1]?.runningBalance - chartData[0]?.runningBalance || 0,
                color: 'text-blue-600'
              },
              {
                label: 'Best Day',
                value: Math.max(...chartData.map((d: any) => d.netFlow)),
                color: 'text-purple-600'
              }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className={`text-lg font-bold ${stat.color}`}>
                  {formatAmount(stat.value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
};
