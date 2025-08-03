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
      router.push('/auth/landing');
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
        transition={{ duration: 0.3 }}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-6"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Currency Preferences
            </h3>
            <p className="text-gray-600 text-sm">
              Choose your preferred currency for displaying financial data
            </p>
          </div>
          {savedMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-2 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <span className="text-green-500">✓</span>
              <span>{savedMessage}</span>
            </motion.div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
              Select Currency
            </label>
            <div className="relative">
              <select
                id="currency"
                name="currency"
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-2.5 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="flex items-end">
            <div className="bg-gray-50 rounded-lg p-4 w-full border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Selection</h4>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  <span className="text-lg">
                    {currencyOptions.find(opt => opt.value === currency)?.flag}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {currencyOptions.find(opt => opt.value === currency)?.label}
                  </p>
                  <p className="text-gray-500 text-xs">Active currency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* LLM Provider Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-6"
      >
        <LLMProviderSettings />
      </motion.div>

      {/* Delete Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white border border-red-200 rounded-xl shadow-sm p-6"
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Danger Zone
          </h3>
          <p className="text-gray-600 text-sm">
            Permanently delete your account and all associated data
          </p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Delete My Profile</h4>
              <p className="text-gray-600 text-sm mb-4">
                This action cannot be undone. This will permanently delete your account, 
                all your financial data, categories, LLM provider settings, and remove 
                your access to the application.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {deleteLoading ? 'Deleting...' : 'Delete My Profile'}
              </button>
              {deleteError && (
                <p className="mt-2 text-red-600 text-xs font-medium">{deleteError}</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 border border-gray-200"
          >
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Profile</h3>
                  <p className="text-gray-600 text-sm">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-3 text-sm">
                  Are you sure you want to delete your profile? This will permanently remove:
                </p>
                <ul className="text-gray-600 space-y-1 mb-4 text-sm">
                  <li className="flex items-center space-x-2">
                    <span className="text-red-500">•</span>
                    <span>Your user account and authentication</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-red-500">•</span>
                    <span>All financial transaction data</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-red-500">•</span>
                    <span>Custom categories and preferences</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-red-500">•</span>
                    <span>LLM provider configurations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-red-500">•</span>
                    <span>All uploaded files and documents</span>
                  </li>
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
                  className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-800 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProfile}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
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
