/**
 * Enhanced Transactions Slice with Real-Time Integration
 * 
 * Redux slice for managing transactions with real-time updates
 * and integration with the service layer.
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Transaction } from '@/types';
import { DatabaseService } from '@/services';
import { LoggingService } from '@/services/logging/LoggingService';

interface TransactionsState {
  items: Transaction[];
  isLoading: boolean;
  error: string | null;
  realtimeConnected: boolean;
  lastUpdated: string | null;
}

const initialState: TransactionsState = {
  items: [],
  isLoading: false,
  error: null,
  realtimeConnected: false,
  lastUpdated: null,
};

const logger = LoggingService.setContext('TransactionsSlice');

// Async thunks using the service layer
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async ({ userId, accountId }: { userId: string; accountId?: string }) => {
    try {
      logger.info('Fetching transactions', { userId, accountId });
      const transactions = await DatabaseService.getTransactions(userId, accountId);
      
      // Transform database format to frontend format
      return transactions.map((t: any) => ({
        id: t.id!,
        user_id: t.user_id,
        bank_account_id: t.bank_account_id,
        bank_statement_id: t.bank_statement_id,
        transaction_date: t.date,
        description: t.description,
        amount: t.amount,
        transaction_type: t.type === 'credit' ? 'income' : 'expense' as 'income' | 'expense' | 'transfer',
        category_id: t.category_id,
        category_name: t.category,
        is_transfer: false,
        transfer_account_id: t.transfer_account_id,
        reference_number: t.reference_number,
        balance_after: t.balance_after,
        created_at: t.created_at || new Date().toISOString(),
        updated_at: t.updated_at || new Date().toISOString(),
        // Legacy fields for backward compatibility
        date: t.date,
        type: t.type === 'credit' ? 'income' : 'expense' as 'income' | 'expense',
        category: t.category || 'Uncategorized'
      }));
    } catch (error) {
      logger.error('Failed to fetch transactions', error as Error);
      throw error;
    }
  }
);

export const createTransaction = createAsyncThunk(
  'transactions/createTransaction',
  async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      logger.info('Creating transaction', { description: transactionData.description });
      
      const dbTransaction = await DatabaseService.createTransaction({
        user_id: transactionData.user_id,
        bank_account_id: transactionData.bank_account_id || '',
        amount: transactionData.amount,
        description: transactionData.description,
        date: transactionData.date || transactionData.transaction_date,
        category: transactionData.category || transactionData.category_name,
        type: transactionData.type === 'income' ? 'credit' : 'debit'
      });

      // Transform back to frontend format - use the same transformation as fetchTransactions
      return {
        id: dbTransaction.id!,
        user_id: dbTransaction.user_id,
        bank_account_id: dbTransaction.bank_account_id,
        bank_statement_id: undefined,
        transaction_date: dbTransaction.date,
        description: dbTransaction.description,
        amount: dbTransaction.amount,
        transaction_type: dbTransaction.type === 'credit' ? 'income' : 'expense' as 'income' | 'expense' | 'transfer',
        category_id: undefined,
        category_name: dbTransaction.category,
        is_transfer: false,
        transfer_account_id: undefined,
        reference_number: undefined,
        balance_after: undefined,
        created_at: dbTransaction.created_at || new Date().toISOString(),
        updated_at: dbTransaction.updated_at || new Date().toISOString(),
        // Legacy fields for backward compatibility
        date: dbTransaction.date,
        type: dbTransaction.type === 'credit' ? 'income' : 'expense' as 'income' | 'expense',
        category: dbTransaction.category || 'Uncategorized'
      };
    } catch (error) {
      logger.error('Failed to create transaction', error as Error);
      throw error;
    }
  }
);

export const updateTransaction = createAsyncThunk(
  'transactions/updateTransaction',
  async ({ id, updates }: { id: string; updates: Partial<Transaction> }) => {
    try {
      logger.info('Updating transaction', { id });
      
      const dbUpdates: any = {};
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.date !== undefined || updates.transaction_date !== undefined) {
        dbUpdates.date = updates.date || updates.transaction_date;
      }
      if (updates.category !== undefined || updates.category_name !== undefined) {
        dbUpdates.category = updates.category || updates.category_name;
      }
      if (updates.type !== undefined || updates.transaction_type !== undefined) {
        const transactionType = updates.type || (updates.transaction_type === 'income' ? 'income' : 'expense');
        dbUpdates.type = transactionType === 'income' ? 'credit' : 'debit';
      }

      const dbTransaction = await DatabaseService.updateTransaction(id, dbUpdates);

      // Transform back to frontend format - use the same transformation as fetchTransactions
      return {
        id: dbTransaction.id!,
        user_id: dbTransaction.user_id,
        bank_account_id: dbTransaction.bank_account_id,
        bank_statement_id: updates.bank_statement_id,
        transaction_date: dbTransaction.date,
        description: dbTransaction.description,
        amount: dbTransaction.amount,
        transaction_type: dbTransaction.type === 'credit' ? 'income' : 'expense' as 'income' | 'expense' | 'transfer',
        category_id: updates.category_id,
        category_name: dbTransaction.category,
        is_transfer: updates.is_transfer || false,
        transfer_account_id: updates.transfer_account_id,
        reference_number: updates.reference_number,
        balance_after: updates.balance_after,
        created_at: dbTransaction.created_at || new Date().toISOString(),
        updated_at: dbTransaction.updated_at || new Date().toISOString(),
        // Legacy fields for backward compatibility
        date: dbTransaction.date,
        type: dbTransaction.type === 'credit' ? 'income' : 'expense' as 'income' | 'expense',
        category: dbTransaction.category || 'Uncategorized'
      };
    } catch (error) {
      logger.error('Failed to update transaction', error as Error);
      throw error;
    }
  }
);

export const deleteTransaction = createAsyncThunk(
  'transactions/deleteTransaction',
  async (id: string) => {
    try {
      logger.info('Deleting transaction', { id });
      await DatabaseService.deleteTransaction(id);
      return id;
    } catch (error) {
      logger.error('Failed to delete transaction', error as Error);
      throw error;
    }
  }
);

export const enhancedTransactionsSlice = createSlice({
  name: 'enhancedTransactions',
  initialState,
  reducers: {
    // Real-time update actions
    addTransactionFromRealtime: (state, action: PayloadAction<Transaction>) => {
      const exists = state.items.find(item => item.id === action.payload.id);
      if (!exists) {
        state.items.push(action.payload);
        state.lastUpdated = new Date().toISOString();
        logger.debug('Added transaction from real-time', { id: action.payload.id });
      }
    },
    
    updateTransactionFromRealtime: (state, action: PayloadAction<Transaction>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
        state.lastUpdated = new Date().toISOString();
        logger.debug('Updated transaction from real-time', { id: action.payload.id });
      }
    },
    
    deleteTransactionFromRealtime: (state, action: PayloadAction<string>) => {
      const initialLength = state.items.length;
      state.items = state.items.filter(item => item.id !== action.payload);
      if (state.items.length < initialLength) {
        state.lastUpdated = new Date().toISOString();
        logger.debug('Deleted transaction from real-time', { id: action.payload });
      }
    },

    // Connection status management
    setRealtimeConnection: (state, action: PayloadAction<boolean>) => {
      state.realtimeConnected = action.payload;
      logger.info('Real-time connection status changed', { connected: action.payload });
    },

    // Error management
    clearError: (state) => {
      state.error = null;
    },

    // Manual refresh
    refreshTransactions: (state) => {
      state.isLoading = true;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch transactions
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch transactions';
      });

    // Create transaction
    builder
      .addCase(createTransaction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        // Don't add here if real-time is connected - let real-time handle it
        if (!state.realtimeConnected) {
          state.items.push(action.payload);
        }
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create transaction';
      });

    // Update transaction
    builder
      .addCase(updateTransaction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        // Don't update here if real-time is connected - let real-time handle it
        if (!state.realtimeConnected) {
          const index = state.items.findIndex(item => item.id === action.payload.id);
          if (index !== -1) {
            state.items[index] = action.payload;
          }
        }
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(updateTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update transaction';
      });

    // Delete transaction
    builder
      .addCase(deleteTransaction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        // Don't delete here if real-time is connected - let real-time handle it
        if (!state.realtimeConnected) {
          state.items = state.items.filter(item => item.id !== action.payload);
        }
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(deleteTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete transaction';
      });
  },
});

export const {
  addTransactionFromRealtime,
  updateTransactionFromRealtime,
  deleteTransactionFromRealtime,
  setRealtimeConnection,
  clearError,
  refreshTransactions
} = enhancedTransactionsSlice.actions;

export default enhancedTransactionsSlice.reducer;
