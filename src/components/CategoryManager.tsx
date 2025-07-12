import { FC, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useUser } from '@supabase/auth-helpers-react';
import { Card } from './Card';
import { Button } from './Button';
import { motion, AnimatePresence } from 'framer-motion';

const initialSuggestedCategories = [
  { id: 4, name: 'Food', color: '#FFC107', icon: '🍽️' },
  { id: 5, name: 'Shopping', color: '#F44336', icon: '🛍️' },
  { id: 6, name: 'Entertainment', color: '#2196F3', icon: '🎬' },
  { id: 7, name: 'Travel', color: '#4CAF50', icon: '✈️' },
  { id: 8, name: 'Health', color: '#9C27B0', icon: '🏥' },
  { id: 9, name: 'Utilities', color: '#FF9800', icon: '⚡' },
  { id: 10, name: 'Transportation', color: '#607D8B', icon: '🚗' },
  { id: 11, name: 'Education', color: '#795548', icon: '📚' },
];

export const CategoryManager: FC = () => {
  const user = useUser();
  const [userCategories, setUserCategories] = useState<any[]>([]);
  const [suggestedCategories, setSuggestedCategories] = useState(
    initialSuggestedCategories
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#000000');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

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
          );
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
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, categories });
      
      setSavedMessage('Categories updated successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const handleAddCategory = (category: {
    id: number;
    name: string;
    color: string;
    icon?: string;
  }) => {
    if (
      !userCategories.some(
        (c) => c.name.toLowerCase() === category.name.toLowerCase()
      )
    ) {
      const newCategories = [...userCategories, category];
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
      id: Date.now(),
      name: newCategoryName,
      color: newCategoryColor,
      icon: newCategoryIcon,
    };

    handleAddCategory(newCategory);
    setNewCategoryName('');
    setNewCategoryColor('#000000');
    setNewCategoryIcon('📁');
    setShowCreateForm(false);
  };

  const handleRemoveCategory = (category: {
    id: number;
    name: string;
    color: string;
    icon?: string;
  }) => {
    const newCategories = userCategories.filter((c) => c.id !== category.id);
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

  const commonIcons = ['📁', '💰', '🏠', '🍽️', '🛍️', '🎬', '✈️', '🏥', '⚡', '🚗', '📚', '💡', '🎯', '⭐'];

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
              Organize your transactions with custom categories
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

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {userCategories.length} active categories
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  <select
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                  >
                    {commonIcons.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center space-x-3 bg-white rounded-lg px-4 py-2 border">
                  <span className="text-lg">{newCategoryIcon}</span>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: newCategoryColor }}
                  ></div>
                  <span className="font-medium">{newCategoryName || 'Category Name'}</span>
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                  >
                    Create
                  </Button>
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
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <span>💡</span>
            <span>Suggested Categories</span>
          </h4>
          <p className="text-gray-600 mb-4">
            Quick-add popular categories to get started faster
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {suggestedCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleAddCategory(category)}
                className="flex items-center space-x-2 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 rounded-lg p-3 text-left transition-all duration-200 hover:shadow-md border hover:border-blue-200"
              >
                <span className="text-lg">{category.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
