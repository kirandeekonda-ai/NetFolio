import { FC, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useUser } from '@supabase/auth-helpers-react';

const initialSuggestedCategories = [
  { id: 4, name: 'Food', color: '#FFC107' },
  { id: 5, name: 'Shopping', color: '#F44336' },
  { id: 6, name: 'Entertainment', color: '#2196F3' },
  { id: 7, name: 'Travel', color: '#4CAF50' },
  { id: 8, name: 'Health', color: '#9C27B0' },
];

export const CategoryManager: FC = () => {
  const user = useUser();
  const [userCategories, setUserCategories] = useState<any[]>([]);
  const [suggestedCategories, setSuggestedCategories] = useState(
    initialSuggestedCategories
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#000000');

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
    }
  };

  const handleAddCategory = (category: {
    id: number;
    name: string;
    color: string;
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
    };

    handleAddCategory(newCategory);
    setNewCategoryName('');
    setNewCategoryColor('#000000');
  };

  const handleRemoveCategory = (category: {
    id: number;
    name: string;
    color: string;
  }) => {
    const newCategories = userCategories.filter((c) => c.id !== category.id);
    setUserCategories(newCategories);
    setSuggestedCategories([...suggestedCategories, category]);
    updateCategories(newCategories);
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Category Manager</h2>

      <div className="mt-4">
        <h3 className="text-lg font-semibold">Your Categories</h3>
        <ul className="mt-2">
          {userCategories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between border-b py-2"
            >
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-4"
                  style={{ backgroundColor: category.color }}
                ></div>
                <span>{category.name}</span>
              </div>
              <button
                onClick={() => handleRemoveCategory(category)}
                className="text-red-500"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Create New Category</h3>
        <div className="flex items-center gap-4 mt-2">
          <input
            type="text"
            placeholder="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <input
            type="color"
            value={newCategoryColor}
            onChange={(e) => setNewCategoryColor(e.target.value)}
            className="border rounded w-10 h-10"
          />
          <button
            onClick={handleCreateCategory}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Suggested Categories</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestedCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleAddCategory(category)}
              className="flex items-center bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700"
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: category.color }}
              ></div>
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
