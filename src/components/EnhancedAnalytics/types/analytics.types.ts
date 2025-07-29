/**
 * Enhanced Analytics Types
 * Types for the comprehensive analytics dashboard
 */

import { Transaction } from '@/types';

export interface DateRange {
  start: string;
  end: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface TrendDataPoint {
  date: string;
  income: number;
  expenses: number;
  netFlow: number;
  runningBalance: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  subcategories?: CategoryBreakdown[];
}

export interface FinancialHealthMetrics {
  score: number;
  savingsRate: number;
  expenseRatio: number;
  categoryDiversification: number;
  trendStability: number;
  recommendations: string[];
}

export interface SpendingGoal {
  id: string;
  category: string;
  budgetAmount: number;
  actualAmount: number;
  progress: number;
  status: 'on-track' | 'warning' | 'over-budget';
  daysRemaining: number;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  categories: string[];
  accounts: string[];
  includeIncome: boolean;
  includeExpenses: boolean;
  groupBy: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface PredictiveInsight {
  type: 'warning' | 'opportunity' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedAction?: string;
}

export interface CashFlowData {
  period: string;
  startingBalance: number;
  income: number;
  expenses: number;
  endingBalance: number;
  netChange: number;
}

export interface AnalyticsData {
  transactions: Transaction[];
  dateRange: DateRange;
  spendingTrends: TrendDataPoint[];
  categoryBreakdown: CategoryBreakdown[];
  incomeVsExpenses: ChartDataPoint[];
  cashFlow: CashFlowData[];
  financialHealth: FinancialHealthMetrics;
  spendingGoals: SpendingGoal[];
  insights: PredictiveInsight[];
}

export interface AnalyticsProps {
  transactions: Transaction[];
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  className?: string;
}

export interface ChartProps {
  data: any[];
  loading?: boolean;
  height?: number;
  className?: string;
}

export interface ExportOptions {
  format: 'png' | 'pdf' | 'csv' | 'excel';
  chartTypes: string[];
  dateRange: DateRange;
  includeRawData: boolean;
}
