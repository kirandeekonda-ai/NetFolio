import { NextApiRequest, NextApiResponse } from 'next';

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

    // Simple categorization without LLM
    const categorizedTransactions = transactions.map((txn: any, index: number) => {
      const description = (txn.description || '').toLowerCase();
      let category = 'Uncategorized';
      
      if (description.includes('food') || description.includes('restaurant')) {
        category = 'Food';
      } else if (description.includes('gas') || description.includes('fuel')) {
        category = 'Transportation';
      } else if (description.includes('shop') || description.includes('store')) {
        category = 'Shopping';
      }
      
      return {
        ...txn,
        category_name: category,
        confidence: 75
      };
    });

    res.status(200).json({
      finalizedTransactions: categorizedTransactions,
      categorizationSummary: {
        totalTransactions: categorizedTransactions.length,
        categoriesUsed: ['Food', 'Transportation', 'Shopping', 'Uncategorized'],
        highConfidenceCount: categorizedTransactions.length,
        lowConfidenceCount: 0
      }
    });

  } catch (error) {
    console.error('Error in categorization:', error);
    res.status(500).json({ error: 'Categorization failed' });
  }
}
