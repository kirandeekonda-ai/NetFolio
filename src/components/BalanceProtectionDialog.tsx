import { FC, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Input } from './Input';
import { Portal } from './Portal';

interface BalanceProtectionDialogProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  protectionType: 'pin' | 'password';
  title?: string;
  description?: string;
}

export const BalanceProtectionDialog: FC<BalanceProtectionDialogProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  protectionType,
  title,
  description
}) => {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue('');
      setError('');
      setAttempts(0);
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!value.trim()) {
      setError(`Please enter your ${protectionType}`);
      return;
    }

    if (protectionType === 'pin' && (!/^\d{4,6}$/.test(value))) {
      setError('PIN must be 4-6 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/verify-balance-protection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value,
          type: protectionType,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse);
        throw new Error(`Server returned non-JSON response. Please check your network connection and try again.`);
      }

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || `Server error: ${response.status}`;
        if (errorMessage.includes('Balance protection not configured')) {
          throw new Error('Balance protection is not set up. Please go to Settings > Security to configure balance protection first.');
        }
        throw new Error(errorMessage);
      }

      if (result.valid) {
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setError('Too many incorrect attempts. Please try again later.');
          setTimeout(onCancel, 2000);
        } else {
          setError(`Incorrect ${protectionType}. ${3 - newAttempts} attempts remaining.`);
        }
        setValue('');
      }
    } catch (error) {
      console.error('Balance protection verification error:', error);
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onCancel();
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={!isLoading ? onCancel : undefined}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
            >
              {/* Security Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl text-white">🔒</span>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {title || `Enter Your ${protectionType === 'pin' ? 'PIN' : 'Password'}`}
                </h2>
                <p className="text-gray-600 text-sm">
                  {description || `To view your balance, please enter your ${protectionType}`}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={protectionType === 'pin' ? 'Enter 4-6 digit PIN' : 'Enter password'}
                    className="text-center text-xl tracking-widest pr-12"
                    maxLength={protectionType === 'pin' ? 6 : undefined}
                    disabled={isLoading || attempts >= 3}
                    autoFocus
                    inputMode={protectionType === 'pin' ? 'numeric' : 'text'}
                  />
                  {/* Eye Icon Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    disabled={isLoading || attempts >= 3}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878a3 3 0 00-.007 4.243m4.249-4.25l1.414-1.414M14.121 14.121a3 3 0 01-4.243 0m4.243 0L15.535 15.535m-1.414-1.414L9.878 9.878" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm text-center bg-red-50 rounded-lg p-3"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || attempts >= 3 || !value.trim()}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Verifying...
                      </div>
                    ) : (
                      'Unlock'
                    )}
                  </Button>
                </div>
              </form>

              {/* Security Info */}
              <div className="text-center mt-6 text-xs text-gray-500">
                <p>🔐 Your balance is protected for privacy</p>
                {attempts > 0 && attempts < 3 && (
                  <p className="text-orange-600 mt-1">
                    {3 - attempts} attempts remaining
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
