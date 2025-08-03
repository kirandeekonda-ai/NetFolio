import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BankAccount } from '@/types';
import { BankLogo } from './BankLogo';

interface BankAccountDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  account: BankAccount | null;
  isLoading?: boolean;
}

interface AccountDataInfo {
  statements: number;
  transactions: number;
  hasBalanceData: boolean;
}

export const BankAccountDeleteDialog: React.FC<BankAccountDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  account,
  isLoading = false
}) => {
  const [accountData, setAccountData] = useState<AccountDataInfo>({
    statements: 0,
    transactions: 0,
    hasBalanceData: false
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isConfirmValid, setIsConfirmValid] = useState(false);

  const expectedConfirmText = account?.bank_name || '';

  useEffect(() => {
    if (isOpen && account) {
      fetchAccountData();
      setConfirmText('');
      setIsConfirmValid(false);
    }
  }, [isOpen, account]);

  useEffect(() => {
    setIsConfirmValid(confirmText.toLowerCase() === expectedConfirmText.toLowerCase());
  }, [confirmText, expectedConfirmText]);

  const fetchAccountData = async () => {
    if (!account) return;
    
    setDataLoading(true);
    try {
      // Fetch statements and transactions counts from the API
      const [statementsRes, transactionsRes] = await Promise.all([
        fetch(`/api/bank-statements?account_id=${account.id}`),
        fetch(`/api/transactions/by-account/${account.id}`)
      ]);

      const statements = statementsRes.ok ? await statementsRes.json() : { statements: [] };
      
      // Handle both possible response formats for transactions
      let transactionCount = 0;
      if (transactionsRes.ok) {
        const transactionData = await transactionsRes.json();
        transactionCount = transactionData.transactions?.length || transactionData.count || 0;
      }

      setAccountData({
        statements: statements.statements?.length || 0,
        transactions: transactionCount,
        hasBalanceData: account.current_balance !== null && account.current_balance !== undefined
      });
    } catch (error) {
      console.error('Error fetching account data:', error);
      // Set reasonable defaults even if API calls fail
      setAccountData({
        statements: 0,
        transactions: 0,
        hasBalanceData: account.current_balance !== null && account.current_balance !== undefined
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!isConfirmValid) return;
    onConfirm();
  };

  if (!account) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black bg-opacity-50"
            />
            
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-8 py-6 border-b border-red-200">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-900">
                      Delete Bank Account
                    </h3>
                    <p className="text-red-700 text-sm mt-1">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <BankLogo
                    bankName={account.bank_name}
                    accountType={account.account_type}
                    size="lg"
                    className="shadow-md"
                  />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {account.account_nickname || account.bank_name}
                    </h4>
                    <p className="text-gray-600 text-sm">
                      {account.bank_name} • {account.account_type}
                    </p>
                    {account.account_number_last4 && (
                      <p className="text-gray-500 text-sm">
                        Account ending in ****{account.account_number_last4}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning Content */}
              <div className="px-8 py-6 space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      ⚠️
                    </div>
                    <div>
                      <h5 className="font-semibold text-red-900 mb-2">
                         Data That Will Be Permanently Lost:
                      </h5>
                      
                      {dataLoading ? (
                        <div className="space-y-2">
                          <div className="animate-pulse h-4 bg-red-200 rounded w-3/4"></div>
                          <div className="animate-pulse h-4 bg-red-200 rounded w-1/2"></div>
                          <div className="animate-pulse h-4 bg-red-200 rounded w-2/3"></div>
                        </div>
                      ) : (
                        <ul className="space-y-2 text-sm text-red-800">
                          <li className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            <span>Account details and settings</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            <span>
                              {accountData.statements > 0 
                                ? `${accountData.statements} bank statements` 
                                : 'Any existing bank statements'}
                            </span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            <span>
                              {accountData.transactions > 0 
                                ? `${accountData.transactions} transaction records` 
                                : 'Any existing transaction records'}
                            </span>
                          </li>
                          {accountData.hasBalanceData && (
                            <li className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                              <span>Current balance and historical balance data</span>
                            </li>
                          )}
                          <li className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            <span>All associated financial insights and reports</span>
                          </li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alternative Options */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      💡 
                    </div>
                    <div>
                      <h5 className="font-semibold text-blue-900 mb-2">
                        Consider These Alternatives:
                      </h5>
                      <ul className="space-y-1 text-sm text-blue-800">
                        <li>• <strong>Deactivate</strong> the account instead (keeps all data safe)</li>
                        <li>• <strong>Edit</strong> account details if information is incorrect</li>
                        <li>• <strong>Export</strong> your data before deleting (coming soon)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Confirmation Input */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      To confirm deletion, type the bank name exactly as shown:
                    </label>
                    <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono text-gray-800 mb-3">
                      {account.bank_name}
                    </div>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type bank name here..."
                      className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                        confirmText && !isConfirmValid
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                          : confirmText && isConfirmValid
                          ? 'border-green-300 focus:ring-green-500 focus:border-green-500 bg-green-50'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      disabled={isLoading}
                    />
                    {confirmText && !isConfirmValid && (
                      <p className="text-red-600 text-xs mt-1">
                        Bank name doesn't match. Please type exactly: {account.bank_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-8 py-6 bg-gray-50 rounded-b-2xl flex space-x-4 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!isConfirmValid || isLoading}
                  className={`px-6 py-3 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    isConfirmValid && !isLoading
                      ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    'Delete Account Permanently'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
