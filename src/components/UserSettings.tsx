import { FC, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useUser } from '@supabase/auth-helpers-react';
import { LLMProviderSettings } from './LLMProviderSettings';
import { Card } from './Card';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';

export const UserSettings: FC = () => {
  const user = useUser();
  const router = useRouter();
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const fetchCurrency = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('currency')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setCurrency(data.currency);
        }
      }
    };

    fetchCurrency();
  }, [user]);

  const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value;
    setCurrency(newCurrency);
    setIsLoading(true);

    if (user) {
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, currency: newCurrency });
      
      setSavedMessage('Currency preference saved!');
      setTimeout(() => setSavedMessage(''), 3000);
    }
    setIsLoading(false);
  };

  const handleDeleteProfile = async () => {
    if (!user) return;
    
    setDeleteLoading(true);
    setDeleteError('');

    try {
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete profile');
      }

      // Sign out the user locally since their account was deleted
      await supabase.auth.signOut();
      
      // Close the confirmation dialog
      setShowDeleteConfirm(false);
      
      // Redirect to auth page after successful deletion
      router.push('/auth');
    } catch (error) {
      console.error('Error deleting profile:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete profile');
    } finally {
      setDeleteLoading(false);
    }
  };

  const currencyOptions = [
    { value: 'USD', label: 'US Dollar ($)', flag: '🇺🇸' },
    { value: 'EUR', label: 'Euro (€)', flag: '🇪🇺' },
    { value: 'GBP', label: 'British Pound (£)', flag: '🇬🇧' },
    { value: 'INR', label: 'Indian Rupee (₹)', flag: '🇮🇳' },
    { value: 'CAD', label: 'Canadian Dollar (C$)', flag: '🇨🇦' },
    { value: 'AUD', label: 'Australian Dollar (A$)', flag: '🇦🇺' },
    { value: 'JPY', label: 'Japanese Yen (¥)', flag: '🇯🇵' },
  ];

  return (
    <div className="space-y-6">
      {/* Currency Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span className="text-2xl">💰</span>
                <span>Currency Preferences</span>
              </h3>
              <p className="text-gray-600 mt-1">
                Choose your preferred currency for displaying financial data
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-3">
                Select Currency
              </label>
              <div className="relative">
                <select
                  id="currency"
                  name="currency"
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 pl-4 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-200"
                  value={currency}
                  onChange={handleCurrencyChange}
                  disabled={isLoading}
                >
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.flag} {option.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex items-end">
              <div className="bg-gray-50 rounded-lg p-4 w-full">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Selection</h4>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {currencyOptions.find(opt => opt.value === currency)?.flag}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {currencyOptions.find(opt => opt.value === currency)?.label}
                    </p>
                    <p className="text-sm text-gray-500">Active currency</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* LLM Provider Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <LLMProviderSettings />
      </motion.div>

      {/* Delete Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="relative overflow-hidden border-red-200 bg-red-50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-red-900 flex items-center space-x-2">
                <span className="text-2xl">⚠️</span>
                <span>Danger Zone</span>
              </h3>
              <p className="text-red-700 mt-1">
                Permanently delete your account and all associated data
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xl">🗑️</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Delete My Profile</h4>
                <p className="text-gray-600 mb-4">
                  This action cannot be undone. This will permanently delete your account, 
                  all your financial data, categories, LLM provider settings, and remove 
                  your access to the application.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete My Profile'}
                </button>
                {deleteError && (
                  <p className="mt-2 text-sm text-red-600">{deleteError}</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Profile</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete your profile? This will permanently remove:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>• Your user account and authentication</li>
                  <li>• All financial transaction data</li>
                  <li>• Custom categories and preferences</li>
                  <li>• LLM provider configurations</li>
                  <li>• All uploaded files and documents</li>
                </ul>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm font-medium">
                    This action is permanent and cannot be reversed.
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteError('');
                  }}
                  disabled={deleteLoading}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProfile}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete Profile'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
