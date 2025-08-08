import { FC, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { useUser } from '@supabase/auth-helpers-react';
import { Card } from './Card';
import { Button } from './Button';
import { motion, AnimatePresence } from 'framer-motion';

const initialSuggestedCategories = [
  // Essential Daily
  { id: 4, name: 'Food & Dining', color: '#FF6347', icon: '🍽️' },
  { id: 5, name: 'Groceries', color: '#32CD32', icon: '🛒' },
  { id: 6, name: 'Transportation', color: '#4682B4', icon: '🚗' },
  { id: 7, name: 'Gas & Fuel', color: '#FF4500', icon: '⛽' },
  
  // Bills & Utilities
  { id: 8, name: 'Utilities', color: '#FFD700', icon: '⚡' },
  { id: 9, name: 'Phone & Internet', color: '#4169E1', icon: '📱' },
  { id: 10, name: 'Insurance', color: '#2F4F4F', icon: '🛡️' },
  { id: 11, name: 'Rent & Housing', color: '#8B4513', icon: '🏠' },
  
  // Lifestyle & Entertainment
  { id: 12, name: 'Shopping', color: '#FF1493', icon: '🛍️' },
  { id: 13, name: 'Entertainment', color: '#9400D3', icon: '🎬' },
  { id: 14, name: 'Coffee & Snacks', color: '#D2691E', icon: '☕' },
  { id: 15, name: 'Subscriptions', color: '#4169E1', icon: '📺' },
  
  // Health & Wellness
  { id: 16, name: 'Healthcare', color: '#DC143C', icon: '🏥' },
  { id: 17, name: 'Fitness & Gym', color: '#228B22', icon: '💪' },
  { id: 18, name: 'Personal Care', color: '#DA70D6', icon: '💄' },
  
  // Financial & Investment
  { id: 19, name: 'Savings', color: '#32CD32', icon: '💰' },
  { id: 20, name: 'Investments', color: '#4169E1', icon: '📈' },
  { id: 21, name: 'Banking Fees', color: '#696969', icon: '🏦' },
  
  // Education & Work
  { id: 22, name: 'Education', color: '#4682B4', icon: '🎓' },
  { id: 23, name: 'Work Expenses', color: '#2F4F4F', icon: '💼' },
  
  // Travel & Leisure
  { id: 24, name: 'Travel', color: '#4CAF50', icon: '✈️' },
  { id: 25, name: 'Vacation', color: '#FF6347', icon: '🏖️' },
  
  // Miscellaneous
  { id: 26, name: 'Gifts & Donations', color: '#FF69B4', icon: '🎁' },
  { id: 27, name: 'Pet Care', color: '#8FBC8F', icon: '🐾' },
];

// Comprehensive icon library organized by categories
const iconLibrary = {
  // Financial & Money
  finance: ['💰', '💳', '💎', '💵', '💶', '💷', '💴', '🏦', '📊', '📈', '📉', '💹', '🪙'],
  
  // Food & Dining
  food: ['🍽️', '🍕', '🍔', '🍟', '🥗', '🍜', '🍱', '🥪', '🌮', '🥙', '🍝', '🍤', '🍣', '☕', '🍺', '🍷', '🥤', '🧁', '🍰', '🍪'],
  
  // Transportation
  transport: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '✈️', '🚁', '🚂', '🚇', '⛵', '🚤', '⛽'],
  
  // Shopping & Retail
  shopping: ['🛍️', '🛒', '🏪', '🏬', '🛵', '📦', '🎁', '👕', '👖', '👗', '👠', '👜', '💄', '💍', '⌚', '📱', '💻', '🎮'],
  
  // Home & Living
  home: ['🏠', '🏡', '🏘️', '🏢', '🏬', '🛏️', '🛋️', '🪑', '🚿', '🛁', '🚽', '🧹', '🧽', '🧴', '🔧', '🔨', '🪚', '🏗️', '🧱'],
  
  // Health & Medical
  health: ['🏥', '⚕️', '💊', '🩺', '💉', '🦷', '👁️', '🧠', '❤️', '🫁', '🦴', '💪', '🏃', '🤸', '🧘', '🏋️'],
  
  // Entertainment & Recreation
  entertainment: ['🎬', '🎭', '🎪', '🎨', '🎮', '🎯', '🎲', '🃏', '🎰', '🎹', '🎸', '🥁', '🎤', '📚', '📖', '📝', '🖼️', '🏟️', '🎾', '⚽', '🏀', '🏈', '⚾', '🎳', '🏓'],
  
  // Education & Work
  education: ['📚', '📖', '✏️', '✒️', '🖊️', '📝', '📄', '📋', '📊', '💼', '👔', '🎓', '🏫', '🏛️', '📐', '📏', '🧮', '💻', '⌨️', '🖥️'],
  
  // Utilities & Bills
  utilities: ['⚡', '💡', '🔌', '📱', '📞', '📺', '📻', '🌐', '💾', '🗄️', '🖨️', '☁️', '⚙️', '🔧', '🔩'],
  
  // Nature & Environment
  nature: ['🌱', '🌿', '🍃', '🌳', '🌲', '🌴', '🌾', '🌸', '🌺', '🌻', '🌹', '🌷', '🌵', '🍄', '🐛', '🦋', '🐝', '🌍', '🌎', '🌏', '☀️', '🌙', '⭐', '☁️', '🌧️', '⛈️'],
  
  // Animals & Pets
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🐺', '🐗'],
  
  // Symbols & Abstract
  symbols: ['⭐', '🌟', '✨', '💫', '⚡', '🔥', '💧', '❄️', '☀️', '🌙', '🎯', '🎪', '🎭', '🎨', '🔮', '💎', '👑', '🏆', '🥇', '🏅', '🎖️', '🔑', '🗝️'],
  
  // Technology
  technology: ['💻', '🖥️', '📱', '⌚', '📷', '📹', '🎥', '📽️', '🎞️', '📀', '💿', '💾', '💽', '🖨️', '⌨️', '🖱️', '🔌', '🔋', '📡', '🛰️', '🚀', '🛸'],
  
  // Sports & Activities
  sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹', '🛷', '⛷️', '🏂'],
};

// Smart color palettes organized by category themes
const colorPalettes = {
  // Finance & Money (Gold, Green, Blue tones)
  finance: ['#FFD700', '#32CD32', '#4169E1', '#228B22', '#1E90FF', '#DAA520', '#90EE90', '#87CEEB'],
  
  // Food & Dining (Warm, appetizing colors)
  food: ['#FF6347', '#FFA500', '#FFD700', '#DC143C', '#FF4500', '#FF8C00', '#FFA07A', '#F0E68C'],
  
  // Transportation (Blue, Gray, Red tones)
  transport: ['#4682B4', '#696969', '#DC143C', '#2F4F4F', '#4169E1', '#708090', '#B22222', '#5F9EA0'],
  
  // Shopping (Pink, Purple, Magenta)
  shopping: ['#FF1493', '#DA70D6', '#BA55D3', '#9370DB', '#8A2BE2', '#FF69B4', '#DDA0DD', '#EE82EE'],
  
  // Home & Living (Earth tones, browns, greens)
  home: ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#F4A460', '#D2691E', '#BC8F8F', '#F5DEB3'],
  
  // Health & Medical (Red, Pink, Blue medical colors)
  health: ['#DC143C', '#FF69B4', '#4169E1', '#32CD32', '#FF6347', '#DA70D6', '#87CEEB', '#98FB98'],
  
  // Entertainment (Vibrant, fun colors)
  entertainment: ['#FF1493', '#FF4500', '#FFD700', '#32CD32', '#4169E1', '#9400D3', '#FF6347', '#00CED1'],
  
  // Education (Professional blues, greens)
  education: ['#4169E1', '#2F4F4F', '#228B22', '#800080', '#B22222', '#4682B4', '#2E8B57', '#6A5ACD'],
  
  // Utilities (Technical grays, blues, yellows)
  utilities: ['#FFD700', '#4169E1', '#696969', '#FF4500', '#32CD32', '#DC143C', '#4682B4', '#2F4F4F'],
  
  // Nature (Greens, browns, earth tones)
  nature: ['#228B22', '#32CD32', '#8FBC8F', '#556B2F', '#6B8E23', '#9ACD32', '#ADFF2F', '#7CFC00'],
  
  // Default fallback colors
  default: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
};

// AI-powered category analysis
const analyzeCategory = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  
  // Category keyword mapping
  const categoryMappings = {
    finance: ['money', 'bank', 'investment', 'saving', 'loan', 'credit', 'debit', 'cash', 'finance', 'budget'],
    food: ['food', 'restaurant', 'dining', 'eat', 'meal', 'lunch', 'dinner', 'breakfast', 'cafe', 'pizza', 'grocery'],
    transport: ['transport', 'car', 'gas', 'fuel', 'uber', 'taxi', 'bus', 'train', 'flight', 'parking', 'vehicle'],
    shopping: ['shop', 'store', 'buy', 'purchase', 'retail', 'amazon', 'clothing', 'fashion', 'mall'],
    home: ['home', 'house', 'rent', 'mortgage', 'furniture', 'decor', 'garden', 'repair', 'maintenance'],
    health: ['health', 'medical', 'doctor', 'hospital', 'pharmacy', 'medicine', 'fitness', 'gym', 'dental'],
    entertainment: ['entertainment', 'movie', 'music', 'game', 'concert', 'theater', 'show', 'netflix', 'spotify'],
    education: ['education', 'school', 'university', 'course', 'book', 'learn', 'study', 'tuition'],
    utilities: ['utility', 'electric', 'water', 'gas', 'internet', 'phone', 'cable', 'bill'],
    nature: ['nature', 'plant', 'garden', 'outdoor', 'park', 'tree', 'flower'],
    animals: ['pet', 'dog', 'cat', 'animal', 'vet', 'zoo'],
    technology: ['tech', 'computer', 'software', 'phone', 'laptop', 'device', 'app'],
    sports: ['sport', 'gym', 'fitness', 'exercise', 'workout', 'team', 'game', 'athletic']
  };
  
  // Find matching category
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }
  
  return 'default';
};

// Get smart suggestions based on category name
const getSmartSuggestions = (categoryName: string) => {
  if (!categoryName.trim()) return { icons: [], colors: [] };
  
  const category = analyzeCategory(categoryName);
  const icons = iconLibrary[category as keyof typeof iconLibrary] || iconLibrary.symbols;
  const colors = colorPalettes[category as keyof typeof colorPalettes] || colorPalettes.default;
  
  return {
    icons: icons.slice(0, 12), // Show top 12 suggestions
    colors: colors.slice(0, 8)  // Show top 8 color suggestions
  };
};

export const CategoryManager: FC = () => {
  const user = useUser();
  const [userCategories, setUserCategories] = useState<any[]>([]);
  const [suggestedCategories, setSuggestedCategories] = useState(
    initialSuggestedCategories
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIconCategory, setSelectedIconCategory] = useState<string>('finance');
  const [showAdvancedIconPicker, setShowAdvancedIconPicker] = useState(false);

  // Smart suggestions based on category name
  const smartSuggestions = useMemo(() => {
    return getSmartSuggestions(newCategoryName);
  }, [newCategoryName]);

  // Filtered icon categories for search
  const filteredIcons = useMemo(() => {
    if (!searchTerm) return iconLibrary[selectedIconCategory as keyof typeof iconLibrary] || [];
    
    const allIcons = Object.values(iconLibrary).flat();
    return allIcons.filter(icon => {
      // Simple search - could be enhanced with icon descriptions
      return true; // For now, return all icons when searching
    });
  }, [searchTerm, selectedIconCategory]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('categories')
          .eq('user_id', user.id)
          .single();

        if (data && data.categories) {
          const uniqueCategories = data.categories.filter(
            (category: any, index: number, self: any[]) =>
              index ===
              self.findIndex(
                (c) => c.name.toLowerCase() === category.name.toLowerCase()
              )
          ).map((category: any) => ({
            // Ensure each category has an ID - use existing ID or generate one based on name
            id: category.id || category.name.toLowerCase().replace(/\s+/g, '_'),
            name: category.name,
            color: category.color,
            icon: category.icon || '📁'
          }));
          
          setUserCategories(uniqueCategories);
          setSuggestedCategories(
            initialSuggestedCategories.filter(
              (sc) =>
                !uniqueCategories.some(
                  (uc: any) => uc.name.toLowerCase() === sc.name.toLowerCase()
                )
            )
          );
        }
      }
    };

    fetchCategories();
  }, [user]);

  const updateCategories = async (categories: any[]) => {
    if (user) {
      // Ensure categories are saved with consistent structure
      const normalizedCategories = categories.map(cat => ({
        id: cat.id || cat.name.toLowerCase().replace(/\s+/g, '_'),
        name: cat.name,
        color: cat.color,
        icon: cat.icon || '📁'
      }));
      
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, categories: normalizedCategories });
      
      setSavedMessage('Categories updated successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const handleAddCategory = (category: {
    id: number | string;
    name: string;
    color: string;
    icon?: string;
  }) => {
    if (
      !userCategories.some(
        (c) => c.name.toLowerCase() === category.name.toLowerCase()
      )
    ) {
      const categoryWithId = {
        id: category.id || category.name.toLowerCase().replace(/\s+/g, '_'),
        name: category.name,
        color: category.color,
        icon: category.icon || '📁'
      };
      
      const newCategories = [...userCategories, categoryWithId];
      setUserCategories(newCategories);
      setSuggestedCategories(
        suggestedCategories.filter((c) => c.id !== category.id)
      );
      updateCategories(newCategories);
    } else {
      setSuggestedCategories(
        suggestedCategories.filter((c) => c.id !== category.id)
      );
    }
  };

  const handleAddAllCategories = () => {
    const categoriesToAdd = suggestedCategories.filter(
      (suggestedCategory) =>
        !userCategories.some(
          (userCategory) => 
            userCategory.name.toLowerCase() === suggestedCategory.name.toLowerCase()
        )
    );

    if (categoriesToAdd.length > 0) {
      const newCategories = [
        ...userCategories,
        ...categoriesToAdd.map(category => ({
          id: category.id || category.name.toLowerCase().replace(/\s+/g, '_'),
          name: category.name,
          color: category.color,
          icon: category.icon || '📁'
        }))
      ];
      
      setUserCategories(newCategories);
      setSuggestedCategories([]);
      updateCategories(newCategories);
      setSavedMessage(`Added ${categoriesToAdd.length} categories successfully!`);
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim() === '') return;

    if (
      userCategories.some(
        (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase()
      )
    ) {
      alert('Category already exists');
      return;
    }

    const newCategory = {
      id: newCategoryName.toLowerCase().replace(/\s+/g, '_'),
      name: newCategoryName,
      color: newCategoryColor,
      icon: newCategoryIcon,
    };

    handleAddCategory(newCategory);
    setNewCategoryName('');
    setNewCategoryColor('#3B82F6');
    setNewCategoryIcon('📁');
    setShowCreateForm(false);
    setShowAdvancedIconPicker(false);
  };

  // Auto-suggest icon and color when category name changes
  const handleCategoryNameChange = (name: string) => {
    setNewCategoryName(name);
    
    if (name.trim().length > 2) {
      const suggestions = getSmartSuggestions(name);
      if (suggestions.icons.length > 0) {
        setNewCategoryIcon(suggestions.icons[0]);
      }
      if (suggestions.colors.length > 0) {
        setNewCategoryColor(suggestions.colors[0]);
      }
    }
  };

  // Handle smart color selection
  const handleColorSelect = (color: string) => {
    setNewCategoryColor(color);
  };

  // Handle smart icon selection
  const handleIconSelect = (icon: string) => {
    setNewCategoryIcon(icon);
  };

  const handleRemoveCategory = (category: {
    id: number | string;
    name: string;
    color: string;
    icon?: string;
  }) => {
    // Filter by both ID and name to ensure we remove the correct category
    // This handles cases where categories might have inconsistent ID formats
    const newCategories = userCategories.filter((c) => 
      c.id !== category.id && c.name !== category.name
    );
    setUserCategories(newCategories);
    
    // Add back to suggested if it was originally suggested
    const originalSuggested = initialSuggestedCategories.find(
      (sc) => sc.name.toLowerCase() === category.name.toLowerCase()
    );
    if (originalSuggested) {
      setSuggestedCategories([...suggestedCategories, originalSuggested]);
    }
    
    updateCategories(newCategories);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-600"></div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <span className="text-2xl">📂</span>
              <span>Category Management</span>
            </h3>
            <p className="text-gray-600 mt-1">
              Organize your transactions with smart, color-coded categories
            </p>
          </div>
          {savedMessage && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium"
            >
              <span>✓</span>
              <span>{savedMessage}</span>
            </motion.div>
          )}
        </div>

        {/* Enhanced Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{userCategories.length}</div>
            <div className="text-xs text-blue-700">Active Categories</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{suggestedCategories.length}</div>
            <div className="text-xs text-green-700">Suggestions Available</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{Object.values(iconLibrary).flat().length}</div>
            <div className="text-xs text-purple-700">Icons Available</div>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{Object.values(colorPalettes).flat().length}</div>
            <div className="text-xs text-orange-700">Smart Colors</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            💡 Pro tip: Type category names like "grocery", "gas", or "coffee" for instant smart suggestions
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center space-x-2"
          >
            <span>+</span>
            <span>Create Category</span>
          </Button>
        </div>
      </Card>

      {/* Create Category Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-blue-200 bg-blue-50">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <span>✨</span>
                <span>Create New Category</span>
              </h4>
              
              <div className="space-y-6">
                {/* Category Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter category name (e.g., Groceries, Gas, Coffee)"
                    value={newCategoryName}
                    onChange={(e) => handleCategoryNameChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-200"
                  />
                  {newCategoryName.trim().length > 2 && (
                    <p className="text-xs text-green-600 mt-1">
                      💡 Smart suggestions applied based on your category name!
                    </p>
                  )}
                </div>

                {/* Enhanced Preview Section */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-dashed border-purple-300">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">👀</span>
                    Live Preview - How it will appear in charts
                  </h5>
                  <div className="flex items-center justify-center space-x-6">
                    {/* Donut Chart Preview */}
                    <div className="text-center">
                      <div className="relative">
                        <div 
                          className="w-16 h-16 rounded-full border-4 flex items-center justify-center text-lg font-bold"
                          style={{ 
                            borderColor: newCategoryColor,
                            backgroundColor: `${newCategoryColor}20`,
                            color: newCategoryColor
                          }}
                        >
                          {newCategoryIcon}
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <span className="text-xs">🥧</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Chart View</p>
                    </div>
                    
                    {/* List Preview */}
                    <div className="text-center">
                      <div className="bg-white rounded-lg p-3 border shadow-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{newCategoryIcon}</span>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: newCategoryColor }}
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {newCategoryName || 'Category Name'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">List View</p>
                    </div>
                  </div>
                </div>

                {/* Smart Color Suggestions */}
                {smartSuggestions.colors.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🎨 Smart Color Suggestions
                    </label>
                    <div className="grid grid-cols-8 gap-2 mb-3">
                      {smartSuggestions.colors.map((color, index) => (
                        <button
                          key={index}
                          onClick={() => handleColorSelect(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                            newCategoryColor === color ? 'border-gray-700 shadow-lg' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Suggested color ${index + 1}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-600">Custom color:</label>
                      <input
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Smart Icon Suggestions */}
                {smartSuggestions.icons.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🎯 Smart Icon Suggestions
                    </label>
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {smartSuggestions.icons.map((icon, index) => (
                        <button
                          key={index}
                          onClick={() => handleIconSelect(icon)}
                          className={`p-2 text-lg rounded-lg border-2 hover:bg-gray-50 transition-all ${
                            newCategoryIcon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                          title={`Suggested icon ${index + 1}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowAdvancedIconPicker(!showAdvancedIconPicker)}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {showAdvancedIconPicker ? '← Back to suggestions' : '🔍 Browse all icons →'}
                    </button>
                  </div>
                )}

                {/* Advanced Icon Picker */}
                <AnimatePresence>
                  {showAdvancedIconPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t pt-4"
                    >
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Icon Categories
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(iconLibrary).map((category) => (
                            <button
                              key={category}
                              onClick={() => setSelectedIconCategory(category)}
                              className={`px-3 py-1 text-xs rounded-full transition-all ${
                                selectedIconCategory === category
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto">
                        {filteredIcons.map((icon, index) => (
                          <button
                            key={index}
                            onClick={() => handleIconSelect(icon)}
                            className={`p-2 text-lg rounded-lg border-2 hover:bg-gray-50 transition-all ${
                              newCategoryIcon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex space-x-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowCreateForm(false);
                        setShowAdvancedIconPicker(false);
                        setNewCategoryName('');
                        setNewCategoryColor('#3B82F6');
                        setNewCategoryIcon('📁');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim()}
                    >
                      Create Category
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Categories */}
      {userCategories.length > 0 && (
        <Card>
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <span>⭐</span>
            <span>Your Categories</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {userCategories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{category.icon || '📁'}</span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="font-medium text-gray-900">{category.name}</span>
                </div>
                <button
                  onClick={() => handleRemoveCategory(category)}
                  className="text-red-500 hover:text-red-700 transition-colors duration-200 p-1"
                  title="Remove category"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Suggested Categories */}
      {suggestedCategories.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <span>💡</span>
                <span>Suggested Categories</span>
              </h4>
              <p className="text-gray-600 text-sm mt-1">
                Quick-add popular categories to get started faster
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-blue-600 text-sm font-medium">
                  {suggestedCategories.filter(category => 
                    !userCategories.some(userCategory => 
                      userCategory.name.toLowerCase() === category.name.toLowerCase()
                    )
                  ).length} available
                </span>
              </div>
              {suggestedCategories.filter(category => 
                !userCategories.some(userCategory => 
                  userCategory.name.toLowerCase() === category.name.toLowerCase()
                )
              ).length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => handleAddAllCategories()}
                  className="text-xs px-3 py-1.5"
                >
                  Add All
                </Button>
              )}
            </div>
          </div>
          
          {/* Enhanced Grid Layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {suggestedCategories
              .filter(category => 
                !userCategories.some(userCategory => 
                  userCategory.name.toLowerCase() === category.name.toLowerCase()
                )
              )
              .map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleAddCategory(category)}
                className="group flex flex-col items-center justify-center bg-white hover:bg-gray-50 rounded-lg p-4 text-center transition-all duration-200 hover:shadow-md border border-gray-200 hover:border-gray-300 min-h-[80px]"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">
                  {category.icon}
                </div>
                <div className="flex items-center space-x-1.5 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="text-xs font-medium text-gray-900 leading-tight">
                    {category.name}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
