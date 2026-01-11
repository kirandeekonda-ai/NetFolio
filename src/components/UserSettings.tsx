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
import { useKeepAlive } from '@/hooks/useKeepAlive';

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
  const [activeSection, setActiveSection] = useState<'general' | 'security' | 'ai' | 'keepalive' | 'account'>('general');

  // Keep alive state
  const [keepAlive, setKeepAlive] = useState({
    enabled: false,
    url: '',
    isLoading: false,
    saveStatus: 'idle' as 'idle' | 'saving' | 'success' | 'error',
    testStatus: 'idle' as 'idle' | 'testing' | 'success' | 'error',
    testMessage: '',
  });

  // Balance protection state
  const [balanceProtection, setBalanceProtection] = useState({
    enabled: false,
    type: 'pin' as 'pin' | 'password',
    value: '',
    confirmValue: '',
    isLoading: false,
    saveStatus: 'idle' as 'idle' | 'saving' | 'success' | 'error',
  });

  // Enable keep alive functionality
  useKeepAlive({
    url: keepAlive.enabled ? keepAlive.url : undefined,
    enabled: keepAlive.enabled && !!keepAlive.url.trim(),
    interval: 5 * 60 * 1000, // 5 minutes
  });

  const sections = [
    { id: 'general', title: 'General', icon: '⚙️', description: 'Currency and display preferences' },
    { id: 'security', title: 'Security & Privacy', icon: '🔒', description: 'Balance protection and privacy settings' },
    { id: 'ai', title: 'AI Configuration', icon: '🤖', description: 'LLM providers and AI processing settings' },
    { id: 'keepalive', title: 'Keep Alive', icon: '🔄', description: 'Prevent hosting shutdown and database deletion' },
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
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${balanceProtection.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${balanceProtection.enabled ? 'translate-x-5' : 'translate-x-0'
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
                    className={`p-4 border-2 rounded-lg text-left transition-all ${balanceProtection.type === 'pin'
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
                    className={`p-4 border-2 rounded-lg text-left transition-all ${balanceProtection.type === 'password'
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
                  className={`px-6 py-2 ${balanceProtection.saveStatus === 'success'
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

  const renderKeepAliveSettingsDuplicate = () => (
    <div className="space-y-6">
      {/* Keep Alive Configuration */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Keep Alive Configuration
          </h3>
          <p className="text-gray-600 text-sm">
            Prevent free hosting shutdown and database deletion by automatically pinging your website every 5 minutes
          </p>
        </div>

        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h4 className="text-sm font-medium text-gray-900">Enable Keep Alive</h4>
              {keepAlive.saveStatus === 'success' && !keepAlive.isLoading && (
                <span className="text-green-600 text-sm">✓</span>
              )}
              {keepAlive.saveStatus === 'error' && !keepAlive.isLoading && (
                <span className="text-red-600 text-sm">✗</span>
              )}
            </div>
            <button
              onClick={handleToggleKeepAlive}
              disabled={keepAlive.isLoading}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${keepAlive.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${keepAlive.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

          {/* URL Configuration */}
          {keepAlive.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 border-t pt-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL to Keep Alive
                </label>
                <Input
                  type="url"
                  value={keepAlive.url}
                  onChange={(e) => setKeepAlive(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://your-website.com/api/keep-alive"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This URL will be pinged every 5 minutes to keep your hosting active and prevent database deletion
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">How it works</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Every 5 minutes, your website will automatically call the provided URL, which should perform a simple database read operation.
                      This keeps both your hosting service and database active, preventing automatic shutdowns and data deletion.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveKeepAlive}
                disabled={keepAlive.isLoading || !keepAlive.url.trim()}
                className={`px-6 py-2 ${keepAlive.saveStatus === 'success'
                    ? 'bg-green-600 hover:bg-green-700'
                    : keepAlive.saveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : ''
                  }`}
              >
                {keepAlive.isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                )}
                {keepAlive.saveStatus === 'saving' ? 'Saving...' :
                  keepAlive.saveStatus === 'success' ? '✓ Saved' :
                    keepAlive.saveStatus === 'error' ? '✗ Error' :
                      'Save Keep Alive Settings'}
              </Button>
            </motion.div>
          )}
        </div>
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

  const renderKeepAliveSettings = () => (
    <div className="space-y-6">
      {/* Keep Alive Configuration */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Keep Alive Configuration
          </h3>
          <p className="text-gray-600 text-sm">
            Prevent hosting shutdown and database deletion by pinging your website every 5 minutes
          </p>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">How it works</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your website will automatically ping the configured URL every 5 minutes</li>
                <li>• This prevents free hosting platforms from shutting down after 15 minutes of inactivity</li>
                <li>• Database operations keep your data from being deleted after 7 days</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <label className="text-sm font-medium text-gray-900">Enable Keep Alive</label>
            <p className="text-xs text-gray-600">Automatically ping your website to keep it alive</p>
          </div>
          <div className="flex items-center space-x-3">
            {keepAlive.saveStatus === 'success' && !keepAlive.isLoading && (
              <span className="text-green-600 text-sm">✓</span>
            )}
            {keepAlive.saveStatus === 'error' && !keepAlive.isLoading && (
              <span className="text-red-600 text-sm">✗</span>
            )}
            <button
              onClick={handleToggleKeepAlive}
              disabled={keepAlive.isLoading}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${keepAlive.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${keepAlive.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* URL Configuration */}
        {keepAlive.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 border-t pt-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <Input
                type="url"
                value={keepAlive.url}
                onChange={(e) => setKeepAlive(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://your-website.com/api/keep-alive"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the full URL of your keep-alive endpoint (usually https://your-domain.com/api/keep-alive)
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={handleSaveKeepAlive}
                disabled={keepAlive.isLoading || !keepAlive.url}
                className={`px-6 py-2 ${keepAlive.saveStatus === 'success'
                    ? 'bg-green-600 hover:bg-green-700'
                    : keepAlive.saveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : ''
                  }`}
              >
                {keepAlive.saveStatus === 'saving' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                )}
                {keepAlive.saveStatus === 'success' ? '✓ Saved' :
                  keepAlive.saveStatus === 'error' ? '✗ Error' :
                    'Save Settings'}
              </Button>

              {keepAlive.enabled && keepAlive.url && (
                <button
                  onClick={handleTestKeepAlive}
                  disabled={keepAlive.testStatus === 'testing'}
                  className={`px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${keepAlive.testStatus === 'testing'
                      ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                      : keepAlive.testStatus === 'success'
                        ? 'bg-green-50 border-green-500 text-green-700 hover:bg-green-100'
                        : keepAlive.testStatus === 'error'
                          ? 'bg-red-50 border-red-500 text-red-700 hover:bg-red-100'
                          : 'bg-blue-50 border-blue-500 text-blue-700 hover:bg-blue-100'
                    }`}
                >
                  {keepAlive.testStatus === 'testing' && (
                    <div className="inline-flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2"></div>
                      Testing...
                    </div>
                  )}
                  {keepAlive.testStatus === 'success' && '✅ Test Passed'}
                  {keepAlive.testStatus === 'error' && '❌ Test Failed'}
                  {keepAlive.testStatus === 'idle' && 'Test Now'}
                </button>
              )}
            </div>

            {/* Test Result Display */}
            {keepAlive.testMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-4 p-4 rounded-lg border ${keepAlive.testStatus === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                  }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {keepAlive.testStatus === 'success' ? (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">
                      {keepAlive.testStatus === 'success' ? 'Test Successful' : 'Test Failed'}
                    </p>
                    <p className="text-sm">{keepAlive.testMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
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
      case 'keepalive':
        return <motion.div key="keepalive" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>{renderKeepAliveSettings()}</motion.div>;
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
          .select('currency, balance_protection_enabled, balance_protection_type, keep_alive_enabled, keep_alive_url')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setCurrency(data.currency || 'USD');
          setBalanceProtection(prev => ({
            ...prev,
            enabled: data.balance_protection_enabled || false,
            type: data.balance_protection_type || 'pin',
          }));
          setKeepAlive(prev => ({
            ...prev,
            enabled: data.keep_alive_enabled || false,
            url: data.keep_alive_url || '',
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

  const handleToggleKeepAlive = async () => {
    if (!user) return;

    const newEnabledState = !keepAlive.enabled;

    setKeepAlive(prev => ({
      ...prev,
      enabled: newEnabledState,
      isLoading: true,
    }));

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          keep_alive_enabled: newEnabledState,
          keep_alive_url: newEnabledState ? keepAlive.url : null
        });

      if (error) {
        throw error;
      }

      setKeepAlive(prev => ({
        ...prev,
        saveStatus: 'success'
      }));

      setTimeout(() => setKeepAlive(prev => ({ ...prev, saveStatus: 'idle' })), 2000);

    } catch (error) {
      console.error('Failed to toggle keep alive:', error);
      // Revert the local state on error
      setKeepAlive(prev => ({
        ...prev,
        enabled: !newEnabledState, // Revert to previous state
        saveStatus: 'error'
      }));
      setTimeout(() => setKeepAlive(prev => ({ ...prev, saveStatus: 'idle' })), 3000);
    } finally {
      setKeepAlive(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSaveKeepAlive = async () => {
    if (!user || !keepAlive.url.trim()) return;

    setKeepAlive(prev => ({ ...prev, isLoading: true, saveStatus: 'saving' }));

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          keep_alive_url: keepAlive.url.trim(),
          keep_alive_enabled: keepAlive.enabled
        });

      if (error) {
        throw error;
      }

      setKeepAlive(prev => ({
        ...prev,
        saveStatus: 'success'
      }));

      setTimeout(() => setKeepAlive(prev => ({ ...prev, saveStatus: 'idle' })), 3000);
    } catch (error) {
      console.error('Error saving keep alive settings:', error);
      setKeepAlive(prev => ({ ...prev, saveStatus: 'error' }));
      setTimeout(() => setKeepAlive(prev => ({ ...prev, saveStatus: 'idle' })), 3000);
    } finally {
      setKeepAlive(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleTestKeepAlive = async () => {
    if (!keepAlive.url.trim()) {
      setKeepAlive(prev => ({
        ...prev,
        testStatus: 'error',
        testMessage: 'Please enter a URL first'
      }));
      setTimeout(() => setKeepAlive(prev => ({ ...prev, testStatus: 'idle' })), 3000);
      return;
    }

    // Validate URL format
    try {
      new URL(keepAlive.url);
    } catch {
      setKeepAlive(prev => ({
        ...prev,
        testStatus: 'error',
        testMessage: 'Please enter a valid URL (e.g., https://example.com/api/keep-alive)'
      }));
      setTimeout(() => setKeepAlive(prev => ({ ...prev, testStatus: 'idle' })), 5000);
      return;
    }

    setKeepAlive(prev => ({ ...prev, testStatus: 'testing', testMessage: '' }));

    try {
      console.log('Testing keep alive URL:', keepAlive.url);
      const response = await fetch(keepAlive.url, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');

        // Check if response is JSON
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            setKeepAlive(prev => ({
              ...prev,
              testStatus: 'success',
              testMessage: `✅ Success! Status: ${data.status || 'OK'} - ${data.message || 'Keep alive endpoint is working properly'}`
            }));
          } catch (jsonError) {
            setKeepAlive(prev => ({
              ...prev,
              testStatus: 'error',
              testMessage: '❌ Response received but not valid JSON. Make sure your endpoint returns JSON data.'
            }));
          }
        } else {
          // Response is not JSON (probably HTML)
          setKeepAlive(prev => ({
            ...prev,
            testStatus: 'error',
            testMessage: '❌ Endpoint returned HTML instead of JSON. Make sure you\'re using the correct API endpoint URL.'
          }));
        }
      } else {
        setKeepAlive(prev => ({
          ...prev,
          testStatus: 'error',
          testMessage: `❌ HTTP ${response.status}: ${response.statusText}. Please check your URL and try again.`
        }));
      }
    } catch (error) {
      console.error('Test failed:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setKeepAlive(prev => ({
          ...prev,
          testStatus: 'error',
          testMessage: '❌ Network error: Unable to reach the URL. Check if the URL is correct and accessible.'
        }));
      } else {
        setKeepAlive(prev => ({
          ...prev,
          testStatus: 'error',
          testMessage: `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }));
      }
    }

    // Clear test status after 8 seconds
    setTimeout(() => setKeepAlive(prev => ({ ...prev, testStatus: 'idle', testMessage: '' })), 8000);
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
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-72 flex-shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-6 sticky top-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 md:mb-6 hidden md:block">Settings</h2>

          {/* Mobile: Horizontal Scrollable List | Desktop: Vertical Stack */}
          <nav className="flex md:flex-col overflow-x-auto md:overflow-visible gap-2 md:gap-1 pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as 'general' | 'security' | 'ai' | 'account')}
                className={`flex-shrink-0 md:w-full flex items-center md:items-start space-x-2 md:space-x-4 px-4 py-2 md:p-4 rounded-full md:rounded-lg text-left transition-all duration-200 whitespace-nowrap md:whitespace-normal border ${activeSection === section.id
                    ? 'bg-blue-600 md:bg-blue-50 text-white md:text-blue-900 border-blue-600 md:border-blue-200 shadow-md md:shadow-none'
                    : 'bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border-gray-200 md:border-transparent'
                  }`}
              >
                <div className={`text-lg md:text-xl md:mt-0.5 ${activeSection === section.id ? 'text-white md:text-blue-600' : ''}`}>
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className={`font-medium text-sm ${activeSection === section.id ? 'text-white md:text-blue-900' : ''}`}>
                    {section.title}
                  </span>
                  <span className={`text-xs mt-1 leading-relaxed hidden md:block ${activeSection === section.id ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                    {section.description}
                  </span>
                </div>
                {activeSection === section.id && (
                  <div className="hidden md:block flex-shrink-0 mt-1">
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
