import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Input } from './ui/input';

interface PasswordProtectedPDFDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  fileName?: string;
  isRetrying?: boolean;
}

export const PasswordProtectedPDFDialog: React.FC<PasswordProtectedPDFDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  fileName,
  isRetrying = false
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onSubmit(password);
      setPassword(''); // Clear for security
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 bg-white/20 p-2 rounded-lg">
                  <span className="text-2xl">🔒</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Password Protected PDF</h3>
                  <p className="text-blue-100 text-sm mt-1">
                    {fileName ? `File: ${fileName}` : 'This file is encrypted'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 mt-0.5">ℹ️</span>
                    <p className="text-sm text-blue-800">
                      Your bank statement is password protected. Please enter the password to allow our AI to process it securely.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 block">
                    Document Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter file password"
                      className="pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Passwords are sent securely and never stored.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 flex justify-end space-x-3">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  className="text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!password || isRetrying}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                >
                  {isRetrying ? (
                    <span className="flex items-center space-x-2">
                      <span className="animate-spin">⌛</span>
                      <span>Unlocking...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-2">
                      <span>🔓</span>
                      <span>Unlock & Process</span>
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

