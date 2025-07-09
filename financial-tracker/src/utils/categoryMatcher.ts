import { Category } from '@/types';

/**
 * Matches AI-suggested categories with user's predefined categories using fuzzy matching
 */
export class CategoryMatcher {
  private userCategories: Category[];

  constructor(userCategories: Category[]) {
    this.userCategories = userCategories;
  }

  /**
   * Maps an AI-suggested category to a user's existing category using fuzzy matching
   * @param aiCategory - The category suggested by AI (e.g., "fuel", "shopping", "insurance")
   * @returns The matched user category or "Uncategorized" if no match is found
   */
  matchCategory(aiCategory: string): string {
    if (!aiCategory || !this.userCategories.length) {
      return 'Uncategorized';
    }

    const aiCategoryLower = aiCategory.toLowerCase();
    
    // Try exact match first
    const exactMatch = this.userCategories.find(cat => 
      cat.name.toLowerCase() === aiCategoryLower
    );
    if (exactMatch) {
      return exactMatch.name;
    }

    // Try partial matching using common category mappings
    const categoryMappings: Record<string, string[]> = {
      'food': ['food', 'dining', 'restaurant', 'grocery', 'groceries', 'eating', 'meal'],
      'transport': ['transport', 'transportation', 'travel', 'fuel', 'gas', 'petrol', 'uber', 'taxi', 'car', 'bus', 'train'],
      'shopping': ['shopping', 'retail', 'store', 'purchase', 'buy', 'clothes', 'clothing', 'electronics'],
      'entertainment': ['entertainment', 'movie', 'cinema', 'games', 'fun', 'leisure', 'hobby'],
      'utilities': ['utilities', 'electric', 'electricity', 'water', 'gas', 'internet', 'phone', 'mobile'],
      'insurance': ['insurance', 'policy', 'premium', 'health', 'life', 'car insurance'],
      'medical': ['medical', 'health', 'doctor', 'hospital', 'pharmacy', 'medicine', 'dental'],
      'transfer': ['transfer', 'p2p', 'imps', 'neft', 'rtgs', 'upi', 'payment'],
      'investment': ['investment', 'mutual fund', 'sip', 'fd', 'deposit', 'stocks', 'share'],
      'interest': ['interest', 'dividend', 'return', 'earning'],
      'salary': ['salary', 'income', 'wages', 'payroll'],
      'rent': ['rent', 'lease', 'housing'],
      'loan': ['loan', 'emi', 'credit', 'mortgage'],
    };

    // Find the best match by checking if the AI category contains any keywords
    for (const [userCategoryName, keywords] of Object.entries(categoryMappings)) {
      // Check if any user category matches this mapping
      const matchingUserCategory = this.userCategories.find(cat => 
        cat.name.toLowerCase().includes(userCategoryName) || 
        keywords.some(keyword => cat.name.toLowerCase().includes(keyword))
      );

      if (matchingUserCategory) {
        // Check if the AI category matches any of the keywords
        if (keywords.some(keyword => aiCategoryLower.includes(keyword))) {
          return matchingUserCategory.name;
        }
      }
    }

    // Try substring matching as a fallback
    const substringMatch = this.userCategories.find(cat => {
      const catName = cat.name.toLowerCase();
      return catName.includes(aiCategoryLower) || aiCategoryLower.includes(catName);
    });

    if (substringMatch) {
      return substringMatch.name;
    }

    // No match found, return uncategorized
    return 'Uncategorized';
  }

  /**
   * Updates the user categories for matching
   * @param userCategories - Updated list of user categories
   */
  updateUserCategories(userCategories: Category[]): void {
    this.userCategories = userCategories;
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
