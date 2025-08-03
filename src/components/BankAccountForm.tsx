import { FC, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BankAccountCreate, BankAccountUpdate } from '@/types';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { BankSelector } from './BankSelector';
import { supabase } from '@/utils/supabase';
import { useUser } from '@supabase/auth-helpers-react';

interface BankAccountFormProps {
  initialData?: Partial<BankAccountCreate>;
  onSubmit: (data: BankAccountCreate) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const accountTypes = [
  { value: 'savings', label: 'Savings Account', icon: '💰', available: true },
  { value: 'investment', label: 'Investment Account', icon: '📈', available: true },
  { value: 'credit', label: 'Credit Card', icon: '💳', available: false },
];

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
];

export const BankAccountForm: FC<BankAccountFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false,
}) => {
  const user = useUser();
  const [userPreferredCurrency, setUserPreferredCurrency] = useState<string>('USD');
  
  const [formData, setFormData] = useState<BankAccountCreate>({
    bank_name: initialData?.bank_name || '',
    account_type: initialData?.account_type || 'savings',
    account_number_last4: initialData?.account_number_last4 || '',
    account_nickname: initialData?.account_nickname || '',
    currency: initialData?.currency || userPreferredCurrency,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch user's preferred currency from user_preferences
  useEffect(() => {
    const fetchUserCurrency = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('currency')
          .eq('user_id', user.id)
          .single();

        if (data && data.currency) {
          setUserPreferredCurrency(data.currency);
          // Only update form data if not editing (editing should keep existing currency)
          if (!isEdit && !initialData?.currency) {
            setFormData(prev => ({
              ...prev,
              currency: data.currency
            }));
          }
        }
      }
    };

    fetchUserCurrency();
  }, [user, isEdit, initialData?.currency]);

  const handleInputChange = (field: keyof BankAccountCreate, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'Bank name is required';
    }

    if (!formData.account_type) {
      newErrors.account_type = 'Account type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isEdit ? 'Edit Bank Account' : 'Add New Bank Account'}
          </h2>
          <p className="text-blue-100">
            {isEdit ? 'Update your bank account information' : 'Enter your bank account details to get started'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Bank Name */}
          <div className="space-y-2">
            <label htmlFor="bank_name" className="block text-sm font-semibold text-gray-800">
              Bank Name *
            </label>
            <BankSelector
              value={formData.bank_name}
              onChange={(bankName) => handleInputChange('bank_name', bankName)}
              placeholder="Search for your bank or type bank name..."
              error={errors.bank_name}
              disabled={isLoading}
              className="text-lg py-3"
            />
            <p className="text-sm text-gray-500 flex items-center space-x-1">
              <span>💡</span>
              <span>Search from 30+ Indian banks or type your own</span>
            </p>
          </div>

          {/* Account Type */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-800">
              Account Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {accountTypes.map((type) => (
                <motion.button
                  key={type.value}
                  type="button"
                  whileHover={{ scale: type.available ? 1.02 : 1 }}
                  whileTap={{ scale: type.available ? 0.98 : 1 }}
                  onClick={() => type.available && handleInputChange('account_type', type.value as any)}
                  disabled={!type.available || isLoading}
                  className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${
                    formData.account_type === type.value
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-200/50'
                      : type.available
                      ? 'border-gray-200 hover:border-blue-300 hover:shadow-md bg-white'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  }`}
                >
                  {!type.available && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Coming Soon
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-2xl filter drop-shadow-sm">{type.icon}</span>
                    <span className={`font-semibold text-center ${
                      formData.account_type === type.value
                        ? 'text-blue-900'
                        : type.available
                        ? 'text-gray-900'
                        : 'text-gray-500'
                    }`}>
                      {type.label}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
            {errors.account_type && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <span>⚠️</span>
                <span>{errors.account_type}</span>
              </p>
            )}
          </div>

          {/* Account Nickname */}
          <div className="space-y-2">
            <label htmlFor="account_nickname" className="block text-sm font-semibold text-gray-800">
              Account Nickname <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <Input
              id="account_nickname"
              type="text"
              value={formData.account_nickname}
              onChange={(e) => handleInputChange('account_nickname', e.target.value)}
              placeholder="e.g., Emergency Savings, Portfolio Account"
              disabled={isLoading}
              className="text-lg py-3"
            />
            <p className="text-sm text-gray-500">
              💡 Give your account a memorable name for easy identification
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading}
              className="px-8 py-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                isEdit ? 'Update Account' : 'Add Account'
              )}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
