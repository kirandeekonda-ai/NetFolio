import { FC, useState } from 'react';

const initialSuggestedCategories = [
  { id: 4, name: 'Food', color: '#FFC107' },
  { id: 5, name: 'Shopping', color: '#F44336' },
  { id: 6, name: 'Entertainment', color: '#2196F3' },
  { id: 7, name: 'Travel', color: '#4CAF50' },
  { id: 8, name: 'Health', color: '#9C27B0' },
];

export const CategoryManager: FC = () => {
  const [userCategories, setUserCategories] = useState([
    { id: 1, name: 'Groceries', color: '#FFC107' },
    { id: 2, name: 'Rent', color: '#F44336' },
    { id: 3, name: 'Transport', color: '#2196F3' },
  ]);
  const [suggestedCategories, setSuggestedCategories] = useState(
    initialSuggestedCategories
  );

  const handleAddCategory = (category: {
    id: number;
    name: string;
    color: string;
  }) => {
    setUserCategories([...userCategories, category]);
    setSuggestedCategories(suggestedCategories.filter((c) => c.id !== category.id));
  };

  const handleRemoveCategory = (category: {
    id: number;
    name: string;
    color: string;
  }) => {
    setUserCategories(userCategories.filter((c) => c.id !== category.id));
    setSuggestedCategories([...suggestedCategories, category]);
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
