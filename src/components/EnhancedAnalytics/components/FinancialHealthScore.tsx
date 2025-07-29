/**
 * FinancialHealthScore Component
 * Simplified financial health score with clean, elegant design
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/Card';
import { FinancialHealthMetrics } from '../types/analytics.types';

interface FinancialHealthScoreProps {
  metrics: FinancialHealthMetrics;
  loading?: boolean;
  className?: string;
}

export const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({
  metrics,
  loading = false,
  className = ''
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getCircleColor = (score: number) => {
    if (score >= 80) return '#10B981'; // green-500
    if (score >= 60) return '#3B82F6'; // blue-500
    if (score >= 40) return '#F59E0B'; // yellow-500
    return '#EF4444'; // red-500
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
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
      <Card className={`p-6 text-center ${className}`}>
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Financial Health Score</h3>
          <p className="text-sm text-gray-600">Overall financial wellness assessment</p>
        </div>

        {/* Main Score Display */}
        <div className="flex flex-col items-center mb-6">
          {/* Circular Progress */}
          <div className="relative w-28 h-28 mb-4">
            <svg width="112" height="112" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="#E5E7EB"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke={getCircleColor(metrics.score)}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(metrics.score / 100) * 301.6} 301.6`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            
            {/* Score Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(metrics.score)}`}>
                  {Math.round(metrics.score)}
                </div>
                <div className="text-xs text-gray-500">/ 100</div>
              </div>
            </div>
          </div>
          
          <div>
            <p className={`text-lg font-semibold ${getScoreColor(metrics.score)}`}>
              {getScoreStatus(metrics.score)}
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Savings Rate</div>
            <div className="font-semibold text-gray-900">{metrics.savingsRate.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Expense Ratio</div>
            <div className="font-semibold text-gray-900">{metrics.expenseRatio.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Diversification</div>
            <div className="font-semibold text-blue-600">{metrics.categoryDiversification.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Stability</div>
            <div className="font-semibold text-green-600">{metrics.trendStability.toFixed(1)}%</div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};