import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';

interface WelcomeWizardProps {
  user: any;
  onComplete: () => void;
}

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: string;
}

const steps: WizardStep[] = [
  { id: 1, title: 'Welcome', description: 'Get started with NetFolio', icon: '👋' },
  { id: 2, title: 'Goals', description: 'Set your financial goals', icon: '🎯' },
  { id: 3, title: 'Currency', description: 'Choose your base currency', icon: '💰' },
  { id: 4, title: 'Categories', description: 'Setup expense categories', icon: '🏷️' },
  { id: 5, title: 'Privacy', description: 'Secure your balance display', icon: '🔒' },
  { id: 6, title: 'Account', description: 'Setup your first bank account', icon: '🏦' },
  { id: 7, title: 'Getting Started', description: 'Choose how to begin', icon: '🚀' },
];

const currencies = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
];

const financialGoals = [
  { id: 'budgeting', title: 'Better Budgeting', description: 'Track spending and stay within limits', icon: '📊', available: true },
  { id: 'saving', title: 'Increase Savings', description: 'Build an emergency fund and save more', icon: '💰', available: false },
  { id: 'investing', title: 'Start Investing', description: 'Grow wealth through investments', icon: '📈', available: false },
  { id: 'debt', title: 'Pay Off Debt', description: 'Eliminate debts and improve credit', icon: '💳', available: false },
  { id: 'overview', title: 'Financial Overview', description: 'Get a complete picture of finances', icon: '🔍', available: false },
];

const startingMethods = [
  { 
    id: 'upload', 
    title: 'Upload Bank Statement', 
    description: 'Quick start with your existing transactions',
    icon: '📄',
    action: '/statements'
  },
  { 
    id: 'manual', 
    title: 'Setup Bank Accounts', 
    description: 'Add accounts and starting balances',
    icon: '🏦',
    action: '/bank-accounts'
  },
];

const suggestedCategories = [
  // Essential Daily Categories
  { id: 'food', name: 'Food & Dining', color: '#FFC107', icon: '🍽️', essential: true },
  { id: 'groceries', name: 'Groceries', color: '#8BC34A', icon: '🛒', essential: true },
  { id: 'transportation', name: 'Transportation', color: '#607D8B', icon: '🚗', essential: true },
  { id: 'utilities', name: 'Utilities', color: '#FF9800', icon: '⚡', essential: true },
  
  // Housing & Living
  { id: 'rent', name: 'Rent/Mortgage', color: '#795548', icon: '🏠' },
  { id: 'household', name: 'Household Items', color: '#9E9E9E', icon: '🏡' },
  { id: 'maintenance', name: 'Home Maintenance', color: '#607D8B', icon: '🔧' },
  
  // Shopping & Personal
  { id: 'shopping', name: 'Shopping', color: '#F44336', icon: '🛍️', essential: true },
  { id: 'clothing', name: 'Clothing', color: '#E91E63', icon: '👕' },
  { id: 'personal_care', name: 'Personal Care', color: '#9C27B0', icon: '💄' },
  { id: 'gifts', name: 'Gifts', color: '#FF5722', icon: '🎁' },
  
  // Health & Wellness
  { id: 'health', name: 'Health & Medical', color: '#9C27B0', icon: '🏥', essential: true },
  { id: 'pharmacy', name: 'Pharmacy', color: '#FF5722', icon: '💊' },
  { id: 'fitness', name: 'Fitness & Gym', color: '#FF9800', icon: '💪' },
  { id: 'wellness', name: 'Wellness & Beauty', color: '#E91E63', icon: '🧘' },
  
  // Entertainment & Lifestyle
  { id: 'entertainment', name: 'Entertainment', color: '#2196F3', icon: '🎬', essential: true },
  { id: 'dining_out', name: 'Dining Out', color: '#FF6F00', icon: '🍕' },
  { id: 'coffee_tea', name: 'Coffee & Tea', color: '#8D6E63', icon: '☕' },
  { id: 'alcohol', name: 'Alcohol', color: '#8E24AA', icon: '🍷' },
  { id: 'movies', name: 'Movies & Shows', color: '#1976D2', icon: '🎭' },
  { id: 'books', name: 'Books & Media', color: '#388E3C', icon: '📚' },
  { id: 'hobbies', name: 'Hobbies', color: '#7B1FA2', icon: '🎨' },
  
  // Travel & Transport
  { id: 'travel', name: 'Travel', color: '#4CAF50', icon: '✈️', essential: true },
  { id: 'fuel', name: 'Fuel', color: '#FF9800', icon: '⛽' },
  { id: 'parking', name: 'Parking', color: '#607D8B', icon: '🅿️' },
  { id: 'public_transport', name: 'Public Transport', color: '#00796B', icon: '🚇' },
  { id: 'rideshare', name: 'Taxi/Rideshare', color: '#FFC107', icon: '🚕' },
  
  // Bills & Services
  { id: 'phone', name: 'Phone/Mobile', color: '#009688', icon: '📱' },
  { id: 'internet', name: 'Internet', color: '#00BCD4', icon: '�' },
  { id: 'streaming', name: 'Streaming Services', color: '#E91E63', icon: '📺' },
  { id: 'subscriptions', name: 'Subscriptions', color: '#673AB7', icon: '📋' },
  
  // Financial & Professional
  { id: 'income', name: 'Income', color: '#4CAF50', icon: '💰', essential: true },
  { id: 'salary', name: 'Salary', color: '#2E7D32', icon: '💵' },
  { id: 'business', name: 'Business', color: '#1565C0', icon: '💼' },
  { id: 'freelance', name: 'Freelance', color: '#0277BD', icon: '💻' },
  { id: 'investment', name: 'Investment', color: '#00BCD4', icon: '📈', essential: true },
  { id: 'savings', name: 'Savings', color: '#388E3C', icon: '🏦' },
  { id: 'insurance', name: 'Insurance', color: '#9E9E9E', icon: '🛡️', essential: true },
  { id: 'taxes', name: 'Taxes', color: '#5D4037', icon: '📊' },
  { id: 'fees', name: 'Bank Fees', color: '#795548', icon: '🏛️' },
  
  // Education & Development
  { id: 'education', name: 'Education', color: '#795548', icon: '📚', essential: true },
  { id: 'courses', name: 'Online Courses', color: '#FF7043', icon: '🎓' },
  { id: 'books_learning', name: 'Books & Learning', color: '#8BC34A', icon: '📖' },
  
  // Family & Kids
  { id: 'kids', name: 'Kids & Family', color: '#FFEB3B', icon: '👨‍👩‍👧‍👦' },
  { id: 'childcare', name: 'Childcare', color: '#FFA726', icon: '�' },
  { id: 'school', name: 'School Fees', color: '#AB47BC', icon: '🏫' },
  
  // Pets & Animals
  { id: 'pets', name: 'Pets', color: '#8D6E63', icon: '🐕' },
  { id: 'vet', name: 'Veterinary', color: '#A1887F', icon: '🏥' },
  
  // Miscellaneous
  { id: 'charity', name: 'Charity & Donations', color: '#F48FB1', icon: '❤️' },
  { id: 'cash', name: 'Cash Withdrawal', color: '#90A4AE', icon: '�' },
  { id: 'transfer', name: 'Transfers', color: '#78909C', icon: '🔄' },
  { id: 'uncategorized', name: 'Uncategorized', color: '#9E9E9E', icon: '❓' },
  { id: 'other', name: 'Other', color: '#607D8B', icon: '📁' },
];

export const WelcomeWizard: FC<WelcomeWizardProps> = ({ user, onComplete }) => {
  const supabase = useSupabaseClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    goals: [] as string[],
    currency: 'USD',
    categories: ['food', 'groceries', 'shopping', 'transportation', 'utilities', 'health'] as string[], // Pre-select essential categories
    balanceProtection: {
      enabled: false,
      type: 'pin' as 'pin' | 'password',
      value: '',
    },
    startingMethod: '',
    bankAccount: {
      bank_name: '',
      account_type: 'checking' as 'checking' | 'savings' | 'credit' | 'investment',
      account_nickname: '',
    },
  });

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoalToggle = (goalId: string, available: boolean) => {
    if (!available) return; // Prevent selection of unavailable goals
    
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(g => g !== goalId)
        : [...prev.goals, goalId]
    }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleBankAccountChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      bankAccount: {
        ...prev.bankAccount,
        [field]: value,
      },
    }));
  };

  const handleBalanceProtectionChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      balanceProtection: {
        ...prev.balanceProtection,
        [field]: value,
      },
    }));
  };

  const handleComplete = async (method: string) => {
    setIsLoading(true);
    
    try {
      // Convert selected category IDs to full category objects with proper IDs
      const selectedCategoryObjects = suggestedCategories.filter(cat => 
        formData.categories.includes(cat.id)
      ).map(cat => ({
        id: cat.id, // Use the category's existing ID
        name: cat.name,
        color: cat.color,
        icon: cat.icon
      }));

      // Save user preferences with selected categories
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          currency: formData.currency,
          onboarded: true,
          categories: selectedCategoryObjects.length > 0 ? selectedCategoryObjects : [],
        });

      if (prefsError) {
        console.error('Error saving preferences:', prefsError);
        return;
      }

      // Setup balance protection if enabled
      if (formData.balanceProtection.enabled && formData.balanceProtection.value.trim()) {
        const protectionResponse = await fetch('/api/setup-balance-protection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled: true,
            type: formData.balanceProtection.type,
            value: formData.balanceProtection.value,
          }),
        });

        if (!protectionResponse.ok) {
          console.error('Error setting up balance protection:', await protectionResponse.json());
          // Don't fail the onboarding process for this
        }
      }

      // Create bank account if user provided info
      if (formData.bankAccount.bank_name.trim()) {
        const accountData = {
          bank_name: formData.bankAccount.bank_name,
          account_type: formData.bankAccount.account_type,
          account_nickname: formData.bankAccount.account_nickname || null,
          currency: formData.currency,
        };

        const response = await fetch('/api/bank-accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(accountData),
        });

        if (!response.ok) {
          console.error('Error creating bank account:', await response.json());
          // Don't fail the onboarding process for this
        }
      }

      // Navigate based on chosen method
      const selectedMethod = startingMethods.find(m => m.id === method);
      if (selectedMethod) {
        window.location.href = selectedMethod.action;
      } else {
        onComplete();
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-6xl mb-4">👋</div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome to NetFolio!</h2>
            <p className="text-xl text-gray-600 max-w-md mx-auto">
              Let's set up your personal finance dashboard in just a few steps.
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">What you'll get:</h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-center space-x-2">
                  <span>📄</span>
                  <span>Easy PDF statement upload & processing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>🔒</span>
                  <span>Smart data masking & privacy protection</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>🤖</span>
                  <span>AI-powered transaction categorization</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Interactive spending analytics & insights</span>
                </li>
              </ul>
            </div>
            
            {/* Progress Estimate */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                ⏱️ Setup takes about 2 minutes
              </p>
            </div>
            
            <Button onClick={handleNext} className="px-8 py-3">
              Let's Get Started
            </Button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-gray-900">What are your financial goals?</h2>
              <p className="text-gray-600 mt-2">Select all that apply - we'll customize your experience</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {financialGoals.map((goal) => (
                <div key={goal.id} className="relative">
                  <button
                    onClick={() => handleGoalToggle(goal.id, goal.available)}
                    disabled={!goal.available}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      !goal.available 
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70'
                        : formData.goals.includes(goal.id)
                        ? 'border-primary bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className={`text-2xl ${!goal.available ? 'opacity-50' : ''}`}>{goal.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-semibold ${!goal.available ? 'text-gray-500' : 'text-gray-900'}`}>
                            {goal.title}
                          </h3>
                          {!goal.available && (
                            <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${!goal.available ? 'text-gray-400' : 'text-gray-600'}`}>
                          {goal.description}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleNext}>
                Continue
              </Button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <h2 className="text-2xl font-bold text-gray-900">Choose your base currency</h2>
              <p className="text-gray-600 mt-2">This will be used for all your financial calculations</p>
              <div className="bg-blue-50 p-3 rounded-lg mt-4">
                <p className="text-sm text-blue-800">
                  💡 You can update your currency preference anytime in your profile page
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currencies.map((currency) => (
                <motion.button
                  key={currency.code}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFormData(prev => ({ ...prev, currency: currency.code }))}
                  className={`group relative p-5 rounded-xl border transition-all duration-300 ${
                    formData.currency === currency.code
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-200/50 ring-2 ring-blue-500/20'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50/30'
                  }`}
                >
                  {/* Selected indicator */}
                  {formData.currency === currency.code && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4">
                    <div className={`relative flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      formData.currency === currency.code
                        ? 'bg-gradient-to-br from-blue-100 to-indigo-100 shadow-inner'
                        : 'bg-gray-50 group-hover:bg-blue-50'
                    }`}>
                      <span className="text-2xl filter drop-shadow-sm">{currency.flag}</span>
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className={`font-bold text-lg transition-colors duration-300 ${
                        formData.currency === currency.code
                          ? 'text-blue-900'
                          : 'text-gray-900 group-hover:text-blue-800'
                      }`}>
                        {currency.code}
                      </div>
                      <div className={`text-sm transition-colors duration-300 ${
                        formData.currency === currency.code
                          ? 'text-blue-700'
                          : 'text-gray-600 group-hover:text-blue-600'
                      }`}>
                        {currency.name}
                      </div>
                      <div className={`text-xs font-medium mt-1 px-2 py-1 rounded-full inline-block transition-all duration-300 ${
                        formData.currency === currency.code
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}>
                        {currency.symbol}
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/5 transition-all duration-300 pointer-events-none" />
                </motion.button>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleNext}>
                Continue
              </Button>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🏷️</div>
              <h2 className="text-2xl font-bold text-gray-900">Choose your expense categories</h2>
              <p className="text-gray-600 mt-2">We've pre-selected essential categories. Add or remove as needed.</p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mt-4">
                <p className="text-sm text-blue-800">
                  ✨ <strong>Pro Tip:</strong> Start with essential categories and add more later as needed. You can always customize these in your profile settings.
                </p>
              </div>
            </div>
            
            {/* Essential Categories Section */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">⭐ Essential Categories</h3>
                <p className="text-sm text-gray-600 mb-4">These are commonly used by most users</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {suggestedCategories.filter(cat => cat.essential).map((category) => (
                  <motion.button
                    key={category.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`group relative p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                      formData.categories.includes(category.id)
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-200/50 transform scale-105'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md'
                    }`}
                  >
                    {/* Selected indicator */}
                    {formData.categories.includes(category.id) && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <span className="text-xs text-white">✓</span>
                      </motion.div>
                    )}
                    
                    <div 
                      className="text-3xl mb-2 transition-all duration-200"
                      style={{ 
                        filter: formData.categories.includes(category.id) ? 'none' : 'grayscale(0.3)',
                        transform: formData.categories.includes(category.id) ? 'scale(1.1)' : 'scale(1)'
                      }}
                    >
                      {category.icon}
                    </div>
                    <div className={`text-sm font-medium transition-colors duration-200 ${
                      formData.categories.includes(category.id) ? 'text-blue-900' : 'text-gray-900 group-hover:text-blue-800'
                    }`}>
                      {category.name}
                    </div>
                    <div 
                      className="w-4 h-4 rounded-full mx-auto mt-2 border-2 transition-all duration-200"
                      style={{ 
                        backgroundColor: formData.categories.includes(category.id) ? category.color : 'transparent',
                        borderColor: formData.categories.includes(category.id) ? category.color : '#D1D5DB',
                        boxShadow: formData.categories.includes(category.id) ? `0 0 0 2px ${category.color}20` : 'none'
                      }}
                    />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* All Categories Section - Expandable */}
            <div className="space-y-4">
              <details className="group">
                <summary className="flex items-center justify-center space-x-2 cursor-pointer text-blue-600 hover:text-blue-800 transition-colors duration-200 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:border-blue-300">
                  <span className="text-sm font-medium">🔍 Browse All Categories</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {suggestedCategories.length - suggestedCategories.filter(cat => cat.essential).length} more
                  </span>
                  <svg className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {suggestedCategories.filter(cat => !cat.essential).map((category) => (
                      <motion.button
                        key={category.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategoryToggle(category.id)}
                        className={`group relative p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                          formData.categories.includes(category.id)
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md transform scale-105'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        {/* Selected indicator */}
                        {formData.categories.includes(category.id) && (
                          <motion.div 
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md"
                          >
                            <span className="text-xs text-white">✓</span>
                          </motion.div>
                        )}
                        
                        <div 
                          className="text-2xl mb-1 transition-all duration-200"
                          style={{ 
                            filter: formData.categories.includes(category.id) ? 'none' : 'grayscale(0.5)',
                          }}
                        >
                          {category.icon}
                        </div>
                        <div className={`text-xs font-medium transition-colors duration-200 ${
                          formData.categories.includes(category.id) ? 'text-blue-900' : 'text-gray-800 group-hover:text-blue-800'
                        }`}>
                          {category.name}
                        </div>
                        <div 
                          className="w-3 h-3 rounded-full mx-auto mt-1 border transition-all duration-200"
                          style={{ 
                            backgroundColor: formData.categories.includes(category.id) ? category.color : 'transparent',
                            borderColor: formData.categories.includes(category.id) ? category.color : '#D1D5DB'
                          }}
                        />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </details>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-800">
                💡 <strong>Selected: {formData.categories.length} categories</strong> • You can add, edit, or remove categories later in your profile settings.
                {formData.categories.length === 0 && " Select at least a few essential categories to get started!"}
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleNext}>
                Continue {formData.categories.length > 0 && `(${formData.categories.length} selected)`}
              </Button>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-900">Secure Your Balance Display</h2>
              <p className="text-gray-600 mt-2">Add an extra layer of privacy to your financial data</p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200/50">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-xl text-white">🛡️</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Why protect your balance?</h3>
                  <ul className="space-y-2 text-blue-800 text-sm">
                    <li className="flex items-center space-x-2">
                      <span className="text-blue-500">•</span>
                      <span>Hide your total balance when others might see your screen</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-blue-500">•</span>
                      <span>Protect financial privacy in public spaces</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-blue-500">•</span>
                      <span>Optional - you can enable or disable anytime</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Enable Balance Protection</h3>
                  <p className="text-sm text-gray-600">Require PIN/password to view your total balance</p>
                </div>
                <div className="relative">
                  {/* Blinking ring effect when toggle is off */}
                  {!formData.balanceProtection.enabled && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-30"></div>
                  )}
                  <button
                    onClick={() => handleBalanceProtectionChange('enabled', !formData.balanceProtection.enabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formData.balanceProtection.enabled ? 'bg-blue-600' : 'bg-gray-200 animate-pulse'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.balanceProtection.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Protection Type and Value */}
              {formData.balanceProtection.enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Protection Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Protection Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          handleBalanceProtectionChange('type', 'pin');
                          handleBalanceProtectionChange('value', '');
                        }}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          formData.balanceProtection.type === 'pin'
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">📱</div>
                        <div className="font-medium">PIN</div>
                        <div className="text-sm text-gray-600">4-6 digit code</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleBalanceProtectionChange('type', 'password');
                          handleBalanceProtectionChange('value', '');
                        }}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          formData.balanceProtection.type === 'password'
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">🔑</div>
                        <div className="font-medium">Password</div>
                        <div className="text-sm text-gray-600">Alphanumeric</div>
                      </button>
                    </div>
                  </div>

                  {/* PIN/Password Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.balanceProtection.type === 'pin' ? 'Enter PIN' : 'Enter Password'}
                    </label>
                    <Input
                      type={formData.balanceProtection.type === 'pin' ? 'tel' : 'password'}
                      value={formData.balanceProtection.value}
                      onChange={(e) => handleBalanceProtectionChange('value', e.target.value)}
                      placeholder={formData.balanceProtection.type === 'pin' ? 'Enter 4-6 digit PIN' : 'Enter a secure password'}
                      maxLength={formData.balanceProtection.type === 'pin' ? 6 : undefined}
                      className={formData.balanceProtection.type === 'pin' ? 'text-center tracking-widest' : ''}
                    />
                    {formData.balanceProtection.type === 'pin' && formData.balanceProtection.value && !/^\d{4,6}$/.test(formData.balanceProtection.value) && (
                      <p className="text-red-600 text-sm mt-1">PIN must be 4-6 digits</p>
                    )}
                    {formData.balanceProtection.type === 'password' && formData.balanceProtection.value && formData.balanceProtection.value.length < 4 && (
                      <p className="text-red-600 text-sm mt-1">Password must be at least 4 characters</p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                💡 <strong>Remember:</strong> You can change these settings anytime in your profile.
                {!formData.balanceProtection.enabled && " This feature is completely optional."}
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
              <Button 
                onClick={handleNext}
                disabled={formData.balanceProtection.enabled && (!formData.balanceProtection.value.trim() || 
                  (formData.balanceProtection.type === 'pin' && !/^\d{4,6}$/.test(formData.balanceProtection.value)) ||
                  (formData.balanceProtection.type === 'password' && formData.balanceProtection.value.length < 4))}
              >
                Continue
              </Button>
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🏦</div>
              <h2 className="text-2xl font-bold text-gray-900">Set up your first bank account</h2>
              <p className="text-gray-600 mt-2">This helps us get you started with accurate balance tracking</p>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <Input
                  type="text"
                  value={formData.bankAccount.bank_name}
                  onChange={(e) => handleBankAccountChange('bank_name', e.target.value)}
                  placeholder="e.g., Chase, Bank of America"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </label>
                <select
                  value={formData.bankAccount.account_type}
                  onChange={(e) => handleBankAccountChange('account_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="savings">Savings Account</option>
                  {/* <option value="credit">Credit Card</option> */}
                  <option value="investment">Investment Account</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Nickname (Optional)
                </label>
                <Input
                  type="text"
                  value={formData.bankAccount.account_nickname}
                  onChange={(e) => handleBankAccountChange('account_nickname', e.target.value)}
                  placeholder="e.g., Main Checking"
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                You can skip this step and add accounts later if you prefer
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleNext}>
                Continue
              </Button>
            </div>
          </motion.div>
        );

      case 7:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold text-gray-900">How would you like to get started?</h2>
              <p className="text-gray-600 mt-2">Choose the method that works best for you</p>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg mt-4">
                <p className="text-sm text-gray-700">
                  🎯 <strong>Pro Tip:</strong> Uploading a statement gives you the fastest setup with real data!
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              {startingMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleComplete(method.id)}
                  disabled={isLoading}
                  className="w-full p-6 rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-blue-50 transition-all duration-200 text-left group disabled:opacity-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className="text-3xl">{method.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-900">
                        {method.title}
                      </h3>
                      <p className="text-gray-600 mt-1">{method.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-primary">→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handleBack} disabled={isLoading}>
                Back
              </Button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full">
        {/* Progress Indicator */}
        <Card className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-300 ${
                      currentStep >= step.id
                        ? 'bg-primary text-white shadow-lg scale-110'
                        : currentStep === step.id - 1
                        ? 'bg-blue-100 text-primary border-2 border-blue-200'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? '✓' : step.icon}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`font-medium text-sm ${
                      currentStep >= step.id ? 'text-primary' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 rounded transition-colors duration-300 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Step Content */}
        <Card className="min-h-96">
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
};
