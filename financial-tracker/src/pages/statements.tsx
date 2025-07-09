import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from '@supabase/auth-helpers-react';
import { useDispatch } from 'react-redux';
import { BankAccount, BankStatement, StatementUpload, Transaction } from '@/types';
import { Layout } from '@/components/layout/Layout';
import { StatementDashboard } from '@/components/StatementDashboard';
import { StatementUploadForm } from '@/components/StatementUploadFormNew';
import { Auth } from '@/components/Auth';
import { setTransactions } from '@/store/transactionsSlice';
import { motion } from 'framer-motion';

const StatementsPage: NextPage = () => {
  const session = useSession();
  const router = useRouter();
  const dispatch = useDispatch();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [extractedTransactions, setExtractedTransactions] = useState<Transaction[]>([]);
  const [reuploadStatementId, setReuploadStatementId] = useState<string>('');

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

  const handleUploadStatement = (accountId: string, month?: number, year?: number) => {
    setSelectedAccountId(accountId);
    setSelectedMonth(month || new Date().getMonth() + 1);
    setSelectedYear(year || new Date().getFullYear());
    setReuploadStatementId(''); // Clear any existing reupload ID
    setShowUploadForm(true);
  };

  const handleReuploadStatement = (accountId: string, month: number, year: number, existingStatementId: string) => {
    setSelectedAccountId(accountId);
    setSelectedMonth(month);
    setSelectedYear(year);
    setReuploadStatementId(existingStatementId);
    setShowUploadForm(true);
  };

  const handleRemoveStatement = async (statementId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/bank-statements?id=${statementId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the statements dashboard
        fetchAccounts();
        alert('Statement removed successfully');
      } else {
        const error = await response.json();
        alert('Failed to remove statement: ' + error.error);
      }
    } catch (error) {
      console.error('Error removing statement:', error);
      alert('Error removing statement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewStatement = (statement: BankStatement) => {
    // For now, just show statement details in an alert
    // In a real app, this would open a detailed view
    alert(`Statement Details:
Bank Account: ${statement.bank_account_id}
Period: ${statement.statement_month}/${statement.statement_year}
Status: ${statement.processing_status}
Transactions: ${statement.transaction_count}
File: ${statement.file_name || 'N/A'}`);
  };

  const handleStatementUpload = async (uploadData: StatementUpload) => {
    try {
      setIsLoading(true);

      // Use transactions from uploadData directly (from template/AI processing)
      const transactionsToUse = uploadData.extractedTransactions || extractedTransactions;

      // If we're reuploading, first delete the existing statement
      if (reuploadStatementId) {
        const deleteResponse = await fetch(`/api/bank-statements?id=${reuploadStatementId}`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          const error = await deleteResponse.json();
          throw new Error('Failed to remove existing statement: ' + error.error);
        }
      }

      // Create the new statement record
      const statementData = {
        bank_account_id: uploadData.bank_account_id,
        statement_month: uploadData.statement_month,
        statement_year: uploadData.statement_year,
        statement_start_date: uploadData.statement_start_date,
        statement_end_date: uploadData.statement_end_date,
        file_name: uploadData.file.name,
        file_size_mb: Math.round((uploadData.file.size / (1024 * 1024)) * 100) / 100,
      };

      const response = await fetch('/api/bank-statements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statementData),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store transactions in Redux store for categorize page (even if empty)
        dispatch(setTransactions(transactionsToUse));
        
        // TODO: Save extracted transactions to database
        // For now, we'll simulate this
        
        // Update statement status to completed
        await fetch(`/api/bank-statements?id=${data.statement.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            processing_status: 'completed',
            processed_at: new Date().toISOString(),
            transaction_count: transactionsToUse.length,
          }),
        });

        // Always redirect to categorize page after successful upload
        setShowUploadForm(false);
        
        if (transactionsToUse.length > 0) {
          // Redirect to categorize page with the extracted transactions
          router.push('/categorize');
        } else {
          // No transactions extracted, still redirect to categorize page with a message
          router.push('/categorize?message=no_transactions');
        }
      } else {
        const error = await response.json();
        console.error('Failed to upload statement:', error);
        alert('Failed to upload statement: ' + error.error);
      }
    } catch (error) {
      console.error('Error uploading statement:', error);
      alert('Error uploading statement: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransactionsExtracted = (transactions: Transaction[]) => {
    setExtractedTransactions(transactions);
    console.log(`Extracted ${transactions.length} transactions, ready for upload:`, transactions);
  };

  const handleCancel = () => {
    setShowUploadForm(false);
    setSelectedAccountId('');
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setExtractedTransactions([]);
    setReuploadStatementId('');
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
          {showUploadForm ? (
            <StatementUploadForm
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onSubmit={handleStatementUpload}
              onCancel={handleCancel}
              onTransactionsExtracted={handleTransactionsExtracted}
              isLoading={isLoading}
              isReupload={!!reuploadStatementId}
            />
          ) : (
            <StatementDashboard
              accounts={accounts}
              onUploadStatement={handleUploadStatement}
              onViewStatement={handleViewStatement}
              onRemoveStatement={handleRemoveStatement}
              onReuploadStatement={handleReuploadStatement}
              isLoading={isLoading}
            />
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default StatementsPage;
