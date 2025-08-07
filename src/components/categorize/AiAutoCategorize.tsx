import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/Button';
import { Transaction, Category } from '@/types';
import { getCategoryColorStyle } from '@/utils/categoryColors';

interface AiAutoCategorizeProps {
  transactions: Transaction[];
  categories: Category[];
  onBatchCategorize: (categorizations: { transactionId: string; categoryName: string; confidence: number }[]) => Promise<void>;
  isProcessing?: boolean;
}

interface AiSuggestion {
  transactionId: string;
  suggestedCategory: string;
  confidence: number;
  reason: string;
  originalDescription: string;
}

export const AiAutoCategorize: React.FC<AiAutoCategorizeProps> = ({
  transactions,
  categories,
  onBatchCategorize,
  isProcessing = false
}) => {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);

  // AI categorization logic (simplified version)
  const generateAiSuggestions = async () => {
    setIsAnalyzing(true);
    
    // Get uncategorized transactions
    const uncategorizedTxns = transactions.filter(t => 
      !t.category_name || t.category_name === 'Uncategorized'
    );

    // Simulate AI processing with rule-based categorization
    const newSuggestions: AiSuggestion[] = [];

    for (const transaction of uncategorizedTxns) {
      const suggestion = await analyzeTransaction(transaction);
      if (suggestion && suggestion.confidence >= confidenceThreshold) {
        newSuggestions.push({
          transactionId: transaction.id,
          suggestedCategory: suggestion.category,
          confidence: suggestion.confidence,
          reason: suggestion.reason,
          originalDescription: transaction.description
        });
      }
    }

    setSuggestions(newSuggestions);
    setSelectedSuggestions(new Set(newSuggestions.map(s => s.transactionId)));
    setIsAnalyzing(false);
  };

  // Simplified AI analysis (in production, this would call an AI service)
  const analyzeTransaction = async (transaction: Transaction): Promise<{
    category: string;
    confidence: number;
    reason: string;
  } | null> => {
    const description = transaction.description.toLowerCase();
    const amount = Math.abs(transaction.amount || 0);

    // Rule-based categorization patterns
    const patterns = [
      {
        keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'mall'],
        category: 'Shopping',
        confidence: 0.9,
        reason: 'E-commerce or shopping-related transaction'
      },
      {
        keywords: ['zomato', 'swiggy', 'uber eats', 'restaurant', 'food', 'cafe'],
        category: 'Food & Dining',
        confidence: 0.85,
        reason: 'Food delivery or dining transaction'
      },
      {
        keywords: ['uber', 'ola', 'rapido', 'metro', 'bus', 'taxi', 'transport'],
        category: 'Transportation',
        confidence: 0.9,
        reason: 'Transportation or travel-related expense'
      },
      {
        keywords: ['netflix', 'spotify', 'prime', 'disney', 'hotstar', 'subscription'],
        category: 'Entertainment',
        confidence: 0.95,
        reason: 'Streaming or entertainment subscription'
      },
      {
        keywords: ['electricity', 'water', 'gas', 'internet', 'mobile', 'bill', 'utility'],
        category: 'Bills & Utilities',
        confidence: 0.9,
        reason: 'Utility bill or service payment'
      },
      {
        keywords: ['hospital', 'clinic', 'doctor', 'pharmacy', 'medical', 'health'],
        category: 'Healthcare',
        confidence: 0.85,
        reason: 'Healthcare or medical expense'
      },
      {
        keywords: ['petrol', 'diesel', 'fuel', 'hp', 'ioc', 'bpcl'],
        category: 'Transportation',
        confidence: 0.9,
        reason: 'Fuel purchase for vehicle'
      },
      {
        keywords: ['atm', 'cash withdrawal', 'withdraw'],
        category: 'Cash & ATM',
        confidence: 0.95,
        reason: 'ATM cash withdrawal'
      }
    ];

    // Income patterns
    const incomePatterns = [
      {
        keywords: ['salary', 'wages', 'bonus', 'incentive', 'commission'],
        category: 'Salary',
        confidence: 0.95,
        reason: 'Employment income'
      },
      {
        keywords: ['interest', 'dividend', 'returns', 'investment'],
        category: 'Investment Returns',
        confidence: 0.9,
        reason: 'Investment income or returns'
      },
      {
        keywords: ['refund', 'cashback', 'reward'],
        category: 'Refunds & Cashback',
        confidence: 0.85,
        reason: 'Refund or cashback credit'
      }
    ];

    // Check if transaction is positive (income) or negative (expense)
    const isIncome = (transaction.amount || 0) > 0;
    const relevantPatterns = isIncome ? incomePatterns : patterns;

    for (const pattern of relevantPatterns) {
      const matchingKeywords = pattern.keywords.filter(keyword => 
        description.includes(keyword)
      );

      if (matchingKeywords.length > 0) {
        // Check if category exists in user's categories
        const categoryExists = categories.some(c => c.name === pattern.category);
        if (categoryExists) {
          return {
            category: pattern.category,
            confidence: pattern.confidence,
            reason: pattern.reason
          };
        }
      }
    }

    // Amount-based categorization for round numbers (likely bills)
    if (!isIncome && amount % 100 === 0 && amount >= 1000) {
      const billsCategory = categories.find(c => c.name === 'Bills & Utilities');
      if (billsCategory) {
        return {
          category: 'Bills & Utilities',
          confidence: 0.7,
          reason: 'Round amount suggests utility bill or regular payment'
        };
      }
    }

    return null;
  };

  const handleSuggestionToggle = (transactionId: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const handleApplySelected = async () => {
    const categorizationsToApply = suggestions
      .filter(s => selectedSuggestions.has(s.transactionId))
      .map(s => ({
        transactionId: s.transactionId,
        categoryName: s.suggestedCategory,
        confidence: s.confidence
      }));

    if (categorizationsToApply.length > 0) {
      await onBatchCategorize(categorizationsToApply);
      setSuggestions([]);
      setSelectedSuggestions(new Set());
    }
  };

  const handleSelectAll = () => {
    setSelectedSuggestions(new Set(suggestions.map(s => s.transactionId)));
  };

  const handleDeselectAll = () => {
    setSelectedSuggestions(new Set());
  };

  const filteredSuggestions = suggestions.filter(s => s.confidence >= confidenceThreshold);

  return (
    <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Auto-Categorization</h3>
            <p className="text-sm text-gray-600">Let AI automatically categorize your transactions</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Confidence:</label>
            <select
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={0.6}>60%+</option>
              <option value={0.7}>70%+</option>
              <option value={0.8}>80%+</option>
              <option value={0.9}>90%+</option>
            </select>
          </div>
          
          <Button
            onClick={generateAiSuggestions}
            variant="primary"
            disabled={isAnalyzing}
            className="text-sm"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Transactions'}
          </Button>
        </div>
      </div>

      {/* Analysis Status */}
      {isAnalyzing && (
        <div className="mb-6 p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <div>
              <div className="text-sm font-medium text-blue-900">Analyzing transactions...</div>
              <div className="text-xs text-blue-700">AI is processing your transaction patterns</div>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          {/* Control Bar */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-900">
                {filteredSuggestions.length} suggestions found
              </span>
              <span className="text-xs text-gray-600">
                {selectedSuggestions.size} selected
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleSelectAll}
                variant="secondary"
                className="text-xs px-3 py-1"
              >
                Select All
              </Button>
              <Button
                onClick={handleDeselectAll}
                variant="secondary"
                className="text-xs px-3 py-1"
              >
                Deselect All
              </Button>
              <Button
                onClick={handleApplySelected}
                variant="primary"
                className="text-xs px-4 py-1"
                disabled={selectedSuggestions.size === 0 || isProcessing}
              >
                {isProcessing ? 'Applying...' : `Apply ${selectedSuggestions.size}`}
              </Button>
            </div>
          </div>

          {/* Suggestions List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredSuggestions.map((suggestion, index) => {
                const isSelected = selectedSuggestions.has(suggestion.transactionId);
                const categoryStyle = getCategoryColorStyle(suggestion.suggestedCategory, categories);
                
                return (
                  <motion.div
                    key={suggestion.transactionId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-white/60 border-gray-200 hover:bg-white/80'
                    }`}
                    onClick={() => handleSuggestionToggle(suggestion.transactionId)}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSuggestionToggle(suggestion.transactionId)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {suggestion.originalDescription}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div 
                              className={`px-2 py-1 rounded-lg text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}
                              style={categoryStyle.style}
                            >
                              {suggestion.suggestedCategory}
                            </div>
                            <div className="text-xs text-gray-600">
                              {Math.round(suggestion.confidence * 100)}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Reason:</span> {suggestion.reason}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && suggestions.length === 0 && (
        <div className="text-center py-8">
          <span className="text-4xl mb-4 block">🤖</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze</h3>
          <p className="text-gray-600 mb-4">
            Click "Analyze Transactions" to let AI suggest categories for your uncategorized transactions.
          </p>
          <div className="text-sm text-gray-500">
            <p>• AI analyzes transaction descriptions and patterns</p>
            <p>• Only high-confidence suggestions are shown</p>
            <p>• You can review and approve each suggestion</p>
          </div>
        </div>
      )}
    </div>
  );
};
