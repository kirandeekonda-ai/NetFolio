import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BankAccount } from '@/types';
import { BankLogo } from './BankLogo';

interface BankAccountDeactivateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  account: BankAccount | null;
  isLoading?: boolean;
}

export const BankAccountDeactivateDialog: React.FC<BankAccountDeactivateDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  account,
  isLoading = false
}) => {
  if (!account) return null;

  const isDeactivating = account.is_active;
  const action = isDeactivating ? 'deactivate' : 'reactivate';
  const actionTitle = isDeactivating ? 'Deactivate' : 'Reactivate';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-md mx-4">
              {/* Header */}
              <div className="p-8 pb-6">
                <div className="flex items-center space-x-4 mb-6">
                  <BankLogo
                    bankName={account.bank_name}
                    accountType={account.account_type}
                    size="lg"
                  />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {account.account_nickname || account.bank_name}
                    </h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{account.bank_name}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span className="capitalize">{account.account_type}</span>
                      {account.account_number_last4 && (
                        <>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span>••••{account.account_number_last4}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    isDeactivating 
                      ? 'bg-amber-100 text-amber-600' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {isDeactivating ? (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {actionTitle} Account?
                  </h3>
                  
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {isDeactivating ? (
                      <>
                        This account will be hidden from your active accounts list. 
                        You can reactivate it anytime from the inactive accounts section.
                        <br /><br />
                        <strong>Note:</strong> Existing statements and transactions will remain safe.
                      </>
                    ) : (
                      <>
                        This account will be restored to your active accounts list and 
                        will appear in dropdowns and dashboards again.
                      </>
                    )}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`flex-1 px-4 py-3 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 ${
                      isDeactivating
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>{actionTitle} Account</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
