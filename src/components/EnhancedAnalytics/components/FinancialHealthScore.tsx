/**
 * FinancialHealthScore Component
 * Overall financial health score with breakdown and recommendations
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
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

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-400 to-green-600';
    if (score >= 60) return 'from-blue-400 to-blue-600';
    if (score >= 40) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const scoreMetrics = [
    {
      label: 'Savings Rate',
      value: metrics.savingsRate,
      target: 20,
      unit: '%',
      icon: '💰'
    },
    {
      label: 'Expense Ratio',
      value: metrics.expenseRatio,
      target: 80,
      unit: '%',
      icon: '📊',
      inverted: true
    }
  ];

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`p-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
            <span className="text-white text-lg">🎯</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Financial Health Score</h3>
            <p className="text-sm text-gray-600">Overall assessment of your financial well-being</p>
          </div>
        </div>

        {/* Main Score Display */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center">
            {/* Circular Progress */}
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(metrics.score / 100) * 314} 314`}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" className={`${getScoreGradient(metrics.score).split(' ')[0].replace('from-', 'stop-')}`} />
                    <stop offset="100%" className={`${getScoreGradient(metrics.score).split(' ')[1].replace('to-', 'stop-')}`} />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Score Text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(metrics.score)}`}>
                    {metrics.score}
                  </div>
                  <div className="text-xs text-gray-500">/ 100</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <p className={`text-lg font-semibold ${getScoreColor(metrics.score)}`}>
              {getScoreLabel(metrics.score)}
            </p>
            <p className="text-sm text-gray-600">
              Your financial health is {getScoreLabel(metrics.score).toLowerCase()}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-gray-900">Score Breakdown</h4>
          {scoreMetrics.map((metric, index) => {
            const progress = metric.inverted 
              ? Math.max(0, (metric.target - metric.value) / metric.target * 100)
              : Math.min(100, (metric.value / metric.target) * 100);
            
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{metric.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {metric.value.toFixed(1)}{metric.unit}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${getScoreGradient(progress)} transition-all duration-1000`}
                    style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Current: {metric.value.toFixed(1)}{metric.unit}</span>
                  <span>Target: {metric.target}{metric.unit}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Recommendations */}
        {metrics.recommendations.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">💡</span>
              Recommendations
            </h4>
            <div className="space-y-3">
              {metrics.recommendations.map((recommendation, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <p className="text-sm text-blue-800">{recommendation}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-6 border-t border-gray-200">
          <Button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
            <span className="flex items-center justify-center space-x-2">
              <span>📈</span>
              <span>Improve Score</span>
            </span>
          </Button>
          <Button variant="secondary" className="flex-1">
            <span className="flex items-center justify-center space-x-2">
              <span>📊</span>
              <span>View Details</span>
            </span>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
