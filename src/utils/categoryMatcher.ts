import { Category } from '@/types';

interface CategoryMatchResult {
  category: string;
  confidence: number;
  matchType: 'exact' | 'synonym' | 'fuzzy' | 'substring' | 'none';
  reason?: string;
}

/**
 * Enhanced category matcher with fuzzy matching, confidence scoring, and learning capabilities
 */
export class CategoryMatcher {
  private userCategories: Category[];
  private confidenceThreshold: number = 0.7; // Minimum confidence for auto-matching

  constructor(userCategories: Category[]) {
    this.userCategories = userCategories;
  }

  /**
   * Maps an AI-suggested category to a user's existing category using enhanced fuzzy matching
   * @param aiCategory - The category suggested by AI (e.g., "fuel", "shopping", "insurance")
   * @returns The matched user category or "Uncategorized" if no match is found
   */
  matchCategory(aiCategory: string): string {
    const result = this.matchCategoryWithConfidence(aiCategory);
    return result.confidence >= this.confidenceThreshold ? result.category : 'Uncategorized';
  }

  /**
   * Enhanced matching with confidence scoring
   * @param aiCategory - The category suggested by AI
   * @returns CategoryMatchResult with confidence score and match details
   */
  matchCategoryWithConfidence(aiCategory: string): CategoryMatchResult {
    if (!aiCategory || !this.userCategories.length) {
      return {
        category: 'Uncategorized',
        confidence: 0,
        matchType: 'none',
        reason: 'No AI category provided or no user categories available'
      };
    }

    const aiCategoryLower = aiCategory.toLowerCase().trim();
    
    // 1. Try exact match first (confidence: 1.0)
    const exactMatch = this.userCategories.find(cat => 
      cat.name.toLowerCase() === aiCategoryLower
    );
    if (exactMatch) {
      return {
        category: exactMatch.name,
        confidence: 1.0,
        matchType: 'exact',
        reason: `Exact match found for "${aiCategory}"`
      };
    }

    // 2. Try enhanced synonym matching (confidence: 0.9)
    const synonymResult = this.findSynonymMatch(aiCategoryLower);
    if (synonymResult) {
      return synonymResult;
    }

    // 3. Try fuzzy string matching (confidence: 0.8)
    const fuzzyResult = this.findFuzzyMatch(aiCategoryLower);
    if (fuzzyResult) {
      return fuzzyResult;
    }

    // 4. Try substring matching as fallback (confidence: 0.7)
    const substringResult = this.findSubstringMatch(aiCategoryLower);
    if (substringResult) {
      return substringResult;
    }

    // No match found
    return {
      category: 'Uncategorized',
      confidence: 0,
      matchType: 'none',
      reason: `No suitable match found for "${aiCategory}" in user categories`
    };
  }

  /**
   * Find synonym matches using enhanced category mappings
   */
  private findSynonymMatch(aiCategoryLower: string): CategoryMatchResult | null {
    const enhancedCategoryMappings: Record<string, string[]> = {
      // Food & Dining
      'food': ['food', 'dining', 'restaurant', 'grocery', 'groceries', 'eating', 'meal', 'cafe', 'lunch', 'dinner', 'breakfast'],
      'dining': ['dining', 'restaurant', 'food', 'eating', 'meal', 'cafe', 'fast food', 'takeout'],
      'grocery': ['grocery', 'groceries', 'supermarket', 'food shopping', 'provisions'],
      
      // Transportation
      'transport': ['transport', 'transportation', 'travel', 'fuel', 'gas', 'petrol', 'uber', 'taxi', 'car', 'bus', 'train', 'vehicle', 'auto'],
      'fuel': ['fuel', 'gas', 'petrol', 'diesel', 'gasoline', 'station'],
      'taxi': ['taxi', 'uber', 'ola', 'cab', 'ride'],
      
      // Shopping & Retail
      'shopping': ['shopping', 'retail', 'store', 'purchase', 'buy', 'clothes', 'clothing', 'electronics', 'amazon', 'flipkart'],
      'clothing': ['clothing', 'clothes', 'fashion', 'apparel', 'garments'],
      
      // Entertainment
      'entertainment': ['entertainment', 'movie', 'cinema', 'games', 'fun', 'leisure', 'hobby', 'sports', 'recreation'],
      'movies': ['movies', 'cinema', 'theater', 'film'],
      
      // Bills & Utilities
      'utilities': ['utilities', 'electric', 'electricity', 'water', 'gas', 'internet', 'phone', 'mobile', 'bills', 'utility'],
      'electricity': ['electricity', 'electric', 'power', 'energy'],
      'internet': ['internet', 'broadband', 'wifi', 'data'],
      'mobile': ['mobile', 'phone', 'cellular', 'telecom'],
      
      // Financial Services
      'insurance': ['insurance', 'policy', 'premium', 'health insurance', 'life insurance', 'car insurance', 'lic'],
      'investment': ['investment', 'mutual fund', 'sip', 'fd', 'deposit', 'stocks', 'share', 'investments', 'portfolio'],
      'transfer': ['transfer', 'p2p', 'imps', 'neft', 'rtgs', 'upi', 'payment', 'money transfer'],
      
      // Healthcare
      'medical': ['medical', 'health', 'doctor', 'hospital', 'pharmacy', 'medicine', 'dental', 'wellness', 'clinic'],
      'healthcare': ['healthcare', 'health', 'medical', 'doctor', 'hospital'],
      
      // Income
      'salary': ['salary', 'income', 'wages', 'payroll', 'earnings', 'pay'],
      'interest': ['interest', 'dividend', 'return', 'earning', 'income', 'credit interest'],
      
      // Housing
      'rent': ['rent', 'lease', 'housing', 'accommodation'],
      'mortgage': ['mortgage', 'home loan', 'housing loan'],
      
      // Loans & EMI
      'loan': ['loan', 'emi', 'credit', 'debt', 'repayment'],
      'emi': ['emi', 'installment', 'monthly payment'],
      
      // Cash & ATM
      'cash': ['cash', 'atm', 'withdrawal', 'withdraw'],
      'atm': ['atm', 'cash withdrawal', 'withdraw']
    };

    // Find the best matching user category
    for (const [mappingKey, keywords] of Object.entries(enhancedCategoryMappings)) {
      // Check if the AI category matches any keywords
      if (keywords.some(keyword => 
        aiCategoryLower.includes(keyword) || keyword.includes(aiCategoryLower)
      )) {
        // Find user category that matches this mapping
        const matchingUserCategory = this.userCategories.find(cat => {
          const catName = cat.name.toLowerCase();
          return keywords.some(keyword => 
            catName.includes(keyword) || keyword.includes(catName)
          );
        });

        if (matchingUserCategory) {
          return {
            category: matchingUserCategory.name,
            confidence: 0.9,
            matchType: 'synonym',
            reason: `Synonym match: "${aiCategoryLower}" mapped to "${matchingUserCategory.name}"`
          };
        }
      }
    }

    return null;
  }

  /**
   * Find fuzzy matches using Levenshtein distance
   */
  private findFuzzyMatch(aiCategoryLower: string): CategoryMatchResult | null {
    let bestMatch: Category | null = null;
    let bestScore = 0;

    for (const userCategory of this.userCategories) {
      const score = this.calculateSimilarityScore(aiCategoryLower, userCategory.name.toLowerCase());
      if (score > bestScore && score > 0.6) { // Minimum 60% similarity
        bestScore = score;
        bestMatch = userCategory;
      }
    }

    if (bestMatch) {
      return {
        category: bestMatch.name,
        confidence: 0.8 * bestScore, // Scale down confidence for fuzzy matches
        matchType: 'fuzzy',
        reason: `Fuzzy match: "${aiCategoryLower}" similar to "${bestMatch.name}" (${Math.round(bestScore * 100)}% similarity)`
      };
    }

    return null;
  }

  /**
   * Find substring matches
   */
  private findSubstringMatch(aiCategoryLower: string): CategoryMatchResult | null {
    const substringMatch = this.userCategories.find(cat => {
      const catName = cat.name.toLowerCase();
      return catName.includes(aiCategoryLower) || aiCategoryLower.includes(catName);
    });

    if (substringMatch) {
      return {
        category: substringMatch.name,
        confidence: 0.7,
        matchType: 'substring',
        reason: `Substring match: "${aiCategoryLower}" contains or is contained in "${substringMatch.name}"`
      };
    }

    return null;
  }

  /**
   * Calculate similarity score between two strings using a simple algorithm
   */
  private calculateSimilarityScore(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Use a simplified similarity algorithm
    const maxLen = Math.max(len1, len2);
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Updates the user categories for matching
   * @param userCategories - Updated list of user categories
   */
  updateUserCategories(userCategories: Category[]): void {
    this.userCategories = userCategories;
  }

  /**
   * Set confidence threshold for auto-matching
   * @param threshold - Confidence threshold (0.0 to 1.0)
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Get suggestions for improving category matching
   * @param aiCategory - The AI-suggested category
   * @returns Array of suggested improvements
   */
  getSuggestions(aiCategory: string): string[] {
    const result = this.matchCategoryWithConfidence(aiCategory);
    const suggestions: string[] = [];

    if (result.confidence < this.confidenceThreshold) {
      suggestions.push(`Consider adding "${aiCategory}" as a new category`);
      
      if (result.matchType === 'none') {
        suggestions.push('No similar categories found in your list');
      } else {
        suggestions.push(`Best match: "${result.category}" (${Math.round(result.confidence * 100)}% confidence)`);
      }
    }

    return suggestions;
  }
}

/**
 * Creates a new CategoryMatcher instance
 * @param userCategories - The user's predefined categories
 * @returns A new CategoryMatcher instance
 */
export const createCategoryMatcher = (userCategories: Category[]): CategoryMatcher => {
  return new CategoryMatcher(userCategories);
};

/**
 * Simple utility function for quick category matching without creating an instance
 * @param aiCategory - The AI-suggested category
 * @param userCategories - The user's predefined categories
 * @returns The matched category name or "Uncategorized"
 */
export const matchAICategory = (aiCategory: string, userCategories: Category[]): string => {
  const matcher = new CategoryMatcher(userCategories);
  return matcher.matchCategory(aiCategory);
};

/**
 * Utility function for category matching with confidence details
 * @param aiCategory - The AI-suggested category
 * @param userCategories - The user's predefined categories
 * @returns CategoryMatchResult with confidence score and details
 */
export const matchAICategoryWithConfidence = (aiCategory: string, userCategories: Category[]): CategoryMatchResult => {
  const matcher = new CategoryMatcher(userCategories);
  return matcher.matchCategoryWithConfidence(aiCategory);
};

// Export the interface for use in other modules
export type { CategoryMatchResult };
