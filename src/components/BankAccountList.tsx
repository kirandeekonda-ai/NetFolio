import { FC, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BankAccount } from '@/types';
import { Card } from './Card';
import { Button } from './Button';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accountBalances, setAccountBalances] = useState<Record<string, { balance: number; hasBalance: boolean }>>({});
  const [balancesLoading, setBalancesLoading] = useState(true);

  // Load account balances from SimplifiedBalanceService
  useEffect(() => {
    const loadBalances = async () => {
      try {
        setBalancesLoading(true);
        console.log('🔄 Loading account balances...');
        
        const balances = await SimplifiedBalanceService.getAccountBalances();
        console.log('✅ Loaded balances:', balances);
        
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
    };

    if (accounts.length > 0) {
      loadBalances();
    } else {
      setBalancesLoading(false);
    }
  }, [accounts]);

  const handleDelete = async (accountId: string) => {
    setDeletingId(accountId);
    try {
      await onDelete(accountId);
    } finally {
      setDeletingId(null);
    }
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

  // Show loading state while accounts or balances are loading
  if (isLoading || balancesLoading) {
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
              {balancesLoading ? 'Fetching latest statement balances...' : 'Loading your accounts...'}
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
                >
                  <Button 
                    onClick={onAdd} 
                    disabled={isLoading}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm px-6 py-3 font-medium"
                  >
                    Add Account
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
              </div>
              <div className="text-3xl font-light text-emerald-600 mb-1">
                {formatCurrency(
                  activeAccounts
                    .filter(acc => acc.statement_balance_available)
                    .reduce((sum, acc) => sum + (acc.current_balance || 0), 0),
                  activeAccounts[0]?.currency || 'USD'
                )}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Total Statement Balance</div>
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
                          {/* Premium Account Icon */}
                          <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                              <span className="text-2xl text-white">{getAccountTypeIcon(account.account_type)}</span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center">
                              <span className="text-xs text-white">✓</span>
                            </div>
                          </div>
                          
                          {/* Account Details */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">
                                {account.account_nickname || `${account.bank_name} ${account.account_type}`}
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
                            <div className="text-3xl font-light text-gray-900 mb-1">
                              {account.statement_balance_available 
                                ? formatCurrency(account.current_balance || 0, account.currency)
                                : 'Upload Statement'
                              }
                            </div>
                            <div className="text-sm text-gray-500 uppercase tracking-wider">
                              {account.statement_balance_available ? 'Statement Balance' : 'No Balance Data'}
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
                          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl opacity-50">{getAccountTypeIcon(account.account_type)}</span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-600">
                                {account.account_nickname || `${account.bank_name} ${account.account_type}`}
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
                              {account.statement_balance_available 
                                ? formatCurrency(account.current_balance || 0, account.currency)
                                : 'Upload Statement'
                              }
                            </div>
                            <div className="text-sm text-gray-400 uppercase tracking-wider">
                              {account.statement_balance_available ? 'Last Statement' : 'No Balance Data'}
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
    </div>
  );
};
