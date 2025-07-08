import { FC, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useUser } from '@supabase/auth-helpers-react';
import { LLMProviderSettings } from './LLMProviderSettings';
import { Card } from './Card';
import { motion } from 'framer-motion';

export const UserSettings: FC = () => {
  const user = useUser();
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

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
    </div>
  );
};
