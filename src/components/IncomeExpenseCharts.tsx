/**
 * Income and Expense Charts Component for Dashboard V2
 * Displays side-by-side donut charts with floating category icons
 * Uses user-defined categories with animated dotted lines connecting icons to chart segments
 */

import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card } from '@/components/Card';
import { formatAmount } from '@/utils/currency';
import { Transaction } from '@/types';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/utils/supabase';

interface IncomeExpenseChartsProps {
  transactions: Transaction[];
  dateRange: { start: string; end: string };
  className?: string;
}

interface UserCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// Fallback color schemes for charts
const FALLBACK_INCOME_COLORS = [
  '#10B981', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#059669', // Emerald
];

const FALLBACK_EXPENSE_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#F97316', // Orange
  '#EC4899', // Pink
  '#8B5A2B', // Brown
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#78716C', // Gray
];

// Fallback category icons mapping
const FALLBACK_CATEGORY_ICONS: Record<string, string> = {
  // Income categories
  'Salary': '💼',
  'Freelance': '💻',
  'Investment': '📈',
  'Business': '🏢',
  'Rental': '🏠',
  'Bonus': '🎯',
  'Other Income': '💰',
  'Uncategorized': '💵',
  
  // Expense categories
  'Food & Dining': '🍽️',
  'Transportation': '🚗',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Bills & Utilities': '📱',
  'Healthcare': '🏥',
  'Travel': '✈️',
  'Education': '🎓',
  'Home': '🏠',
  'Personal Care': '💇',
  'Fitness': '💪',
  'Gifts': '🎁',
};

const defaultIcon = (type: 'income' | 'expense') => type === 'income' ? '💰' : '💳';

export const IncomeExpenseCharts: React.FC<IncomeExpenseChartsProps> = ({
  transactions,
  dateRange,
  className = ''
}) => {
  const user = useUser();
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);

  // Fetch user categories from Supabase
  useEffect(() => {
    const fetchUserCategories = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('categories')
          .eq('user_id', user.id)
          .single();

        if (data?.categories && Array.isArray(data.categories)) {
          setUserCategories(data.categories);
        }
      } catch (error) {
        console.error('Error fetching user categories:', error);
      }
    };

    fetchUserCategories();
  }, [user]);

  // Helper function to get category styling (color and icon)
  const getCategoryStyle = (categoryName: string, chartType: 'income' | 'expense') => {
    // First check user-defined categories
    const userCategory = userCategories.find(cat => cat.name === categoryName);
    if (userCategory) {
      return {
        color: userCategory.color,
        icon: userCategory.icon
      };
    }

    // Fallback to predefined mappings
    const fallbackColors = chartType === 'income' ? FALLBACK_INCOME_COLORS : FALLBACK_EXPENSE_COLORS;
    const colorIndex = Math.abs(categoryName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % fallbackColors.length;
    
    return {
      color: fallbackColors[colorIndex],
      icon: FALLBACK_CATEGORY_ICONS[categoryName] || defaultIcon(chartType)
    };
  };

  // Process data for charts
  const { incomeData, expenseData, totalIncome, totalExpenses } = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        incomeData: [],
        expenseData: [],
        totalIncome: 0,
        totalExpenses: 0
      };
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Filter transactions by date range
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.transaction_date || t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Process income data
    const incomeMap = new Map<string, number>();
    let totalIncomeAmount = 0;

    filteredTransactions
      .filter(t => (t.transaction_type || t.type) === 'income')
      .forEach(t => {
        const category = t.category_name || t.category || 'Other Income';
        const amount = Math.abs(t.amount);
        incomeMap.set(category, (incomeMap.get(category) || 0) + amount);
        totalIncomeAmount += amount;
      });

    // Process expense data
    const expenseMap = new Map<string, number>();
    let totalExpenseAmount = 0;

    filteredTransactions
      .filter(t => (t.transaction_type || t.type) === 'expense')
      .forEach(t => {
        const category = t.category_name || t.category || 'Uncategorized';
        const amount = Math.abs(t.amount);
        expenseMap.set(category, (expenseMap.get(category) || 0) + amount);
        totalExpenseAmount += amount;
      });

    // Convert to chart data format with user-defined styling
    const incomeChartData = Array.from(incomeMap.entries())
      .map(([name, value]) => {
        const style = getCategoryStyle(name, 'income');
        return {
          name,
          value,
          percentage: totalIncomeAmount > 0 ? (value / totalIncomeAmount) * 100 : 0,
          color: style.color,
          icon: style.icon
        };
      })
      .sort((a, b) => b.value - a.value);

    const expenseChartData = Array.from(expenseMap.entries())
      .map(([name, value]) => {
        const style = getCategoryStyle(name, 'expense');
        return {
          name,
          value,
          percentage: totalExpenseAmount > 0 ? (value / totalExpenseAmount) * 100 : 0,
          color: style.color,
          icon: style.icon
        };
      })
      .sort((a, b) => b.value - a.value);

    return {
      incomeData: incomeChartData,
      expenseData: expenseChartData,
      totalIncome: totalIncomeAmount,
      totalExpenses: totalExpenseAmount
    };
  }, [transactions, dateRange, userCategories]);

  // Custom tooltip component
  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-lg">{data.icon}</span>
            <span className="font-medium text-gray-900">{data.name}</span>
          </div>
          <div className="text-sm text-gray-600">
            Amount: <span className="font-medium">{formatAmount(data.value)}</span>
          </div>
          <div className="text-sm text-gray-600">
            Percentage: <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Render floating icons around the chart with animated dotted lines
  const renderFloatingIcons = (data: any[], chartType: 'income' | 'expense') => {
    if (data.length === 0) return null;

    // Final robust calculation based on Recharts' documented behavior.
    // Recharts Pie with startAngle={90} and default counter-clockwise drawing.
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativeValue = 0;

    const segmentData = data.map((item, index) => {
      // Calculate the middle angle of the segment in Recharts' coordinate system (degrees).
      const rechartsStartAngle = 90 + (cumulativeValue / totalValue) * 360;
      const rechartsEndAngle = 90 + ((cumulativeValue + item.value) / totalValue) * 360;
      const rechartsMidAngle = (rechartsStartAngle + rechartsEndAngle) / 2;

      // Convert the Recharts angle to standard SVG angle radians for positioning.
      // In SVG, the Y-axis is inverted, so we use a negative angle to simulate
      // the counter-clockwise movement of the chart.
      const svgAngleRad = -rechartsMidAngle * Math.PI / 180;

      cumulativeValue += item.value;

      return {
        ...item,
        midAngle: svgAngleRad,
        index
      };
    });

    // Remove all debug logging
    // if (chartType === 'expense') {
    //   console.log('Expense visual mapping:');
    //   segmentData.forEach(item => {
    //     console.log(`${item.name}: ${item.isVisuallyMapped ? 'VISUAL' : 'CALC'} ${item.finalAngleDeg.toFixed(1)}°`);
    //   });
    // }

    return (
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
        viewBox="0 0 500 500"
      >
        {segmentData.slice(0, 6).map((item, index) => {
          // Use the calculated midAngle for proper alignment
          const angle = item.midAngle;
          const iconRadius = 200; // Distance from center for icons (increased for larger viewBox)
          const chartRadius = 120; // Actual chart radius (matching outerRadius)
          
          // Calculate icon position
          const iconX = Math.cos(angle) * iconRadius;
          const iconY = Math.sin(angle) * iconRadius;
          
          // Calculate line start point (from chart edge)
          const lineStartX = Math.cos(angle) * chartRadius;
          const lineStartY = Math.sin(angle) * chartRadius;
          
          // Convert to SVG coordinates with proper center (increased for larger viewBox)
          const centerX = 250; // Center of 500x500 viewBox
          const centerY = 250; // Center of 500x500 viewBox
          const lineX1 = centerX + lineStartX;
          const lineY1 = centerY + lineStartY;
          
          // Icon position
          const iconX2 = centerX + iconX;
          const iconY2 = centerY + iconY;
          
          // Calculate line endpoint to connect to the edge of the icon circle (25px radius)
          const iconCenterDistance = Math.sqrt(iconX * iconX + iconY * iconY);
          const iconCircleRadius = 25; // Icon circle radius
          const lineEndDistance = iconCenterDistance - iconCircleRadius;
          const lineEndX = (iconX / iconCenterDistance) * lineEndDistance;
          const lineEndY = (iconY / iconCenterDistance) * lineEndDistance;
          
          // Line coordinates - connect to icon circle edge
          const lineX2 = centerX + lineEndX;
          const lineY2 = centerY + lineEndY;

          // Remove individual debug output to clean up console
          // if (chartType === 'expense') {
          //   console.log(`${item.name}: ${item.segmentProportion.toFixed(1)}% - Rechart: ${item.rechartAngleDeg.toFixed(1)}° → Final: ${item.finalAngleDeg.toFixed(1)}° → Position (${iconX.toFixed(1)}, ${iconY.toFixed(1)})`);
          // }

          return (
            <g key={`${chartType}-${item.name}-${item.index}`}>
              {/* Animated dotted line - smooth flowing animation */}
              <motion.line
                x1={lineX1}
                y1={lineY1}
                x2={lineX2}
                y2={lineY2}
                stroke={item.color}
                strokeWidth="2"
                strokeDasharray="8,4"
                strokeLinecap="round"
                fill="none"
                initial={{ strokeDashoffset: 0, opacity: 0 }}
                animate={{ 
                  strokeDashoffset: [0, -24], // Smooth flowing animation
                  opacity: 1
                }}
                transition={{ 
                  strokeDashoffset: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  },
                  opacity: { 
                    duration: 0.5,
                    delay: 0.2 + index * 0.1
                  }
                }}
                style={{ 
                  filter: `drop-shadow(0 2px 4px ${item.color}40)`
                }}
              />
              
              {/* Small connecting dot at chart edge */}
              <motion.circle
                cx={lineX1}
                cy={lineY1}
                r="3"
                fill={item.color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
              />
              
              {/* Remove debug text */}
              {/* <text
                x={lineX1 + 15}
                y={lineY1 + 5}
                fill={item.color}
                fontSize="9"
                fontWeight="bold"
              >
                {item.isVisuallyMapped ? 'V:' : 'C:'}{item.finalAngleDeg.toFixed(0)}°
              </text> */}
              
              {/* Icon container as foreignObject for proper HTML rendering */}
              <motion.foreignObject
                x={iconX2 - 25}
                y={iconY2 - 25}
                width="50"
                height="50"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.6, type: "spring" }}
                className="overflow-visible"
                style={{ pointerEvents: 'auto' }}
              >
                <div className="relative group cursor-pointer">
                  {/* Icon container with enhanced styling */}
                  <motion.div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl border-2 relative"
                    style={{ 
                      backgroundColor: item.color + '20', 
                      borderColor: item.color,
                      boxShadow: `0 8px 32px ${item.color}30`
                    }}
                    whileHover={{ scale: 1.15, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-xl relative z-10">{item.icon}</span>
                    
                    {/* Pulsing background effect */}
                    <motion.div 
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                      initial={{ scale: 0.8, opacity: 0.3 }}
                      animate={{ 
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0.3, 0.1, 0.3]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                  
                  {/* Enhanced tooltip with percentage and amount - Smart positioning */}
                  <div className="absolute opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 pointer-events-none"
                       style={{
                         left: '50%',
                         transform: 'translateX(-50%)',
                         // Smart positioning: show above icon if it's in bottom half, below if in top half
                         ...(iconY2 > 250 ? {
                           bottom: '100%',
                           marginBottom: '12px'
                         } : {
                           top: '100%',
                           marginTop: '12px'
                         })
                       }}>
                    <motion.div 
                      className="bg-white px-4 py-3 rounded-xl shadow-2xl border-2 text-center min-w-max"
                      style={{ borderColor: item.color + '40' }}
                      initial={{ y: lineY2 > 250 ? 10 : -10, scale: 0.8 }}
                      animate={{ y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm font-bold text-gray-900">{item.name}</span>
                      </div>
                      <div className="text-sm text-gray-700 mb-1">
                        {formatAmount(item.value)}
                      </div>
                      <div 
                        className="text-sm font-bold"
                        style={{ color: item.color }}
                      >
                        {item.percentage.toFixed(1)}%
                      </div>
                      {/* Tooltip arrow - positioned based on tooltip location */}
                      <div 
                        className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent"
                        style={{
                          ...(lineY2 > 250 ? {
                            top: '100%',
                            borderTopColor: 'white',
                            borderTop: '4px solid white'
                          } : {
                            bottom: '100%',
                            borderBottomColor: 'white',
                            borderBottom: '4px solid white'
                          })
                        }}
                      />
                    </motion.div>
                  </div>
                </div>
              </motion.foreignObject>
              
              {/* Percentage text under the icon */}
              <motion.text
                x={iconX2}
                y={iconY2 + 35}
                textAnchor="middle"
                fill={item.color}
                fontSize="12"
                fontWeight="bold"
                className="pointer-events-none"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                style={{ 
                  filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.3))`,
                  textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                }}
              >
                {item.percentage.toFixed(1)}%
              </motion.text>
            </g>
          );
        })}
      </svg>
    );
  };

  const renderChart = (data: any[], total: number, title: string, color: string, type: 'income' | 'expense') => (
    <div className="flex-1">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center mb-6"
      >
        <h3 className="text-2xl font-light text-gray-600 mb-2">{title}</h3>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`text-4xl font-bold ${color} mb-1`}
        >
          {formatAmount(total)}
        </motion.div>
        <div className="text-sm text-gray-500">
          {data.length} categor{data.length === 1 ? 'y' : 'ies'}
        </div>
      </motion.div>

      {/* Chart Container with SVG overlay for dotted lines */}
      <div className="relative" style={{ height: '500px', padding: '50px' }}>
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                {/* Removed Tooltip component */}
              </PieChart>
            </ResponsiveContainer>
            
            {/* Floating Icons with Animated Dotted Lines */}
            {renderFloatingIcons(data, type)}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-30">
                {type === 'income' ? '📈' : '📉'}
              </div>
              <p className="text-gray-500">No {type} data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className={`p-8 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Financial Overview
          </h2>
          <p className="text-gray-600">
            Visual breakdown of your income and expenses by category
          </p>
        </div>

        {/* Charts Side by Side */}
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Income Chart */}
          {renderChart(incomeData, totalIncome, 'Income', 'text-blue-600', 'income')}
          
          {/* Expenses Chart */}
          {renderChart(expenseData, totalExpenses, 'Expenses', 'text-red-600', 'expense')}
        </div>

        {/* Summary Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex items-center justify-center pt-6 border-t border-gray-200"
        >
          <div className="flex items-center space-x-8 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {formatAmount(totalIncome)}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Total Income
              </div>
            </div>
            
            <div className="text-2xl text-gray-300">−</div>
            
            <div>
              <div className="text-lg font-semibold text-red-600">
                {formatAmount(totalExpenses)}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Total Expenses
              </div>
            </div>
            
            <div className="text-2xl text-gray-300">=</div>
            
            <div>
              <div className={`text-xl font-bold ${
                totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatAmount(totalIncome - totalExpenses)}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Net {totalIncome - totalExpenses >= 0 ? 'Surplus' : 'Deficit'}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </Card>
  );
};
