import { NextPage } from 'next';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from '@supabase/auth-helpers-react';
import { useDispatch } from 'react-redux';
import { BankAccount, BankStatement, StatementUpload, Transaction, PageProcessingResult } from '@/types';
import { Layout } from '@/components/layout/Layout';
import { StatementDashboard, StatementDashboardRef } from '@/components/StatementDashboard';
import { SimplifiedStatementUpload } from '@/components/SimplifiedStatementUpload';
import { Auth } from '@/components/Auth';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ToastProvider, useToast } from '@/components/Toast';
import { setTransactions } from '@/store/transactionsSlice';
import { motion } from 'framer-motion';

const StatementsPageContent: React.FC = () => {
  const session = useSession();
  const router = useRouter();
  const dispatch = useDispatch();
  const { toasts, addToast, removeToast } = useToast();
  const statementDashboardRef = useRef<StatementDashboardRef>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [extractedTransactions, setExtractedTransactions] = useState<Transaction[]>([]);
  const [reuploadStatementId, setReuploadStatementId] = useState<string>('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<string>('');

  useEffect(() => {
    if (session?.user) {
      fetchAccounts();
    }
  }, [session?.user?.id]); // Use stable user ID instead of user object

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
    // Scroll to top of the page to show the upload form from the beginning
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReuploadStatement = (accountId: string, month: number, year: number, existingStatementId: string) => {
    setSelectedAccountId(accountId);
    setSelectedMonth(month);
    setSelectedYear(year);
    setReuploadStatementId(existingStatementId);
    setShowUploadForm(true);
    // Scroll to top of the page to show the upload form from the beginning
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveStatement = async (statementId: string) => {
    // Show confirmation dialog
    setStatementToDelete(statementId);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteStatement = async () => {
    if (!statementToDelete) return;

    try {
      setIsLoading(true);

      const response = await fetch(`/api/bank-statements?id=${statementToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();

        // Refresh both the accounts and statement dashboard immediately
        await Promise.all([
          fetchAccounts(),
          statementDashboardRef.current?.refreshStatements()
        ]);

        // Show success notification with details
        const message = result.deletedTransactionsCount > 0
          ? `Statement deleted successfully! ${result.deletedTransactionsCount} associated transactions were also removed.`
          : 'Statement deleted successfully!';

        addToast({
          type: 'success',
          message,
          duration: 5000
        });
      } else {
        const error = await response.json();
        addToast({
          type: 'error',
          message: 'Failed to remove statement: ' + error.error,
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error removing statement:', error);
      addToast({
        type: 'error',
        message: 'Error removing statement',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
      setStatementToDelete('');
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

      // Use transactions from uploadData directly (from AI processing)
      const transactionsToUse = uploadData.extractedTransactions || extractedTransactions;

      // Finalize balance after all pages are processed using new consolidated approach
      let closingBalance = null;
      if (uploadData.pageResults && uploadData.pageResults.length > 0) {
        console.log('🔍 Finalizing balance from all processed pages...');

        // Prepare balance data from all pages for finalization
        const pageBalanceData = uploadData.pageResults
          .filter(page => page.balance_data && page.balance_data.balance_confidence > 0)
          .map(page => ({
            page_number: page.pageNumber,
            balance_data: page.balance_data
          }));

        if (pageBalanceData.length > 0) {
          console.log(`� Found balance data on ${pageBalanceData.length} pages, determining final balance...`);
        }
      }

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

      // Create the new statement record without closing balance initially
      const statementData = {
        bank_account_id: uploadData.bank_account_id,
        statement_month: uploadData.statement_month,
        statement_year: uploadData.statement_year,
        statement_start_date: uploadData.statement_start_date,
        statement_end_date: uploadData.statement_end_date,
        file_name: uploadData.file.name,
        file_size_mb: Math.round((uploadData.file.size / (1024 * 1024)) * 100) / 100,
        // closing_balance will be set by finalize-balance API
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

        // Save extracted transactions to database if there are any
        let savedTransactions = transactionsToUse;
        if (transactionsToUse.length > 0) {
          console.log(`Saving ${transactionsToUse.length} extracted transactions to database...`);

          try {
            const saveResponse = await fetch('/api/transactions/save-extracted', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactions: transactionsToUse,
                bankAccountId: selectedAccountId,
                bankStatementId: data.statement.id
              }),
            });

            if (saveResponse.ok) {
              const saveData = await saveResponse.json();
              savedTransactions = saveData.transactions || [];
              console.log(`Successfully saved ${saveData.count} transactions to database`);
            } else {
              const saveError = await saveResponse.json();
              console.error('Failed to save transactions:', saveError);
              alert('Warning: Transactions were extracted but not saved to database. You can still categorize them, but changes won\'t persist.');
            }
          } catch (saveError) {
            console.error('Error saving transactions:', saveError);
            alert('Warning: Error saving transactions to database. You can still categorize them, but changes won\'t persist.');
          }
        }

        // Finalize balance after all transactions are saved
        if (uploadData.pageResults && uploadData.pageResults.length > 0) {
          console.log('🎯 Finalizing statement balance...');

          const pageBalanceData = uploadData.pageResults
            .filter(page => page.balance_data && page.balance_data.balance_confidence > 0)
            .map(page => ({
              page_number: page.pageNumber,
              balance_data: page.balance_data
            }));

          if (pageBalanceData.length > 0) {
            try {
              const balanceResponse = await fetch('/api/statements/finalize-balance', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  bank_statement_id: data.statement.id,
                  page_balance_data: pageBalanceData
                }),
              });

              if (balanceResponse.ok) {
                const balanceResult = await balanceResponse.json();
                console.log(`✅ Balance finalized: ₹${balanceResult.closing_balance} from page ${balanceResult.source_page}`);
                closingBalance = balanceResult.closing_balance;
              } else {
                const balanceError = await balanceResponse.json();
                console.error('Failed to finalize balance:', balanceError);
                // Continue processing even if balance finalization fails
              }
            } catch (balanceError) {
              console.error('Error finalizing balance:', balanceError);
              // Continue processing even if balance finalization fails
            }
          } else {
            console.log('ℹ️ No balance data found in any processed pages');
          }
        }

        // Store transactions in Redux store for categorize page (use saved transactions with real UUIDs)
        dispatch(setTransactions(savedTransactions));

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

  const handleTransactionsExtracted = async (transactions: Transaction[], pageResults?: PageProcessingResult[]) => {
    try {
      setIsLoading(true);

      // Store extracted transactions
      setExtractedTransactions(transactions);
      console.log(`Extracted ${transactions.length} transactions, starting upload process...`);
      console.log('EXTRACTED TRANSACTIONS DEBUG:', transactions.map(t => ({
        description: t.description,
        category: t.category,
        category_name: t.category_name,
        amount: t.amount
      })));

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

      // Calculate statement dates based on month/year
      const statementStartDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const statementEndDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${new Date(selectedYear, selectedMonth, 0).getDate().toString().padStart(2, '0')}`;

      // Create the new statement record
      const statementData = {
        bank_account_id: selectedAccountId,
        statement_month: selectedMonth,
        statement_year: selectedYear,
        statement_start_date: statementStartDate,
        statement_end_date: statementEndDate,
        file_name: 'AI_Processed_Statement.pdf', // Since we don't have file reference in this simplified flow
        file_size_mb: 0, // AI processed, no direct file size
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

        // Save extracted transactions to database if there are any
        let savedTransactions = transactions;
        if (transactions.length > 0) {
          console.log(`Saving ${transactions.length} extracted transactions to database...`);
          console.log('TRANSACTIONS TO SAVE DEBUG:', transactions.map(t => ({
            description: t.description,
            category: t.category,
            category_name: t.category_name,
            amount: t.amount
          })));

          try {
            const saveResponse = await fetch('/api/transactions/save-extracted', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactions: transactions,
                bankAccountId: selectedAccountId,
                bankStatementId: data.statement.id
              }),
            });

            if (saveResponse.ok) {
              const saveData = await saveResponse.json();
              savedTransactions = saveData.transactions || [];
              console.log(`Successfully saved ${saveData.count} transactions to database`);
            } else {
              const saveError = await saveResponse.json();
              console.error('Failed to save transactions:', saveError);
              alert('Warning: Transactions were extracted but not saved to database. You can still categorize them, but changes won\'t persist.');
            }
          } catch (saveError) {
            console.error('Error saving transactions:', saveError);
            alert('Warning: Error saving transactions to database. You can still categorize them, but changes won\'t persist.');
          }
        }

        // Finalize balance after all transactions are saved using new consolidated approach
        if (pageResults && pageResults.length > 0) {
          console.log('🎯 Finalizing statement balance...');

          const pageBalanceData = pageResults
            .filter(page => page.balance_data && page.balance_data.balance_confidence > 0)
            .map(page => ({
              page_number: page.pageNumber,
              balance_data: page.balance_data
            }));

          if (pageBalanceData.length > 0) {
            try {
              const balanceResponse = await fetch('/api/statements/finalize-balance', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  bank_statement_id: data.statement.id,
                  page_balance_data: pageBalanceData
                }),
              });

              if (balanceResponse.ok) {
                const balanceResult = await balanceResponse.json();
                console.log(`✅ Balance finalized: ₹${balanceResult.closing_balance} from page ${balanceResult.source_page}`);
              } else {
                const balanceError = await balanceResponse.json();
                console.error('Failed to finalize balance:', balanceError);
                // Continue processing even if balance finalization fails
              }
            } catch (balanceError) {
              console.error('Error finalizing balance:', balanceError);
              // Continue processing even if balance finalization fails
            }
          } else {
            console.log('ℹ️ No balance data found in any processed pages');
          }
        }

        // Store transactions in Redux store for categorize page (use saved transactions with real UUIDs)
        dispatch(setTransactions(savedTransactions));

        // Update statement status to completed
        await fetch(`/api/bank-statements?id=${data.statement.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            processing_status: 'completed',
            processed_at: new Date().toISOString(),
            transaction_count: transactions.length,
          }),
        });

        // Always redirect to categorize page after successful upload
        setShowUploadForm(false);

        if (transactions.length > 0) {
          // Redirect to categorize page with the extracted transactions
          router.push('/categorize');
        } else {
          // No transactions extracted, still redirect to categorize page with a message
          router.push('/categorize?message=no_transactions');
        }
      } else {
        const error = await response.json();
        console.error('Failed to create statement:', error);
        alert('Failed to create statement: ' + error.error);
      }
    } catch (error) {
      console.error('Error in upload process:', error);
      alert('Error in upload process: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
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
            <SimplifiedStatementUpload
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onTransactionsExtracted={handleTransactionsExtracted}
              onCancel={handleCancel}
              isReupload={!!reuploadStatementId}
            />
          ) : (
            <StatementDashboard
              ref={statementDashboardRef}
              accounts={accounts}
              onUploadStatement={handleUploadStatement}
              onRemoveStatement={handleRemoveStatement}
              onReuploadStatement={handleReuploadStatement}
              isLoading={isLoading}
            />
          )}
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setStatementToDelete('');
        }}
        onConfirm={confirmDeleteStatement}
        type="danger"
        title="Delete Bank Statement"
        message={`Are you sure you want to delete this statement?

This will permanently delete:
• The bank statement record
• ALL associated transactions
• ALL categorization work for these transactions

This action cannot be undone.`}
        confirmButtonText="Delete Statement"
        cancelButtonText="Cancel"
      />

      {/* Toast Provider */}
      <ToastProvider toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
};

const StatementsPage: NextPage = () => {
  return <StatementsPageContent />;
};

export default StatementsPage;
