/**
 * Enhanced Income vs Spending Component
 * Clear visual comparison with net savings/deficit
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { formatAmount } from '@/utils/currency';

interface IncomeVsSpendingProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  className?: string;
}

export const IncomeVsSpending: React.FC<IncomeVsSpendingProps> = ({
  monthlyIncome,
  monthlyExpenses,
  className = ''
}) => {
  const netAmount = monthlyIncome - monthlyExpenses;
  const spendingRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;
  const savingsRate = monthlyIncome > 0 ? (netAmount / monthlyIncome) * 100 : 0;

  // Calculate bar widths for visual representation
  const maxAmount = Math.max(monthlyIncome, monthlyExpenses);
  const incomeWidth = maxAmount > 0 ? (monthlyIncome / maxAmount) * 100 : 0;
  const expenseWidth = maxAmount > 0 ? (monthlyExpenses / maxAmount) * 100 : 0;

  const getNetStatusColor = () => {
    if (netAmount > 0) return 'text-green-600 bg-green-50 border-green-200';
    if (netAmount < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getNetStatusIcon = () => {
    if (netAmount > 0) return '💰';
    if (netAmount < 0) return '⚠️';
    return '⚖️';
  };

  const getSpendingStatusMessage = () => {
    if (spendingRatio > 100) {
      return 'You are overspending';
    } else if (spendingRatio > 90) {
      return 'High spending ratio';
    } else if (spendingRatio > 70) {
      return 'Moderate spending';
    } else {
      return 'Conservative spending';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={className}
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
              <span className="text-white text-lg">⚖️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Income vs Spending</h3>
              <p className="text-sm text-gray-600">Monthly financial health snapshot</p>
            </div>
          </div>
        </div>

        {/* Visual Comparison Bars */}
        <div className="space-y-6 mb-6">
          {/* Income Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Income
              </span>
              <span className="text-lg font-bold text-green-600">
                {formatAmount(monthlyIncome)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${incomeWidth}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full"
              />
            </div>
          </div>

          {/* Expenses Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Expenses
              </span>
              <span className="text-lg font-bold text-red-600">
                {formatAmount(monthlyExpenses)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${expenseWidth}%` }}
                transition={{ duration: 1, delay: 0.7 }}
                className="bg-gradient-to-r from-red-400 to-red-600 h-3 rounded-full"
              />
            </div>
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-500">
                {spendingRatio.toFixed(1)}% of income
              </span>
            </div>
          </div>
        </div>

        {/* Net Result */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className={`p-4 rounded-lg border-2 ${getNetStatusColor()}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getNetStatusIcon()}</span>
              <div>
                <h4 className="font-semibold">
                  {netAmount >= 0 ? 'Net Savings' : 'Net Deficit'}
                </h4>
                <p className="text-sm opacity-75">
                  {getSpendingStatusMessage()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {netAmount >= 0 ? '+' : ''}{formatAmount(netAmount)}
              </div>
              <div className="text-sm opacity-75">
                {Math.abs(savingsRate).toFixed(1)}% of income
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Insights */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {spendingRatio.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Spending Ratio
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              savingsRate >= 20 ? 'text-green-600' : 
              savingsRate >= 10 ? 'text-yellow-600' : 
              savingsRate >= 0 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {savingsRate.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Savings Rate
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {spendingRatio > 90 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600">💡</span>
              <div className="text-sm text-yellow-800">
                <strong>Tip:</strong> Consider reviewing your largest expense categories to identify potential savings opportunities.
              </div>
            </div>
          </motion.div>
        )}

        {savingsRate >= 20 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <span className="text-green-600">🎉</span>
              <div className="text-sm text-green-800">
                <strong>Excellent!</strong> You're saving at least 20% of your income. Consider investing this surplus for long-term growth.
              </div>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};
