/**
 * useAnalyticsData Hook
 * Processes transaction data for analytics visualization
 */

import { useMemo } from 'react';
import { Transaction } from '@/types';
import { 
  DateRange, 
  TrendDataPoint, 
  CategoryBreakdown, 
  ChartDataPoint,
  CashFlowData,
  AnalyticsData 
} from '../types/analytics.types';

const CATEGORY_COLORS = [
  '#5A67D8', '#FA8072', '#4A54B3', '#E5675A', '#8B96E5',
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
];

export const useAnalyticsData = (
  transactions: Transaction[], 
  dateRange: DateRange
): AnalyticsData => {
  return useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        transactions: [],
        dateRange,
        spendingTrends: [],
        categoryBreakdown: [],
        incomeVsExpenses: [],
        cashFlow: [],
        financialHealth: {
          score: 0,
          savingsRate: 0,
          expenseRatio: 0,
          categoryDiversification: 0,
          trendStability: 0,
          recommendations: []
        },
        spendingGoals: [],
        insights: []
      };
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Filter transactions for date range
    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.transaction_date || transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Calculate spending trends
    const spendingTrends = calculateSpendingTrends(filteredTransactions, startDate, endDate);
    
    // Calculate category breakdown
    const categoryBreakdown = calculateCategoryBreakdown(filteredTransactions);
    
    // Calculate income vs expenses
    const incomeVsExpenses = calculateIncomeVsExpenses(filteredTransactions);
    
    // Calculate cash flow
    const cashFlow = calculateCashFlow(filteredTransactions, startDate, endDate);
    
    // Calculate financial health
    const financialHealth = calculateFinancialHealth(filteredTransactions);

    return {
      transactions: filteredTransactions,
      dateRange,
      spendingTrends,
      categoryBreakdown,
      incomeVsExpenses,
      cashFlow,
      financialHealth,
      spendingGoals: [], // Will be implemented in Phase 3
      insights: [] // Will be implemented with AI integration
    };
  }, [transactions, dateRange]);
};

const calculateSpendingTrends = (
  transactions: Transaction[], 
  startDate: Date, 
  endDate: Date
): TrendDataPoint[] => {
  // Determine aggregation level based on date range
  const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Choose aggregation strategy based on range
  let aggregationType: 'daily' | 'weekly' | 'monthly';
  if (diffInDays <= 31) {
    aggregationType = 'daily';
  } else if (diffInDays <= 180) {
    aggregationType = 'weekly';
  } else {
    aggregationType = 'monthly';
  }

  const aggregatedData = new Map<string, { income: number; expenses: number; period: Date }>();
  let runningBalance = 0;

  // Aggregate transactions based on chosen strategy
  transactions.forEach(transaction => {
    const transactionDate = new Date(transaction.transaction_date || transaction.date);
    let periodKey: string;
    let periodDate: Date;

    switch (aggregationType) {
      case 'daily':
        periodKey = transactionDate.toISOString().split('T')[0];
        periodDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
        break;
      case 'weekly':
        // Get start of week (Monday)
        const weekStart = new Date(transactionDate);
        weekStart.setDate(transactionDate.getDate() - transactionDate.getDay() + 1);
        periodKey = weekStart.toISOString().split('T')[0];
        periodDate = weekStart;
        break;
      case 'monthly':
        periodKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
        periodDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);
        break;
    }

    if (!aggregatedData.has(periodKey)) {
      aggregatedData.set(periodKey, { income: 0, expenses: 0, period: periodDate });
    }

    const periodData = aggregatedData.get(periodKey)!;
    const type = transaction.transaction_type || transaction.type;
    
    if (type === 'income') {
      periodData.income += transaction.amount;
    } else if (type === 'expense') {
      periodData.expenses += Math.abs(transaction.amount);
    }
  });

  // Convert to trend data points and sort by date
  return Array.from(aggregatedData.entries())
    .map(([dateKey, data]) => {
      const netFlow = data.income - data.expenses;
      runningBalance += netFlow;
      
      return {
        date: data.period.toISOString().split('T')[0],
        income: data.income,
        expenses: data.expenses,
        netFlow,
        runningBalance
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((point, index, array) => {
      // Recalculate running balance properly after sorting
      if (index === 0) {
        point.runningBalance = point.netFlow;
      } else {
        point.runningBalance = array[index - 1].runningBalance + point.netFlow;
      }
      return point;
    });
};

const calculateCategoryBreakdown = (transactions: Transaction[]): CategoryBreakdown[] => {
  const categoryTotals = new Map<string, number>();
  let totalExpenses = 0;

  // Aggregate expenses by category
  transactions
    .filter(t => (t.transaction_type || t.type) === 'expense')
    .forEach(transaction => {
      const category = transaction.category_name || transaction.category || 'Uncategorized';
      const amount = Math.abs(transaction.amount);
      
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
      totalExpenses += amount;
    });

  // Convert to breakdown data
  return Array.from(categoryTotals.entries())
    .map(([category, amount], index) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }))
    .sort((a, b) => b.amount - a.amount);
};

const calculateIncomeVsExpenses = (transactions: Transaction[]): any[] => {
  const monthlyData = new Map<string, { income: number; expenses: number }>();

  transactions.forEach(transaction => {
    const date = new Date(transaction.transaction_date || transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { income: 0, expenses: 0 });
    }
    
    const monthData = monthlyData.get(monthKey)!;
    const type = transaction.transaction_type || transaction.type;
    
    if (type === 'income') {
      monthData.income += transaction.amount;
    } else if (type === 'expense') {
      monthData.expenses += Math.abs(transaction.amount);
    }
  });

  return Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      name: new Date(month + '-01').toLocaleDateString('default', { month: 'short', year: 'numeric' }),
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const calculateCashFlow = (
  transactions: Transaction[], 
  startDate: Date, 
  endDate: Date
): CashFlowData[] => {
  // Group by month for cash flow analysis
  const monthlyData = new Map<string, Transaction[]>();
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.transaction_date || transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, []);
    }
    monthlyData.get(monthKey)!.push(transaction);
  });

  let runningBalance = 0;
  
  return Array.from(monthlyData.entries())
    .map(([month, monthTransactions]) => {
      const startingBalance = runningBalance;
      
      const income = monthTransactions
        .filter(t => (t.transaction_type || t.type) === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = monthTransactions
        .filter(t => (t.transaction_type || t.type) === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const netChange = income - expenses;
      runningBalance += netChange;
      
      return {
        period: new Date(month + '-01').toLocaleDateString('default', { month: 'short', year: 'numeric' }),
        startingBalance,
        income,
        expenses,
        endingBalance: runningBalance,
        netChange
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
};

const calculateFinancialHealth = (transactions: Transaction[]) => {
  const totalIncome = transactions
    .filter(t => (t.transaction_type || t.type) === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => (t.transaction_type || t.type) === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  // Simple scoring algorithm
  let score = 50; // Base score
  
  if (savingsRate > 20) score += 20;
  else if (savingsRate > 10) score += 10;
  else if (savingsRate < 0) score -= 20;
  
  if (expenseRatio < 80) score += 15;
  else if (expenseRatio > 100) score -= 15;

  score = Math.max(0, Math.min(100, score));

  const recommendations = [];
  if (savingsRate < 10) recommendations.push('Increase your savings rate to at least 10%');
  if (expenseRatio > 90) recommendations.push('Reduce expenses to improve financial health');
  if (score < 60) recommendations.push('Consider creating a detailed budget plan');

  return {
    score,
    savingsRate,
    expenseRatio,
    categoryDiversification: 0, // To be calculated with more complex logic
    trendStability: 0, // To be calculated with variance analysis
    recommendations
  };
};
