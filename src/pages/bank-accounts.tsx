import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from '@supabase/auth-helpers-react';
import { BankAccount, BankAccountCreate, BankAccountUpdate } from '@/types';
import { Layout } from '@/components/layout/Layout';
import { BankAccountList } from '@/components/BankAccountList';
import { BankAccountForm } from '@/components/BankAccountForm';
import { BankAccountDeactivateDialog } from '@/components/BankAccountDeactivateDialog';
import { Auth } from '@/components/Auth';
import { motion } from 'framer-motion';

const BankAccountsPage: NextPage = () => {
  const session = useSession();
  const router = useRouter();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [accountToDeactivate, setAccountToDeactivate] = useState<BankAccount | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchAccounts();
    }
  }, [session?.user]);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/bank-accounts');
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      } else {
        console.error('Failed to fetch accounts:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (accountData: BankAccountCreate) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(prev => [data.account, ...prev]);
        setShowForm(false);
      } else {
        const error = await response.json();
        console.error('Failed to create account:', error);
        alert('Failed to create account: ' + error.error);
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Error creating account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAccount = async (accountData: BankAccountCreate) => {
    if (!editingAccount) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/bank-accounts?id=${editingAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(prev => prev.map(acc => 
          acc.id === editingAccount.id ? data.account : acc
        ));
        setShowForm(false);
        setEditingAccount(null);
      } else {
        const error = await response.json();
        console.error('Failed to update account:', error);
        alert('Failed to update account: ' + error.error);
      }
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Error updating account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/bank-accounts?id=${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      } else {
        const error = await response.json();
        console.error('Failed to delete account:', error);
        alert('Failed to delete account: ' + error.error);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateAccount = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    setAccountToDeactivate(account);
    setShowDeactivateDialog(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!accountToDeactivate) return;

    const action = accountToDeactivate.is_active ? 'deactivate' : 'reactivate';

    try {
      setIsLoading(true);
      const response = await fetch(`/api/bank-accounts?id=${accountToDeactivate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !accountToDeactivate.is_active,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(prev => prev.map(acc => 
          acc.id === accountToDeactivate.id ? data.account : acc
        ));
        setShowDeactivateDialog(false);
        setAccountToDeactivate(null);
      } else {
        const error = await response.json();
        console.error(`Failed to ${action} account:`, error);
        alert(`Failed to ${action} account: ` + error.error);
      }
    } catch (error) {
      console.error(`Error ${action} account:`, error);
      alert(`Error ${action} account`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateCancel = () => {
    setShowDeactivateDialog(false);
    setAccountToDeactivate(null);
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingAccount(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAccount(null);
  };

  if (!session?.user) {
    return <Auth />;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {showForm ? (
            <BankAccountForm
              initialData={editingAccount ? {
                bank_name: editingAccount.bank_name,
                account_type: editingAccount.account_type,
                account_number_last4: editingAccount.account_number_last4 || '',
                account_nickname: editingAccount.account_nickname || '',
                currency: editingAccount.currency,
              } : undefined}
              onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount}
              onCancel={handleCancel}
              isLoading={isLoading}
              isEdit={!!editingAccount}
            />
          ) : (
            <BankAccountList
              accounts={accounts}
              onEdit={handleEdit}
              onDelete={handleDeleteAccount}
              onDeactivate={handleDeactivateAccount}
              onAdd={handleAdd}
              isLoading={isLoading}
            />
          )}
        </motion.div>
      </div>

      {/* Deactivate Account Dialog */}
      <BankAccountDeactivateDialog
        isOpen={showDeactivateDialog}
        onClose={handleDeactivateCancel}
        onConfirm={handleDeactivateConfirm}
        account={accountToDeactivate}
        isLoading={isLoading}
      />
    </Layout>
  );
};

export default BankAccountsPage;
