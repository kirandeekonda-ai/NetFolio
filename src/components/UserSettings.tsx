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
    <div className="space-y-8">
      {/* Currency Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/40 backdrop-blur-sm rounded-3xl shadow-lg border border-white/30 p-8"
      >
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <span>Currency Preferences</span>
            </h3>
            <p className="text-gray-600 text-lg">
              Choose your preferred currency for displaying financial data
            </p>
          </div>
          {savedMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200/50 px-4 py-2 rounded-2xl font-semibold"
            >
              <span className="text-green-500">✓</span>
              <span>{savedMessage}</span>
            </motion.div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <label htmlFor="currency" className="block text-lg font-semibold text-gray-700 mb-4">
              Select Currency
            </label>
            <div className="relative">
              <select
                id="currency"
                name="currency"
                className="w-full appearance-none bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl py-4 pl-6 pr-12 text-lg font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 shadow-sm"
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
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="flex items-end">
            <div className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 backdrop-blur-sm rounded-2xl p-6 w-full border border-white/30">
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Current Selection</h4>
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                  <span className="text-3xl">
                    {currencyOptions.find(opt => opt.value === currency)?.flag}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">
                    {currencyOptions.find(opt => opt.value === currency)?.label}
                  </p>
                  <p className="text-gray-500 font-medium">Active currency</p>
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
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/40 backdrop-blur-sm rounded-3xl shadow-lg border border-white/30 p-8"
      >
        <LLMProviderSettings />
      </motion.div>

      {/* Delete Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-gradient-to-r from-red-50/80 to-rose-50/80 backdrop-blur-sm rounded-3xl shadow-lg border border-red-200/50 p-8"
      >
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-red-900 flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center">
                <span className="text-2xl text-white">⚠️</span>
              </div>
              <span>Danger Zone</span>
            </h3>
            <p className="text-red-700 text-lg">
              Permanently delete your account and all associated data
            </p>
          </div>
        </div>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-red-200/30">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-rose-100 rounded-2xl flex items-center justify-center border border-red-200/50">
                <span className="text-red-600 text-3xl">🗑️</span>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900 mb-3">Delete My Profile</h4>
              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                This action cannot be undone. This will permanently delete your account, 
                all your financial data, categories, LLM provider settings, and remove 
                your access to the application.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteLoading}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {deleteLoading ? 'Deleting...' : 'Delete My Profile'}
              </button>
              {deleteError && (
                <p className="mt-3 text-red-600 font-medium">{deleteError}</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full mx-4 border border-white/20"
          >
            <div className="p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-rose-100 rounded-2xl flex items-center justify-center border border-red-200/50">
                  <span className="text-red-600 text-3xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Delete Profile</h3>
                  <p className="text-gray-600 font-medium">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-8">
                <p className="text-gray-700 mb-4 text-lg">
                  Are you sure you want to delete your profile? This will permanently remove:
                </p>
                <ul className="text-gray-600 space-y-2 mb-6">
                  <li className="flex items-center space-x-3">
                    <span className="text-red-500">•</span>
                    <span>Your user account and authentication</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-red-500">•</span>
                    <span>All financial transaction data</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-red-500">•</span>
                    <span>Custom categories and preferences</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-red-500">•</span>
                    <span>LLM provider configurations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="text-red-500">•</span>
                    <span>All uploaded files and documents</span>
                  </li>
                </ul>
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-2xl p-4">
                  <p className="text-red-800 font-semibold">
                    This action is permanent and cannot be reversed.
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteError('');
                  }}
                  disabled={deleteLoading}
                  className="flex-1 bg-white/60 backdrop-blur-sm hover:bg-white/80 disabled:opacity-50 text-gray-800 font-semibold py-3 px-6 rounded-2xl transition-all duration-200 border border-gray-200/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProfile}
                  disabled={deleteLoading}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-200 shadow-lg"
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
