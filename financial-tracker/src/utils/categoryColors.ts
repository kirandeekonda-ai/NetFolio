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

export const getCategoryColorStyle = (category: string): { bg: string; text: string } => {
  return colorConfig[category] || defaultColor;
};
