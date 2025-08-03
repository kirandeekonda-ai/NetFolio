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

  useEffect(() => {
    if (isOpen) {
      setValue('');
      setError('');
      setAttempts(0);
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
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
                <div>
                  <Input
                    type={protectionType === 'pin' ? 'tel' : 'password'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={protectionType === 'pin' ? 'Enter 4-6 digit PIN' : 'Enter password'}
                    className="text-center text-xl tracking-widest"
                    maxLength={protectionType === 'pin' ? 6 : undefined}
                    disabled={isLoading || attempts >= 3}
                    autoFocus
                  />
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
