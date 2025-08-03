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
  { id: 5, title: 'Account', description: 'Setup your first bank account', icon: '🏦' },
  { id: 6, title: 'Getting Started', description: 'Choose how to begin', icon: '🚀' },
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
  { 
    id: 'fresh', 
    title: 'Start Fresh', 
    description: 'Begin tracking from today',
    icon: '🌟',
    action: '/dashboard'
  },
];

const suggestedCategories = [
  { id: 'food', name: 'Food & Dining', color: '#FFC107', icon: '🍽️' },
  { id: 'shopping', name: 'Shopping', color: '#F44336', icon: '🛍️' },
  { id: 'entertainment', name: 'Entertainment', color: '#2196F3', icon: '🎬' },
  { id: 'travel', name: 'Travel', color: '#4CAF50', icon: '✈️' },
  { id: 'health', name: 'Health & Medical', color: '#9C27B0', icon: '🏥' },
  { id: 'utilities', name: 'Utilities', color: '#FF9800', icon: '⚡' },
  { id: 'transportation', name: 'Transportation', color: '#607D8B', icon: '🚗' },
  { id: 'education', name: 'Education', color: '#795548', icon: '📚' },
  { id: 'income', name: 'Income', color: '#8BC34A', icon: '💰' },
  { id: 'investment', name: 'Investment', color: '#00BCD4', icon: '📈' },
  { id: 'insurance', name: 'Insurance', color: '#9E9E9E', icon: '🛡️' },
  { id: 'other', name: 'Other', color: '#607D8B', icon: '📁' },
];

export const WelcomeWizard: FC<WelcomeWizardProps> = ({ user, onComplete }) => {
  const supabase = useSupabaseClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    goals: [] as string[],
    currency: 'USD',
    categories: ['food', 'shopping', 'transportation', 'utilities'] as string[], // Pre-select essential categories
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

  const handleComplete = async (method: string) => {
    setIsLoading(true);
    
    try {
      // Convert selected category IDs to full category objects
      const selectedCategoryObjects = suggestedCategories.filter(cat => 
        formData.categories.includes(cat.id)
      ).map(cat => ({
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
              <p className="text-gray-600 mt-2">We've pre-selected common categories. Add or remove as needed.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {suggestedCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                    formData.categories.includes(category.id)
                      ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div 
                    className="text-2xl mb-2"
                    style={{ filter: formData.categories.includes(category.id) ? 'none' : 'grayscale(0.5)' }}
                  >
                    {category.icon}
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {category.name}
                  </div>
                  <div 
                    className="w-3 h-3 rounded-full mx-auto mt-2 border"
                    style={{ 
                      backgroundColor: formData.categories.includes(category.id) ? category.color : 'transparent',
                      borderColor: category.color 
                    }}
                  />
                </button>
              ))}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> You can add, edit, or remove categories later in your profile settings.
                {formData.categories.length === 0 && " Select at least a few to get started!"}
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

      case 6:
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
