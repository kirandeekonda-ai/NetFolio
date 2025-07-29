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
      <Card className={`p-4 h-full flex flex-col ${className}`}>
        <h4 className="font-medium text-gray-900 mb-3">Financial Health Score</h4>
        {/* Compact Horizontal Layout */}
        <div className="flex items-center gap-4 flex-1">
          {/* Left: Circular Score */}
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20">
              <svg width="80" height="80" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#E5E7EB"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke={getCircleColor(metrics.score)}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(metrics.score / 100) * 213.6} 213.6`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              {/* Score Text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-xl font-bold ${getScoreColor(metrics.score)}`}>
                    {Math.round(metrics.score)}
                  </div>
                  <div className="text-xs text-gray-500">/ 100</div>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Score Info and Status */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className={`text-sm font-medium ${getScoreColor(metrics.score)} mb-3`}>
              {getScoreStatus(metrics.score)}
            </p>
            
            {/* Compact Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Savings:</span>
                <span className="ml-1 font-medium">{metrics.savingsRate.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Expenses:</span>
                <span className="ml-1 font-medium">{metrics.expenseRatio.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Diversity:</span>
                <span className="ml-1 font-medium text-blue-600">{metrics.categoryDiversification.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Stability:</span>
                <span className="ml-1 font-medium text-green-600">{metrics.trendStability.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};