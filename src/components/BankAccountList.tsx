import { FC, useState } from 'react';
import { motion } from 'framer-motion';
import { BankAccount } from '@/types';
import { Card } from './Card';
import { Button } from './Button';

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

  const handleDelete = async (accountId: string) => {
    setDeletingId(accountId);
    try {
      await onDelete(accountId);
    } finally {
      setDeletingId(null);
    }
  };

  const activeAccounts = accounts.filter(acc => acc.is_active);
  const inactiveAccounts = accounts.filter(acc => !acc.is_active);

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏦</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bank Accounts</h3>
        <p className="text-gray-600 mb-6">
          Add your first bank account to start tracking your finances
        </p>
        <Button onClick={onAdd} disabled={isLoading}>
          Add Bank Account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bank Accounts</h2>
          <p className="text-gray-600">
            Manage your bank accounts and view their balances
          </p>
        </div>
        <Button onClick={onAdd} disabled={isLoading}>
          Add Account
        </Button>
      </div>

      {/* Active Accounts */}
      {activeAccounts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Accounts</h3>
          <div className="grid gap-4">
            {activeAccounts.map((account) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white"
              >
                <Card>
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xl">{getAccountTypeIcon(account.account_type)}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {account.account_nickname || `${account.bank_name} ${account.account_type}`}
                          </h4>
                          {account.account_number_last4 && (
                            <span className="text-sm text-gray-500">
                              ****{account.account_number_last4}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">
                            {account.bank_name} • {account.account_type}
                          </span>
                          <span className="text-sm text-gray-500">
                            Added {new Date(account.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(account.current_balance || account.starting_balance, account.currency)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Current Balance
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="secondary"
                          onClick={() => onEdit(account)}
                          disabled={isLoading}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => onDeactivate(account.id)}
                          disabled={isLoading}
                        >
                          Deactivate
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleDelete(account.id)}
                          disabled={isLoading || deletingId === account.id}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          {deletingId === account.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Accounts */}
      {inactiveAccounts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inactive Accounts</h3>
          <div className="grid gap-4">
            {inactiveAccounts.map((account) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white opacity-60"
              >
                <Card>
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xl opacity-50">{getAccountTypeIcon(account.account_type)}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-semibold text-gray-600">
                            {account.account_nickname || `${account.bank_name} ${account.account_type}`}
                          </h4>
                          {account.account_number_last4 && (
                            <span className="text-sm text-gray-400">
                              ****{account.account_number_last4}
                            </span>
                          )}
                          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                            Inactive
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-500">
                            {account.bank_name} • {account.account_type}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-600">
                          {formatCurrency(account.current_balance || account.starting_balance, account.currency)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Last Balance
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="secondary"
                          onClick={() => onDeactivate(account.id)}
                          disabled={isLoading}
                        >
                          Reactivate
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleDelete(account.id)}
                          disabled={isLoading || deletingId === account.id}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          {deletingId === account.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">
              {activeAccounts.length}
            </div>
            <div className="text-sm text-blue-700">Active Accounts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(
                activeAccounts.reduce((sum, acc) => sum + (acc.current_balance || acc.starting_balance), 0),
                activeAccounts[0]?.currency || 'USD'
              )}
            </div>
            <div className="text-sm text-blue-700">Total Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">
              {new Set(activeAccounts.map(acc => acc.bank_name)).size}
            </div>
            <div className="text-sm text-blue-700">Banks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">
              {new Set(activeAccounts.map(acc => acc.currency)).size}
            </div>
            <div className="text-sm text-blue-700">Currencies</div>
          </div>
        </div>
      </div>
    </div>
  );
};
