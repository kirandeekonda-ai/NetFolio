import { NextApiRequest, NextApiResponse } from 'next';
import { createCategoryMatcher } from '@/utils/categoryMatcher';
import { Category } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactions, userCategories } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ 
        error: 'Missing or invalid transactions array' 
      });
    }

    console.log(`🎯 ENHANCED CATEGORIZATION - Processing ${transactions.length} transactions with ${userCategories?.length || 0} user categories`);

    // Create user categories array in the expected format
    const categories: Category[] = (userCategories || []).map((name: string) => ({
      id: `cat-${Date.now()}-${Math.random()}`,
      name,
      user_id: '',
      type: 'custom' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Use enhanced CategoryMatcher if user categories are available
    const categoryMatcher = categories.length > 0 ? createCategoryMatcher(categories) : null;

    const categorizedTransactions = transactions.map((txn: any, index: number) => {
      const description = txn.description || '';
      let finalCategory = 'Uncategorized';
      let confidence = 0;
      let matchType = 'none';
      let reason = 'No category matching available';

      // Check if AI provided a suggested category
      const aiCategory = txn.suggested_category || txn.category;
      
      if (categoryMatcher && aiCategory && aiCategory.trim() && aiCategory !== 'N/A') {
        // Use enhanced category matching with confidence scoring
        const matchResult = categoryMatcher.matchCategoryWithConfidence(aiCategory.trim());
        finalCategory = matchResult.category;
        confidence = Math.round(matchResult.confidence * 100);
        matchType = matchResult.matchType;
        reason = matchResult.reason || '';
        
        console.log(`🎯 Enhanced AI category matching for "${aiCategory}":`, {
          originalCategory: aiCategory,
          matchedCategory: matchResult.category,
          confidence: confidence + '%',
          matchType: matchResult.matchType,
          reason: matchResult.reason
        });
      } else if (categories.length === 0) {
        // Fallback to simple pattern matching if no user categories
        const desc = description.toLowerCase();
        if (desc.includes('food') || desc.includes('restaurant') || desc.includes('dining')) {
          finalCategory = 'Food';
          confidence = 60;
          matchType = 'pattern';
          reason = 'Simple pattern match for food-related keywords';
        } else if (desc.includes('gas') || desc.includes('fuel') || desc.includes('petrol')) {
          finalCategory = 'Transportation';
          confidence = 60;
          matchType = 'pattern';
          reason = 'Simple pattern match for fuel-related keywords';
        } else if (desc.includes('shop') || desc.includes('store') || desc.includes('amazon')) {
          finalCategory = 'Shopping';
          confidence = 60;
          matchType = 'pattern';
          reason = 'Simple pattern match for shopping-related keywords';
        }
      }
      
      return {
        ...txn,
        category_name: finalCategory,
        category: finalCategory, // Legacy compatibility
        confidence,
        matchType,
        reason
      };
    });

    // Calculate categorization summary statistics
    const categoryStats = categorizedTransactions.reduce((stats, txn) => {
      const category = txn.category_name;
      stats[category] = (stats[category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    const highConfidenceCount = categorizedTransactions.filter(txn => txn.confidence >= 70).length;
    const mediumConfidenceCount = categorizedTransactions.filter(txn => txn.confidence >= 50 && txn.confidence < 70).length;
    const lowConfidenceCount = categorizedTransactions.filter(txn => txn.confidence < 50).length;
    const uncategorizedCount = categorizedTransactions.filter(txn => txn.category_name === 'Uncategorized').length;

    console.log(`✅ Enhanced categorization complete:`, {
      total: categorizedTransactions.length,
      highConfidence: highConfidenceCount,
      mediumConfidence: mediumConfidenceCount,
      lowConfidence: lowConfidenceCount,
      uncategorized: uncategorizedCount,
      categoryDistribution: categoryStats
    });

    res.status(200).json({
      finalizedTransactions: categorizedTransactions,
      categorizationSummary: {
        totalTransactions: categorizedTransactions.length,
        categoriesUsed: Object.keys(categoryStats),
        categoryDistribution: categoryStats,
        highConfidenceCount,
        mediumConfidenceCount,
        lowConfidenceCount,
        uncategorizedCount,
        enhancedMatchingUsed: !!categoryMatcher,
        userCategoriesProvided: categories.length
      }
    });

  } catch (error) {
    console.error('Error in categorization:', error);
    res.status(500).json({ error: 'Categorization failed' });
  }
}
