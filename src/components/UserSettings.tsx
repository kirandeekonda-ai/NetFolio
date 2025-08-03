import { FC, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useUser } from '@supabase/auth-helpers-react';
import { LLMProviderSettings } from './LLMProviderSettings';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useBalanceProtection } from '@/hooks/useBalanceProtection';

export const UserSettings: FC = () => {
  const user = useUser();
  const router = useRouter();
  const { checkProtectionStatus } = useBalanceProtection();
  
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [activeSection, setActiveSection] = useState<'general' | 'security' | 'ai' | 'account'>('general');
  
  // Balance protection state
  const [balanceProtection, setBalanceProtection] = useState({
    enabled: false,
    type: 'pin' as 'pin' | 'password',
    value: '',
    confirmValue: '',
    isLoading: false,
    saveStatus: 'idle' as 'idle' | 'saving' | 'success' | 'error',
  });

  const sections = [
    { id: 'general', title: 'General', icon: '⚙️', description: 'Currency and display preferences' },
    { id: 'security', title: 'Security & Privacy', icon: '🔒', description: 'Balance protection and privacy settings' },
    { id: 'ai', title: 'AI Configuration', icon: '🤖', description: 'LLM providers and AI processing settings' },
    { id: 'account', title: 'Account Management', icon: '👤', description: 'Account deletion and data management' },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      {/* Currency Settings */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
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
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      {/* Balance Protection Settings */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-xl text-white">🔒</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Balance Protection
              </h3>
              <p className="text-sm text-gray-500">
                Secure your financial information with PIN or password protection
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Enable Balance Protection</h4>
              <p className="text-sm text-gray-600">Require authentication to view your total balance in the dashboard</p>
            </div>
            <div className="flex items-center space-x-3">
              {balanceProtection.isLoading && !balanceProtection.enabled && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              )}
              {balanceProtection.saveStatus === 'success' && !balanceProtection.isLoading && (
                <span className="text-green-600 text-sm">✓</span>
              )}
              {balanceProtection.saveStatus === 'error' && !balanceProtection.isLoading && (
                <span className="text-red-600 text-sm">✗</span>
              )}
              <button
                onClick={handleToggleBalanceProtection}
                disabled={balanceProtection.isLoading && !balanceProtection.enabled}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  balanceProtection.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    balanceProtection.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Protection Configuration */}
          {balanceProtection.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6 border-t pt-6"
            >
              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Configure Your Protection</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Choose your protection type and set up your PIN or password below, then click "Save Protection Settings" to activate.
                    </p>
                  </div>
                </div>
              </div>
              {/* Protection Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Protection Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setBalanceProtection(prev => ({
                      ...prev,
                      type: 'pin',
                      value: '',
                      confirmValue: '',
                    }))}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      balanceProtection.type === 'pin'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">📱</div>
                    <div className="font-medium">PIN Code</div>
                    <div className="text-sm text-gray-600">4-6 digit numeric code</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceProtection(prev => ({
                      ...prev,
                      type: 'password',
                      value: '',
                      confirmValue: '',
                    }))}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      balanceProtection.type === 'password'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">🔑</div>
                    <div className="font-medium">Password</div>
                    <div className="text-sm text-gray-600">Alphanumeric password</div>
                  </button>
                </div>
              </div>

              {/* PIN/Password Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {balanceProtection.type === 'pin' ? 'Enter PIN' : 'Enter Password'}
                  </label>
                  <Input
                    type={balanceProtection.type === 'pin' ? 'tel' : 'password'}
                    value={balanceProtection.value}
                    onChange={(e) => setBalanceProtection(prev => ({
                      ...prev,
                      value: e.target.value,
                    }))}
                    placeholder={balanceProtection.type === 'pin' ? 'Enter 4-6 digit PIN' : 'Enter password'}
                    maxLength={balanceProtection.type === 'pin' ? 6 : undefined}
                    className={balanceProtection.type === 'pin' ? 'text-center tracking-widest' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {balanceProtection.type === 'pin' ? 'Confirm PIN' : 'Confirm Password'}
                  </label>
                  <Input
                    type={balanceProtection.type === 'pin' ? 'tel' : 'password'}
                    value={balanceProtection.confirmValue}
                    onChange={(e) => setBalanceProtection(prev => ({
                      ...prev,
                      confirmValue: e.target.value,
                    }))}
                    placeholder={balanceProtection.type === 'pin' ? 'Confirm PIN' : 'Confirm password'}
                    maxLength={balanceProtection.type === 'pin' ? 6 : undefined}
                    className={balanceProtection.type === 'pin' ? 'text-center tracking-widest' : ''}
                  />
                </div>
              </div>

              {/* Validation Messages */}
              {balanceProtection.value && balanceProtection.confirmValue && 
               balanceProtection.value !== balanceProtection.confirmValue && (
                <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">
                  {balanceProtection.type === 'pin' ? 'PINs' : 'Passwords'} do not match
                </div>
              )}
              
              {balanceProtection.type === 'pin' && balanceProtection.value && 
               !/^\d{4,6}$/.test(balanceProtection.value) && (
                <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">
                  PIN must be 4-6 digits
                </div>
              )}
              
              {balanceProtection.type === 'password' && balanceProtection.value && 
               balanceProtection.value.length < 4 && (
                <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">
                  Password must be at least 4 characters
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSaveBalanceProtection}
                  disabled={balanceProtection.isLoading || balanceProtection.saveStatus === 'saving'}
                  className={`px-6 py-2 ${
                    balanceProtection.saveStatus === 'success' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : balanceProtection.saveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : ''
                  }`}
                >
                  {balanceProtection.saveStatus === 'saving' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  )}
                  {balanceProtection.saveStatus === 'success' ? '✓ Saved' : 
                   balanceProtection.saveStatus === 'error' ? '✗ Error' : 
                   'Save Protection Settings'}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <LLMProviderSettings />
      </div>
    </div>
  );

  const renderAccountSettings = () => (
    <div className="space-y-6">
      {/* Delete Profile Section */}
      <div className="bg-white border border-red-200 rounded-xl shadow-sm p-6">
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
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return <motion.div key="general" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>{renderGeneralSettings()}</motion.div>;
      case 'security':
        return <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>{renderSecuritySettings()}</motion.div>;
      case 'ai':
        return <motion.div key="ai" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>{renderAISettings()}</motion.div>;
      case 'account':
        return <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>{renderAccountSettings()}</motion.div>;
      default:
        return renderGeneralSettings();
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('currency, balance_protection_enabled, balance_protection_type')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setCurrency(data.currency || 'USD');
          setBalanceProtection(prev => ({
            ...prev,
            enabled: data.balance_protection_enabled || false,
            type: data.balance_protection_type || 'pin',
          }));
        }
      }
    };

    fetchSettings();
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

  const handleToggleBalanceProtection = async () => {
    if (!user) return;
    
    const newEnabledState = !balanceProtection.enabled;
    
    // If enabling, just update the local state to show configuration options
    // Don't save to database until they configure and click save
    if (newEnabledState) {
      setBalanceProtection(prev => ({
        ...prev,
        enabled: true,
        value: '',
        confirmValue: '',
        saveStatus: 'idle'
      }));
      return;
    }
    
    // If disabling, save immediately to database
    setBalanceProtection(prev => ({
      ...prev,
      enabled: false,
      value: '',
      confirmValue: '',
      isLoading: true,
    }));

    try {
      const response = await fetch('/api/setup-balance-protection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: false,
          type: null,
          value: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update balance protection');
      }

      setBalanceProtection(prev => ({ 
        ...prev, 
        isLoading: false,
        saveStatus: 'success'
      }));
      
      // Refresh protection status in the hook
      await checkProtectionStatus();
      
      // Clear success status after delay
      setTimeout(() => setBalanceProtection(prev => ({ ...prev, saveStatus: 'idle' })), 2000);
      
    } catch (error) {
      console.error('Failed to toggle balance protection:', error);
      // Revert the local state on error
      setBalanceProtection(prev => ({
        ...prev,
        enabled: true, // Revert to enabled on error
        isLoading: false,
        saveStatus: 'error'
      }));
      setTimeout(() => setBalanceProtection(prev => ({ ...prev, saveStatus: 'idle' })), 3000);
    }
  };

  const handleSaveBalanceProtection = async () => {
    if (!user) return;

    if (balanceProtection.enabled) {
      // Validate protection settings
      if (!balanceProtection.value.trim()) {
        setBalanceProtection(prev => ({ ...prev, saveStatus: 'error' }));
        setTimeout(() => setBalanceProtection(prev => ({ ...prev, saveStatus: 'idle' })), 3000);
        return;
      }

      if (balanceProtection.type === 'pin' && !/^\d{4,6}$/.test(balanceProtection.value)) {
        setBalanceProtection(prev => ({ ...prev, saveStatus: 'error' }));
        setTimeout(() => setBalanceProtection(prev => ({ ...prev, saveStatus: 'idle' })), 3000);
        return;
      }

      if (balanceProtection.type === 'password' && balanceProtection.value.length < 4) {
        setBalanceProtection(prev => ({ ...prev, saveStatus: 'error' }));
        setTimeout(() => setBalanceProtection(prev => ({ ...prev, saveStatus: 'idle' })), 3000);
        return;
      }

      if (balanceProtection.value !== balanceProtection.confirmValue) {
        setBalanceProtection(prev => ({ ...prev, saveStatus: 'error' }));
        setTimeout(() => setBalanceProtection(prev => ({ ...prev, saveStatus: 'idle' })), 3000);
        return;
      }
    }

    setBalanceProtection(prev => ({ ...prev, isLoading: true, saveStatus: 'saving' }));

    try {
      const response = await fetch('/api/setup-balance-protection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: balanceProtection.enabled,
          type: balanceProtection.enabled ? balanceProtection.type : null,
          value: balanceProtection.enabled ? balanceProtection.value : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update balance protection');
      }

      setBalanceProtection(prev => ({ 
        ...prev, 
        saveStatus: 'success',
        value: '', 
        confirmValue: '' 
      }));
      
      checkProtectionStatus(); // Refresh protection status
      setTimeout(() => setBalanceProtection(prev => ({ ...prev, saveStatus: 'idle' })), 3000);
    } catch (error) {
      console.error('Error saving balance protection:', error);
      setBalanceProtection(prev => ({ ...prev, saveStatus: 'error' }));
      setTimeout(() => setBalanceProtection(prev => ({ ...prev, saveStatus: 'idle' })), 3000);
    } finally {
      setBalanceProtection(prev => ({ ...prev, isLoading: false }));
    }
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
    <div className="flex gap-8">
      {/* Sidebar Navigation */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sticky top-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Settings</h2>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as 'general' | 'security' | 'ai' | 'account')}
                className={`w-full flex items-start space-x-4 p-4 rounded-lg text-left transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-blue-50 border border-blue-200 text-blue-900'
                    : 'hover:bg-gray-50 border border-transparent text-gray-700 hover:text-gray-900'
                }`}
              >
                <div className="flex-shrink-0 text-xl mt-0.5">
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{section.title}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {section.description}
                  </div>
                </div>
                {activeSection === section.id && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </div>

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
