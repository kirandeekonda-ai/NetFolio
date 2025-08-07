import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, Category } from '@/types';
import { formatAmount } from '@/utils/currency';
import { getCategoryColorStyle } from '@/utils/categoryColors';

interface TransactionInsightsProps {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  onApplySuggestion: (transactionIds: string[], category: Category) => void;
}

interface CategorySuggestion {
  category: Category;
  transactionIds: string[];
  confidence: number;
  reason: string;
  examples: string[];
}

interface SpendingPattern {
  category: string;
  count: number;
  totalAmount: number;
  averageAmount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export const TransactionInsights: React.FC<TransactionInsightsProps> = ({
  transactions,
  categories,
  currency,
  onApplySuggestion
}) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'patterns' | 'anomalies'>('suggestions');

  // Generate AI-powered category suggestions
  const categorysuggestions = useMemo((): CategorySuggestion[] => {
    const uncategorizedTxns = transactions.filter(t => 
      !t.category_name || t.category_name === 'Uncategorized'
    );

    const suggestions: CategorySuggestion[] = [];

    // Group similar transactions by description patterns
    const descriptionGroups = new Map<string, Transaction[]>();
    
    uncategorizedTxns.forEach(txn => {
      const description = txn.description.toLowerCase();
      
      // Find similar descriptions
      const similarKey = Array.from(descriptionGroups.keys()).find(key => {
        const similarity = calculateSimilarity(key, description);
        return similarity > 0.7; // 70% similarity threshold
      });

      if (similarKey) {
        descriptionGroups.get(similarKey)!.push(txn);
      } else {
        descriptionGroups.set(description, [txn]);
      }
    });

    // Generate suggestions for groups with multiple transactions
    descriptionGroups.forEach((txns, pattern) => {
      if (txns.length >= 2) {
        const suggestedCategory = suggestCategoryFromPattern(pattern, categories);
        if (suggestedCategory) {
          suggestions.push({
            category: suggestedCategory,
            transactionIds: txns.map(t => t.id),
            confidence: Math.min(0.95, 0.6 + (txns.length * 0.1)),
            reason: `Similar transaction pattern: "${pattern.substring(0, 30)}..."`,
            examples: txns.slice(0, 3).map(t => t.description)
          });
        }
      }
    });

    // Generate suggestions based on amount patterns
    const amountBasedSuggestions = generateAmountBasedSuggestions(uncategorizedTxns, categories);
    suggestions.push(...amountBasedSuggestions);

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }, [transactions, categories]);

  // Analyze spending patterns
  const spendingPatterns = useMemo((): SpendingPattern[] => {
    const categorizedTxns = transactions.filter(t => 
      t.category_name && t.category_name !== 'Uncategorized'
    );

    const patternMap = new Map<string, Transaction[]>();
    categorizedTxns.forEach(txn => {
      const category = txn.category_name!;
      if (!patternMap.has(category)) {
        patternMap.set(category, []);
      }
      patternMap.get(category)!.push(txn);
    });

    const patterns: SpendingPattern[] = [];
    patternMap.forEach((txns, category) => {
      const totalAmount = txns.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      const averageAmount = totalAmount / txns.length;
      
      // Simple trend analysis (comparing first half vs second half)
      const midpoint = Math.floor(txns.length / 2);
      const firstHalf = txns.slice(0, midpoint);
      const secondHalf = txns.slice(midpoint);
      
      const firstHalfAvg = firstHalf.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) / secondHalf.length;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (secondHalfAvg > firstHalfAvg * 1.2) trend = 'increasing';
      else if (secondHalfAvg < firstHalfAvg * 0.8) trend = 'decreasing';

      patterns.push({
        category,
        count: txns.length,
        totalAmount,
        averageAmount,
        trend
      });
    });

    return patterns.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [transactions]);

  // Detect anomalies
  const anomalies = useMemo(() => {
    const categorizedTxns = transactions.filter(t => 
      t.category_name && t.category_name !== 'Uncategorized' && t.amount
    );

    const anomalousTransactions: Transaction[] = [];
    
    // Group by category to find outliers
    const categoryGroups = new Map<string, number[]>();
    categorizedTxns.forEach(txn => {
      const category = txn.category_name!;
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(Math.abs(txn.amount!));
    });

    // Find outliers using IQR method
    categoryGroups.forEach((amounts, category) => {
      if (amounts.length < 3) return;
      
      amounts.sort((a, b) => a - b);
      const q1 = amounts[Math.floor(amounts.length * 0.25)];
      const q3 = amounts[Math.floor(amounts.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      categorizedTxns.forEach(txn => {
        if (txn.category_name === category) {
          const amount = Math.abs(txn.amount!);
          if (amount < lowerBound || amount > upperBound) {
            anomalousTransactions.push(txn);
          }
        }
      });
    });

    return anomalousTransactions.slice(0, 10);
  }, [transactions]);

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const suggestCategoryFromPattern = (pattern: string, categories: Category[]): Category | null => {
    // Simple keyword-based category matching
    const keywords = {
      'Food & Dining': ['restaurant', 'food', 'cafe', 'dining', 'delivery', 'uber eats', 'zomato', 'swiggy'],
      'Transportation': ['uber', 'ola', 'transport', 'metro', 'bus', 'taxi', 'fuel', 'petrol'],
      'Shopping': ['amazon', 'flipkart', 'shop', 'store', 'mall', 'purchase'],
      'Entertainment': ['movie', 'netflix', 'spotify', 'game', 'entertainment', 'ticket'],
      'Bills & Utilities': ['electricity', 'water', 'gas', 'internet', 'phone', 'bill', 'utility'],
      'Healthcare': ['hospital', 'doctor', 'pharmacy', 'medical', 'health', 'clinic'],
      'Subscriptions': ['subscription', 'monthly', 'annual', 'recurring']
    };

    for (const [categoryName, keywordList] of Object.entries(keywords)) {
      const category = categories.find(c => c.name === categoryName);
      if (category && keywordList.some(keyword => pattern.includes(keyword))) {
        return category;
      }
    }

    return null;
  };

  const generateAmountBasedSuggestions = (transactions: Transaction[], categories: Category[]): CategorySuggestion[] => {
    const suggestions: CategorySuggestion[] = [];
    
    // Find transactions with round amounts (likely bills)
    const roundAmountTxns = transactions.filter(t => 
      t.amount && Math.abs(t.amount) % 100 === 0 && Math.abs(t.amount) >= 1000
    );
    
    if (roundAmountTxns.length >= 2) {
      const billsCategory = categories.find(c => c.name === 'Bills & Utilities');
      if (billsCategory) {
        suggestions.push({
          category: billsCategory,
          transactionIds: roundAmountTxns.map(t => t.id),
          confidence: 0.75,
          reason: 'Round amounts suggest utility bills or regular payments',
          examples: roundAmountTxns.slice(0, 3).map(t => t.description)
        });
      }
    }

    return suggestions;
  };

  const tabs = [
    { id: 'suggestions', label: 'AI Suggestions', icon: '🤖' },
    { id: 'patterns', label: 'Spending Patterns', icon: '📊' },
    { id: 'anomalies', label: 'Anomalies', icon: '⚠️' }
  ];

  return (
    <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-6">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
            <span className="text-xl">💡</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Transaction Insights</h3>
            <p className="text-sm text-gray-600">AI-powered analysis and suggestions</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100/50 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'suggestions' && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {categorysuggestions.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">🎉</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Done!</h3>
                <p className="text-gray-600">No categorization suggestions at the moment.</p>
              </div>
            ) : (
              categorysuggestions.map((suggestion, index) => {
                const categoryStyle = getCategoryColorStyle(suggestion.category.name, categories);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/60 rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div 
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${categoryStyle.bg} ${categoryStyle.text}`}
                          style={categoryStyle.style}
                        >
                          {suggestion.category.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </div>
                      </div>
                      <button
                        onClick={() => onApplySuggestion(suggestion.transactionIds, suggestion.category)}
                        className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Apply ({suggestion.transactionIds.length})
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{suggestion.reason}</p>
                    
                    <div className="text-xs text-gray-500">
                      <strong>Examples:</strong> {suggestion.examples.join(', ')}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === 'patterns' && (
          <motion.div
            key="patterns"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {spendingPatterns.map((pattern, index) => {
              const categoryStyle = getCategoryColorStyle(pattern.category, categories);
              return (
                <motion.div
                  key={pattern.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/60 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div 
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${categoryStyle.bg} ${categoryStyle.text}`}
                        style={categoryStyle.style}
                      >
                        {pattern.category}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        pattern.trend === 'increasing' ? 'bg-red-100 text-red-700' :
                        pattern.trend === 'decreasing' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {pattern.trend === 'increasing' ? '📈 Increasing' :
                         pattern.trend === 'decreasing' ? '📉 Decreasing' :
                         '➡️ Stable'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Transactions</div>
                      <div className="font-semibold">{pattern.count}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total Spent</div>
                      <div className="font-semibold">{formatAmount(pattern.totalAmount, currency)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Average</div>
                      <div className="font-semibold">{formatAmount(pattern.averageAmount, currency)}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'anomalies' && (
          <motion.div
            key="anomalies"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {anomalies.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">✅</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Anomalies Detected</h3>
                <p className="text-gray-600">All transactions appear normal for their categories.</p>
              </div>
            ) : (
              anomalies.map((transaction, index) => {
                const categoryStyle = getCategoryColorStyle(transaction.category_name || 'Uncategorized', categories);
                return (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/60 rounded-xl p-4 border border-orange-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div 
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${categoryStyle.bg} ${categoryStyle.text}`}
                            style={categoryStyle.style}
                          >
                            {transaction.category_name}
                          </div>
                          <div className="text-sm text-orange-600 font-medium">
                            Unusual Amount
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-900 font-medium mb-1">
                          {transaction.description}
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {new Date(transaction.transaction_date).toLocaleDateString()} • 
                          <span className={`ml-1 font-semibold ${
                            (transaction.amount || 0) > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatAmount(transaction.amount || 0, currency)}
                          </span>
                        </div>
                      </div>
                      
                      <button className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                        Review →
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
