/**
 * AI Insights Component
 * Provides intelligent financial recommendations and alerts
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';
import { formatAmount } from '@/utils/currency';
import { Transaction } from '@/types';

interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'alert';
  title: string;
  description: string;
  icon: string;
  actionText?: string;
  onAction?: () => void;
  priority: 'high' | 'medium' | 'low';
}

interface AIInsightsProps {
  transactions: Transaction[];
  monthlyIncome: number;
  monthlyExpenses: number;
  categoryData: Array<{ name: string; value: number }>;
  className?: string;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  transactions,
  monthlyIncome,
  monthlyExpenses,
  categoryData,
  className = ''
}) => {
  const insights = useMemo(() => {
    const generatedInsights: Insight[] = [];
    
    // Calculate current month data - exclude internal transfers
    const currentMonth = new Date();
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date || t.transaction_date);
      return transactionDate.getMonth() === currentMonth.getMonth() &&
             transactionDate.getFullYear() === currentMonth.getFullYear() &&
             !t.is_internal_transfer;
    });

    // Previous month data for comparison - exclude internal transfers
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const previousMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date || t.transaction_date);
      return transactionDate.getMonth() === previousMonth.getMonth() &&
             transactionDate.getFullYear() === previousMonth.getFullYear() &&
             !t.is_internal_transfer;
    });

    const currentExpenses = currentMonthTransactions
      .filter(t => (t.type || t.transaction_type) === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const previousExpenses = previousMonthTransactions
      .filter(t => (t.type || t.transaction_type) === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Income vs Expenses Analysis
    const netIncome = monthlyIncome - monthlyExpenses;
    const spendingRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;

    if (netIncome < 0) {
      generatedInsights.push({
        id: 'negative-cash-flow',
        type: 'warning',
        title: 'Negative Cash Flow',
        description: `You're spending ${formatAmount(Math.abs(netIncome))} more than you earn this month.`,
        icon: '⚠️',
        priority: 'high',
        actionText: 'Review Categories'
      });
    } else if (netIncome > 0) {
      const savingsRate = (netIncome / monthlyIncome) * 100;
      if (savingsRate >= 20) {
        generatedInsights.push({
          id: 'excellent-savings',
          type: 'success',
          title: 'Excellent Savings Rate!',
          description: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep up the great work!`,
          icon: '🌟',
          priority: 'medium'
        });
      } else if (savingsRate >= 10) {
        generatedInsights.push({
          id: 'good-savings',
          type: 'success',
          title: 'Good Savings Progress',
          description: `You're saving ${savingsRate.toFixed(1)}% of your income. Consider increasing to 20% if possible.`,
          icon: '👍',
          priority: 'low'
        });
      } else {
        generatedInsights.push({
          id: 'low-savings',
          type: 'info',
          title: 'Room for Improvement',
          description: `Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 10% of your income.`,
          icon: '📈',
          priority: 'medium'
        });
      }
    }

    // Spending trend analysis
    if (previousExpenses > 0 && currentExpenses > 0) {
      const spendingChange = ((currentExpenses - previousExpenses) / previousExpenses) * 100;
      
      if (spendingChange > 20) {
        generatedInsights.push({
          id: 'spending-spike',
          type: 'alert',
          title: 'Spending Spike Detected',
          description: `Your expenses increased by ${spendingChange.toFixed(1)}% compared to last month.`,
          icon: '📊',
          priority: 'high'
        });
      } else if (spendingChange < -10) {
        generatedInsights.push({
          id: 'spending-reduction',
          type: 'success',
          title: 'Great Cost Control!',
          description: `You reduced spending by ${Math.abs(spendingChange).toFixed(1)}% this month.`,
          icon: '🎯',
          priority: 'medium'
        });
      }
    }

    // Category analysis
    if (categoryData.length > 0) {
      const topCategory = categoryData[0];
      const topCategoryPercentage = monthlyExpenses > 0 ? (topCategory.value / monthlyExpenses) * 100 : 0;
      
      if (topCategoryPercentage > 40) {
        generatedInsights.push({
          id: 'category-concentration',
          type: 'info',
          title: 'High Category Concentration',
          description: `${topCategory.name} accounts for ${topCategoryPercentage.toFixed(1)}% of your spending.`,
          icon: '🥧',
          priority: 'medium'
        });
      }

      // Check for dining out category
      const diningCategory = categoryData.find(cat => 
        cat.name.toLowerCase().includes('dining') || 
        cat.name.toLowerCase().includes('restaurant') ||
        cat.name.toLowerCase().includes('food')
      );
      
      if (diningCategory && monthlyExpenses > 0) {
        const diningPercentage = (diningCategory.value / monthlyExpenses) * 100;
        if (diningPercentage > 15) {
          generatedInsights.push({
            id: 'dining-high',
            type: 'info',
            title: 'High Dining Expenses',
            description: `Dining out represents ${diningPercentage.toFixed(1)}% of your spending (${formatAmount(diningCategory.value)}).`,
            icon: '🍽️',
            priority: 'low'
          });
        }
      }
    }

    // Runway calculation
    if (netIncome > 0 && monthlyExpenses > 0) {
      const monthsOfRunway = netIncome > 0 ? Math.floor(netIncome / (monthlyExpenses / 30)) : 0;
      if (monthsOfRunway > 30) {
        generatedInsights.push({
          id: 'high-runway',
          type: 'success',
          title: 'Strong Financial Buffer',
          description: `At current savings rate, you add ${monthsOfRunway} days to your financial runway each month.`,
          icon: '🛡️',
          priority: 'low'
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return generatedInsights.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }, [transactions, monthlyIncome, monthlyExpenses, categoryData]);

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'warning': return 'border-orange-200 bg-orange-50';
      case 'alert': return 'border-red-200 bg-red-50';
      case 'success': return 'border-green-200 bg-green-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getIconColor = (type: Insight['type']) => {
    switch (type) {
      case 'warning': return 'text-orange-600';
      case 'alert': return 'text-red-600';
      case 'success': return 'text-green-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (insights.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Insights</h3>
          <p className="text-gray-600">
            Add more transactions to get personalized financial insights and recommendations.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={className}
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <span className="text-white text-lg">🤖</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">AI Financial Insights</h3>
              <p className="text-sm text-gray-600">Personalized recommendations for your financial health</p>
            </div>
          </div>
          <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            {insights.length} insights
          </div>
        </div>

        <div className="space-y-4">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`p-4 rounded-lg border ${getInsightColor(insight.type)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start space-x-3">
                <div className={`text-2xl ${getIconColor(insight.type)} flex-shrink-0`}>
                  {insight.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 text-sm">{insight.title}</h4>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                      insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {insight.priority}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mt-1 leading-relaxed">
                    {insight.description}
                  </p>
                  {insight.actionText && insight.onAction && (
                    <div className="mt-3">
                      <Button
                        onClick={insight.onAction}
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                      >
                        {insight.actionText}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            💡 These insights are generated based on your transaction patterns and financial data
          </p>
        </div>
      </Card>
    </motion.div>
  );
};
