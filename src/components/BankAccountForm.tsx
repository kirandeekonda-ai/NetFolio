import { FC, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BankAccountCreate, BankAccountUpdate } from '@/types';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
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
  { value: 'checking', label: 'Checking Account', icon: '💳' },
  { value: 'savings', label: 'Savings Account', icon: '💰' },
  { value: 'credit', label: 'Credit Card', icon: '💳' },
  { value: 'investment', label: 'Investment Account', icon: '📈' },
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
    account_type: initialData?.account_type || 'checking',
    account_number_last4: initialData?.account_number_last4 || '',
    account_nickname: initialData?.account_nickname || '',
    starting_balance: initialData?.starting_balance || 0,
    starting_balance_date: initialData?.starting_balance_date || new Date().toISOString().split('T')[0],
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

    if (!formData.starting_balance_date) {
      newErrors.starting_balance_date = 'Starting balance date is required';
    }

    if (formData.account_number_last4 && formData.account_number_last4.length !== 4) {
      newErrors.account_number_last4 = 'Must be exactly 4 digits';
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
    >
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isEdit ? 'Edit Bank Account' : 'Add New Bank Account'}
            </h2>
            <p className="text-gray-600">
              {isEdit ? 'Update your bank account information' : 'Enter your bank account details to get started'}
            </p>
          </div>

          {/* Bank Name */}
          <div>
            <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name *
            </label>
            <Input
              id="bank_name"
              type="text"
              value={formData.bank_name}
              onChange={(e) => handleInputChange('bank_name', e.target.value)}
              placeholder="e.g., Chase, Bank of America, Wells Fargo"
              error={errors.bank_name}
              disabled={isLoading}
            />
          </div>

          {/* Account Type */}
          <div>
            <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 mb-2">
              Account Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {accountTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleInputChange('account_type', type.value as any)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.account_type === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={isLoading}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
            {errors.account_type && (
              <p className="mt-1 text-sm text-red-600">{errors.account_type}</p>
            )}
          </div>

          {/* Account Nickname */}
          <div>
            <label htmlFor="account_nickname" className="block text-sm font-medium text-gray-700 mb-2">
              Account Nickname (Optional)
            </label>
            <Input
              id="account_nickname"
              type="text"
              value={formData.account_nickname}
              onChange={(e) => handleInputChange('account_nickname', e.target.value)}
              placeholder="e.g., Main Checking, Emergency Savings"
              disabled={isLoading}
            />
          </div>

          {/* Last 4 Digits */}
          <div>
            <label htmlFor="account_number_last4" className="block text-sm font-medium text-gray-700 mb-2">
              Last 4 Digits (Optional)
            </label>
            <Input
              id="account_number_last4"
              type="text"
              value={formData.account_number_last4}
              onChange={(e) => handleInputChange('account_number_last4', e.target.value)}
              placeholder="1234"
              maxLength={4}
              error={errors.account_number_last4}
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">
              Only the last 4 digits for security and identification
            </p>
          </div>

          {/* Starting Balance and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="starting_balance" className="block text-sm font-medium text-gray-700 mb-2">
                Starting Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {currencies.find(c => c.code === formData.currency)?.symbol}
                </span>
                <Input
                  id="starting_balance"
                  type="number"
                  step="0.01"
                  value={formData.starting_balance}
                  onChange={(e) => handleInputChange('starting_balance', parseFloat(e.target.value) || 0)}
                  className="pl-8"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label htmlFor="starting_balance_date" className="block text-sm font-medium text-gray-700 mb-2">
                Balance Date *
              </label>
              <Input
                id="starting_balance_date"
                type="date"
                value={formData.starting_balance_date}
                onChange={(e) => handleInputChange('starting_balance_date', e.target.value)}
                error={errors.starting_balance_date}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name} ({currency.code})
                </option>
              ))}
            </select>
            {!isEdit && (
              <p className="mt-1 text-sm text-gray-500">
                💡 Default set from your profile preferences. You can change this in Settings.
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : isEdit ? 'Update Account' : 'Add Account'}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};
