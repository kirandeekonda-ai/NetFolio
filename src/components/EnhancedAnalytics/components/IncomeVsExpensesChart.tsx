/**
 * IncomeVsExpensesChart Component
 * Comparative bar chart showing income vs expenses over time
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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

interface IncomeVsExpensesChartProps {
  data: any[];
  loading?: boolean;
  height?: number;
  className?: string;
}

export const IncomeVsExpensesChart: React.FC<IncomeVsExpensesChartProps> = ({
  data,
  loading = false,
  height = 400,
  className = ''
}) => {
  const [chartView, setChartView] = useState<'stacked' | 'grouped'>('grouped');
  const [showNet, setShowNet] = useState(true);

  const chartData = data.map(item => ({
    ...item,
    netPositive: item.net > 0 ? item.net : 0,
    netNegative: item.net < 0 ? Math.abs(item.net) : 0
  }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-green-600">
              Income: {formatAmount(data.income)}
            </p>
            <p className="text-sm text-red-600">
              Expenses: {formatAmount(data.expenses)}
            </p>
            <p className={`text-sm font-semibold ${data.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              Net: {formatAmount(data.net)}
            </p>
          </div>
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
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className={`p-6 ${className}`}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
              <span className="text-white text-lg">📊</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Income vs Expenses</h3>
              <p className="text-sm text-gray-600">Monthly comparison and net flow analysis</p>
            </div>
          </div>
          
          {/* Chart Controls */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setChartView('grouped')}
              variant={chartView === 'grouped' ? 'primary' : 'secondary'}
              className="text-xs px-3 py-1.5"
            >
              Grouped
            </Button>
            <Button
              onClick={() => setChartView('stacked')}
              variant={chartView === 'stacked' ? 'primary' : 'secondary'}
              className="text-xs px-3 py-1.5"
            >
              Stacked
            </Button>
            <div className="border-l border-gray-300 pl-2 ml-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showNet}
                  onChange={(e) => setShowNet(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Show Net</span>
              </label>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full" style={{ height }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tickFormatter={(value) => formatAmount(value).replace('$', '$')}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={customTooltip} />
                <Legend />
                
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#10B981"
                  radius={[2, 2, 0, 0]}
                  opacity={0.8}
                />
                
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#EF4444"
                  radius={[2, 2, 0, 0]}
                  opacity={0.8}
                />
                
                {showNet && (
                  <>
                    <Bar
                      dataKey="netPositive"
                      name="Net Positive"
                      fill="#3B82F6"
                      radius={[2, 2, 0, 0]}
                      opacity={0.6}
                    />
                    <Bar
                      dataKey="netNegative"
                      name="Net Negative"
                      fill="#F59E0B"
                      radius={[2, 2, 0, 0]}
                      opacity={0.6}
                    />
                  </>
                )}
                
                <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="5 5" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600">No income/expense data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Income
              </p>
              <p className="text-lg font-bold text-green-600">
                {formatAmount(chartData.reduce((sum, d) => sum + d.income, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Expenses
              </p>
              <p className="text-lg font-bold text-red-600">
                {formatAmount(chartData.reduce((sum, d) => sum + d.expenses, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Net Total
              </p>
              <p className={`text-lg font-bold ${
                chartData.reduce((sum, d) => sum + d.net, 0) >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {formatAmount(chartData.reduce((sum, d) => sum + d.net, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Avg Monthly Net
              </p>
              <p className={`text-lg font-bold ${
                chartData.reduce((sum, d) => sum + d.net, 0) / chartData.length >= 0 ? 'text-purple-600' : 'text-red-600'
              }`}>
                {formatAmount(chartData.reduce((sum, d) => sum + d.net, 0) / chartData.length)}
              </p>
            </div>
          </div>
        )}

        {/* Insights */}
        {chartData.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Quick Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
                const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);
                const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
                const positiveMonths = chartData.filter(d => d.net > 0).length;
                
                return [
                  {
                    label: 'Savings Rate',
                    value: `${savingsRate.toFixed(1)}%`,
                    status: savingsRate >= 20 ? 'excellent' : savingsRate >= 10 ? 'good' : 'needs-improvement',
                    icon: savingsRate >= 20 ? '🎯' : savingsRate >= 10 ? '👍' : '⚠️'
                  },
                  {
                    label: 'Positive Months',
                    value: `${positiveMonths}/${chartData.length}`,
                    status: positiveMonths / chartData.length >= 0.8 ? 'excellent' : positiveMonths / chartData.length >= 0.6 ? 'good' : 'needs-improvement',
                    icon: positiveMonths / chartData.length >= 0.8 ? '🌟' : positiveMonths / chartData.length >= 0.6 ? '✅' : '📈'
                  }
                ];
              })().map((insight, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  insight.status === 'excellent' ? 'border-green-400 bg-green-50' :
                  insight.status === 'good' ? 'border-blue-400 bg-blue-50' :
                  'border-orange-400 bg-orange-50'
                }`}>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{insight.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{insight.label}</p>
                      <p className="text-lg font-bold text-gray-800">{insight.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};
