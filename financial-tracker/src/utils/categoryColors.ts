import { Category } from '@/types';

const colorConfig: { [key: string]: { bg: string; text: string } } = {
  // Warm Colors (Expenses)
  'Food & Dining': { bg: 'bg-red-100', text: 'text-red-800' },
  'Bills & Utilities': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Shopping': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'Transportation': { bg: 'bg-pink-100', text: 'text-pink-800' },
  'Entertainment': { bg: 'bg-purple-100', text: 'text-purple-800' },
  
  // Cool Colors (Neutral/Income)
  'Income': { bg: 'bg-green-100', text: 'text-green-800' },
  'Investments': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Health & Wellness': { bg: 'bg-teal-100', text: 'text-teal-800' },
  'Travel': { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  
  // Default
  'Uncategorized': { bg: 'bg-gray-200', text: 'text-gray-800' },
  'Other': { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const defaultColor = { bg: 'bg-indigo-100', text: 'text-indigo-800' };

// Helper function to convert hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Helper function to determine if a color is light or dark
const isLightColor = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  
  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
};

// Get category color style with user-defined colors
export const getCategoryColorStyle = (category: string, userCategories?: Category[]): { bg: string; text: string; style?: React.CSSProperties } => {
  // Check if we have user-defined categories with colors
  if (userCategories) {
    const userCategory = userCategories.find(c => c.name === category);
    if (userCategory && userCategory.color) {
      const isLight = isLightColor(userCategory.color);
      return {
        bg: '',
        text: isLight ? 'text-gray-800' : 'text-white',
        style: {
          backgroundColor: userCategory.color,
          color: isLight ? '#1f2937' : '#ffffff'
        }
      };
    }
  }
  
  // Fallback to predefined colors
  return colorConfig[category] || defaultColor;
};
