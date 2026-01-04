import { FC, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { BankAccount } from '@/types';
import { Card } from './Card';
import { Button } from './Button';
import { BankLogo } from './BankLogo';
import { BankAccountDeleteDialog } from './BankAccountDeleteDialog';
import { BalanceProtectionDialog } from './BalanceProtectionDialog';
import { ManualBalanceModal } from './ManualBalanceModal';
import { BalanceHistoryModal } from './BalanceHistoryModal'; // Import history modal
import { useBalanceProtection } from '@/hooks/useBalanceProtection';
import SimplifiedBalanceService from '@/services/SimplifiedBalanceService';

interface BankAccountListProps {
  accounts: BankAccount[];
  onEdit: (account: BankAccount) => void;
  onDelete: (accountId: string) => void;
  onDeactivate: (accountId: string) => void;
  onAdd: () => void;
  isLoading?: boolean;
}

const getAccountTypeIcon = (type: string): string => {
  switch (type) {
    case 'checking':
      return '💳';
    case 'savings':
      return '💰';
    case 'credit':
      return '💳';
    case 'investment':
      return '📈';
    default:
      return '🏦';
  }
};

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const BankAccountList: FC<BankAccountListProps> = ({
  accounts,
  onEdit,
  onDelete,
  onDeactivate,
  onAdd,
  isLoading = false,
}) => {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const [accountBalances, setAccountBalances] = useState<Record<string, { balance: number; hasBalance: boolean }>>({});
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [showProtectionDialog, setShowProtectionDialog] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<'total' | string>('total'); // 'total' or account ID
  const [individuallyUnlockedAccounts, setIndividuallyUnlockedAccounts] = useState<Set<string>>(new Set());

  // State for manual balance modal
  const [selectedAccountForBalance, setSelectedAccountForBalance] = useState<BankAccount | null>(null);
  const [isManualBalanceModalOpen, setIsManualBalanceModalOpen] = useState(false);
  const [editingBalanceData, setEditingBalanceData] = useState<{ id: string; amount: number; date: string; notes?: string } | null>(null);

  // State for history modal
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<BankAccount | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Balance protection hook
  const {
    isProtected,
    isUnlocked,
    protectionType,
    unlock: unlockBalance,
    lock: lockBalance,
  } = useBalanceProtection();

  // Reset individual unlocks when global protection state changes
  useEffect(() => {
    if (isUnlocked) {
      // When globally unlocked, clear all individual unlocks
      setIndividuallyUnlockedAccounts(new Set());
    }
  }, [isUnlocked]);

  // Helper functions for balance visibility
  const isTotalBalanceVisible = () => {
    return !isProtected || isUnlocked;
  };

  const isAccountBalanceVisible = (accountId: string) => {
    return !isProtected || isUnlocked || individuallyUnlockedAccounts.has(accountId);
  };

  const handleTotalBalanceUnlock = () => {
    if (isUnlocked) {
      // Lock everything
      lockBalance();
      setIndividuallyUnlockedAccounts(new Set()); // Clear all individual unlocks
    } else {
      // Unlock everything
      setUnlockTarget('total');
      setShowProtectionDialog(true);
    }
  };

  const handleAccountBalanceUnlock = (accountId: string) => {
    if (isUnlocked) {
      // If globally unlocked, can't lock individual accounts
      return;
    }

    if (individuallyUnlockedAccounts.has(accountId)) {
      // Lock this individual account
      setIndividuallyUnlockedAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    } else {
      // Unlock this individual account
      setUnlockTarget(accountId);
      setShowProtectionDialog(true);
    }
  };

  const handleUnlockSuccess = () => {
    if (unlockTarget === 'total') {
      unlockBalance(); // Unlock all balances globally
      setIndividuallyUnlockedAccounts(new Set()); // Clear individual unlocks since everything is now unlocked globally
    } else {
      // Unlock individual account
      setIndividuallyUnlockedAccounts(prev => new Set([...prev, unlockTarget]));
    }
    setShowProtectionDialog(false);
  };

  // Define loadBalances as a reusable function
  const loadBalances = useCallback(async () => {
    try {
      setBalancesLoading(true);

      const balances = await SimplifiedBalanceService.getAccountBalances();

      // Convert balance array to lookup object
      const balanceMap: Record<string, { balance: number; hasBalance: boolean }> = {};
      balances.forEach(balance => {
        balanceMap[balance.account_id] = {
          balance: balance.current_balance || 0,
          hasBalance: balance.current_balance !== null
        };
      });

      setAccountBalances(balanceMap);
    } catch (error) {
      console.error('❌ Error loading balances:', error);
      setAccountBalances({});
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  // Use the reusable function in useEffect
  useEffect(() => {
    if (accounts.length > 0) {
      loadBalances();
    } else {
      setBalancesLoading(false);
    }
  }, [accounts, loadBalances]);

  const handleUpdateBalance = (account: BankAccount) => {
    setSelectedAccountForBalance(account);
    setIsManualBalanceModalOpen(true);
  };

  const handleManualBalanceSuccess = () => {
    loadBalances(); // Refresh balances
  };

  const handleDelete = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    setAccountToDelete(account);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;

    setDeletingId(accountToDelete.id);
    setShowDeleteDialog(false);

    try {
      await onDelete(accountToDelete.id);
    } finally {
      setDeletingId(null);
      setAccountToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setAccountToDelete(null);
  };

  const handleUploadStatement = () => {
    router.push('/statements');
  };

  // Enhance accounts with balance data
  const enhanceAccountsWithBalances = (accountList: BankAccount[]) => {
    return accountList.map(account => ({
      ...account,
      current_balance: accountBalances[account.id]?.balance || 0,
      statement_balance_available: accountBalances[account.id]?.hasBalance || false
    }));
  };

  const activeAccounts = enhanceAccountsWithBalances(accounts.filter(acc => acc.is_active));
  const inactiveAccounts = enhanceAccountsWithBalances(accounts.filter(acc => !acc.is_active));

  // Show loading state ONLY while accounts are loading
  // Let balances load in the background for better perceived performance
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/30">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">⏳</span>
            </div>
            <h1 className="text-3xl font-light text-gray-900 mb-4">
              Loading Account Information...
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              Loading your accounts...
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/30">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">🏦</span>
            </div>
            <h3 className="text-3xl font-light text-gray-900 mb-4">No Bank Accounts Yet</h3>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Connect your first bank account to start tracking your finances with style
            </p>
            <Button
              onClick={onAdd}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 text-lg font-medium"
            >
              Add Your First Account
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          {/* Premium Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
            <div className="relative px-8 py-12">
              <div className="flex items-center justify-between">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h1 className="text-4xl font-light text-white mb-2">Bank Accounts</h1>
                  <p className="text-xl text-blue-100 font-light">
                    Manage your bank accounts and view their balances
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex space-x-3"
                >
                  <Button
                    onClick={handleUploadStatement}
                    disabled={isLoading}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm px-6 py-3 font-medium flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload Statement</span>
                  </Button>
                  <Button
                    onClick={onAdd}
                    disabled={isLoading}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm px-6 py-3 font-medium flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Account</span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Summary Stats - Premium Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
              <div className="text-3xl font-light text-blue-600 mb-1">
                {activeAccounts.length}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Active Accounts</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                {isProtected && (
                  <button
                    onClick={handleTotalBalanceUnlock}
                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                    title={isUnlocked ? 'Lock all balances' : 'Unlock all balances'}
                  >
                    <span className="text-sm">{isUnlocked ? '🔓' : '🔒'}</span>
                  </button>
                )}
              </div>
              <div className="text-3xl font-light text-emerald-600 mb-1">
                {isTotalBalanceVisible() ? (
                  formatCurrency(
                    activeAccounts
                      .filter(acc => acc.statement_balance_available)
                      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0),
                    activeAccounts[0]?.currency || 'USD'
                  )
                ) : (
                  <button
                    onClick={handleTotalBalanceUnlock}
                    className="text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer border-none bg-transparent p-0"
                  >
                    <span className="text-2xl">••••••••</span>
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wider flex items-center justify-center space-x-1">
                <span>Total Statement Balance</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🏦</span>
                </div>
              </div>
              <div className="text-3xl font-light text-purple-600 mb-1">
                {new Set(activeAccounts.map(acc => acc.bank_name)).size}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Banks</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🌍</span>
                </div>
              </div>
              <div className="text-3xl font-light text-amber-600 mb-1">
                {new Set(activeAccounts.map(acc => acc.currency)).size}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Currencies</div>
            </div>
          </motion.div>

          {/* Active Accounts - Premium Design */}
          {activeAccounts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-light text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></span>
                Active Accounts
              </h2>

              <div className="grid gap-6">
                {activeAccounts.map((account, index) => (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + (index * 0.1) }}
                    className="group relative"
                  >
                    {/* Account Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          {/* Bank Logo */}
                          <div className="relative">
                            <BankLogo
                              bankName={account.bank_name}
                              accountType={account.account_type}
                              size="lg"
                              className="shadow-lg"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center">
                              <span className="text-xs text-white">✓</span>
                            </div>
                          </div>

                          {/* Account Details */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">
                                {account.account_nickname || account.bank_name}
                              </h3>
                              {account.account_number_last4 && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                                  ****{account.account_number_last4}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-gray-600 font-medium">
                                {account.bank_name}
                              </span>
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              <span className="text-gray-600 capitalize">
                                {account.account_type}
                              </span>
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              <span className="text-gray-500 text-sm">
                                Added {new Date(account.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Balance & Actions */}
                        <div className="flex items-center space-x-8">
                          {/* Balance Display */}
                          <div className="text-right">
                            {account.statement_balance_available ? (
                              <>
                                <div className="text-3xl font-light text-gray-900 mb-1">
                                  {isAccountBalanceVisible(account.id) ? (
                                    formatCurrency(account.current_balance || 0, account.currency)
                                  ) : (
                                    <button
                                      onClick={() => handleAccountBalanceUnlock(account.id)}
                                      className="text-gray-900 hover:text-gray-700 transition-colors cursor-pointer border-none bg-transparent p-0"
                                    >
                                      <span className="text-2xl">••••••••</span>
                                    </button>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 uppercase tracking-wider flex items-center justify-end space-x-1">
                                  <span>Statement Balance</span>
                                  {!isAccountBalanceVisible(account.id) && <span>🔒</span>}
                                </div>
                              </>
                            ) : (
                              <button
                                onClick={handleUploadStatement}
                                className="group text-right transition-all duration-200 hover:transform hover:scale-105"
                              >
                                <div className="text-2xl font-light text-blue-600 mb-1 group-hover:text-blue-700 flex items-center space-x-2">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  <span>Upload Statement</span>
                                </div>
                                <div className="text-sm text-blue-500 uppercase tracking-wider group-hover:text-blue-600">
                                  Click to add balance data
                                </div>
                              </button>
                            )}

                            {/* History and Update Buttons */}
                            <div className="flex justify-end gap-3 mt-1">
                              <button
                                onClick={() => {
                                  setSelectedAccountForHistory(account);
                                  setIsHistoryModalOpen(true);
                                }}
                                className="text-xs text-gray-400 hover:text-blue-600 underline"
                              >
                                History
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleUpdateBalance(account)}
                                className="text-xs text-gray-400 hover:text-blue-600 underline"
                              >
                                Update
                              </button>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-3">
                            <Button
                              variant="secondary"
                              onClick={() => onEdit(account)}
                              disabled={isLoading}
                              className="px-4 py-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => onDeactivate(account.id)}
                              disabled={isLoading}
                              className="px-4 py-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                            >
                              Deactivate
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleDelete(account.id)}
                              disabled={isLoading || deletingId === account.id}
                              className="px-4 py-2 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              {deletingId === account.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Inactive Accounts */}
          {inactiveAccounts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-light text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                Inactive Accounts
              </h2>

              <div className="grid gap-6">
                {inactiveAccounts.map((account, index) => (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + (index * 0.1) }}
                    className="group relative opacity-60"
                  >
                    <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <BankLogo
                            bankName={account.bank_name}
                            accountType={account.account_type}
                            size="lg"
                            className="opacity-50"
                          />

                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-600">
                                {account.account_nickname || account.bank_name}
                              </h3>
                              {account.account_number_last4 && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                                  ****{account.account_number_last4}
                                </span>
                              )}
                              <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">
                                INACTIVE
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-gray-500">{account.bank_name}</span>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <span className="text-gray-500 capitalize">{account.account_type}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-8">
                          <div className="text-right">
                            <div className="text-3xl font-light text-gray-600 mb-1">
                              {account.statement_balance_available ? (
                                isAccountBalanceVisible(account.id) ? (
                                  formatCurrency(account.current_balance || 0, account.currency)
                                ) : (
                                  <button
                                    onClick={() => handleAccountBalanceUnlock(account.id)}
                                    className="text-gray-600 hover:text-gray-500 transition-colors cursor-pointer border-none bg-transparent p-0"
                                  >
                                    <span className="text-2xl">••••••••</span>
                                  </button>
                                )
                              ) : (
                                'Upload Statement'
                              )}
                            </div>
                            <div className="text-sm text-gray-400 uppercase tracking-wider flex items-center justify-end space-x-1">
                              {account.statement_balance_available ? (
                                <>
                                  <span>Last Statement</span>
                                  {!isAccountBalanceVisible(account.id) && <span>🔒</span>}
                                </>
                              ) : (
                                <span>No Balance Data</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Button
                              variant="secondary"
                              onClick={() => onDeactivate(account.id)}
                              disabled={isLoading}
                              className="px-4 py-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            >
                              Reactivate
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleDelete(account.id)}
                              disabled={isLoading || deletingId === account.id}
                              className="px-4 py-2 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              {deletingId === account.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Enhanced Delete Confirmation Dialog */}
      <BankAccountDeleteDialog
        isOpen={showDeleteDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        account={accountToDelete}
        isLoading={deletingId === accountToDelete?.id}
      />

      {/* Manual Balance Update Modal */}
      {selectedAccountForBalance && (
        <ManualBalanceModal
          isOpen={isManualBalanceModalOpen}
          onClose={() => {
            setIsManualBalanceModalOpen(false);
            setSelectedAccountForBalance(null);
            setEditingBalanceData(null); // Clear edit data
          }}
          account={selectedAccountForBalance}
          onSuccess={handleManualBalanceSuccess}
          initialData={editingBalanceData}
        />
      )}

      {/* Balance History Modal */}
      {selectedAccountForHistory && (
        <BalanceHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedAccountForHistory(null);
          }}
          account={selectedAccountForHistory}
          onHistoryChanged={loadBalances}
          onEdit={(item) => {
            if (item.source === 'manual' && item.id) {
              // Close history modal first
              setIsHistoryModalOpen(false);

              // Set up edit
              setEditingBalanceData({
                id: item.id,
                amount: item.amount,
                date: item.date,
                notes: item.notes
              });
              setSelectedAccountForBalance(selectedAccountForHistory);
              setIsManualBalanceModalOpen(true);
            }
          }}
        />
      )}

      {/* Balance Protection Dialog */}
      {isProtected && (
        <BalanceProtectionDialog
          isOpen={showProtectionDialog}
          onSuccess={handleUnlockSuccess}
          onCancel={() => setShowProtectionDialog(false)}
          protectionType={protectionType || 'pin'}
          title={unlockTarget === 'total' ? "Unlock All Account Balances" : "Unlock Individual Account Balance"}
          description={unlockTarget === 'total'
            ? "Enter your PIN or password to unlock all account balances. This will override any individual account locks."
            : "Enter your PIN or password to unlock this specific account balance only."
          }
        />
      )}
    </div>
  );
};
