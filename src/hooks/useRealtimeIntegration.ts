/**
 * Real-Time Integration Hook
 * 
 * Custom hook that manages real-time subscriptions and integrates
 * with Redux store for live data updates.
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '@supabase/auth-helpers-react';
import { RealtimeService } from '@/services/realtime/RealtimeService';
import { LoggingService } from '@/services/logging/LoggingService';
import {
  addTransactionFromRealtime,
  updateTransactionFromRealtime,
  deleteTransactionFromRealtime,
  setRealtimeConnection
} from '@/store/enhancedTransactionsSlice';
import { Transaction } from '@/types';
import type { RootState } from '@/store';

const logger = LoggingService.setContext('useRealtimeIntegration');

export const useRealtimeIntegration = () => {
  const dispatch = useDispatch();
  const user = useUser();
  const realtimeConnected = useSelector((state: RootState) => 
    state.enhancedTransactions?.realtimeConnected || false
  );

  // Transform database transaction to frontend format
  const transformTransaction = useCallback((dbTransaction: any): Transaction => {
    return {
      id: dbTransaction.id,
      user_id: dbTransaction.user_id,
      bank_account_id: dbTransaction.bank_account_id,
      bank_statement_id: dbTransaction.bank_statement_id,
      transaction_date: dbTransaction.date,
      description: dbTransaction.description,
      amount: dbTransaction.amount,
      transaction_type: dbTransaction.type === 'credit' ? 'income' : 'expense' as 'income' | 'expense' | 'transfer',
      category_id: dbTransaction.category_id,
      category_name: dbTransaction.category,
      is_transfer: dbTransaction.is_transfer || false,
      transfer_account_id: dbTransaction.transfer_account_id,
      reference_number: dbTransaction.reference_number,
      balance_after: dbTransaction.balance_after,
      created_at: dbTransaction.created_at || new Date().toISOString(),
      updated_at: dbTransaction.updated_at || new Date().toISOString(),
      // Legacy fields for backward compatibility
      date: dbTransaction.date,
      type: dbTransaction.type === 'credit' ? 'income' : 'expense' as 'income' | 'expense',
      category: dbTransaction.category || 'Uncategorized'
    };
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) {
      logger.debug('No user ID available, skipping real-time setup');
      return;
    }

    logger.info('Setting up real-time integration', { userId: user.id });

    const setupRealtime = async () => {
      try {
        // Connect to real-time service
        await RealtimeService.connect();
        
        // Set up connection status monitoring
        const unsubscribeConnection = RealtimeService.onConnectionChange((status) => {
          dispatch(setRealtimeConnection(status.connected));
          logger.info('Real-time connection status changed', status);
        });

        // Subscribe to transactions changes
        const transactionsSubscriptionId = RealtimeService.subscribe(
          {
            table: 'transactions',
            userId: user.id,
            events: ['INSERT', 'UPDATE', 'DELETE']
          },
          (payload) => {
            logger.debug('Received transaction real-time event', {
              eventType: payload.eventType,
              transactionId: (payload.new as any)?.id || (payload.old as any)?.id
            });

            switch (payload.eventType) {
              case 'INSERT':
                if (payload.new) {
                  const transaction = transformTransaction(payload.new);
                  dispatch(addTransactionFromRealtime(transaction));
                }
                break;
              
              case 'UPDATE':
                if (payload.new) {
                  const transaction = transformTransaction(payload.new);
                  dispatch(updateTransactionFromRealtime(transaction));
                }
                break;
              
              case 'DELETE':
                if ((payload.old as any)?.id) {
                  dispatch(deleteTransactionFromRealtime((payload.old as any).id));
                }
                break;
            }
          }
        );

        // Subscribe to bank accounts changes (for balance updates)
        const bankAccountsSubscriptionId = RealtimeService.subscribe(
          {
            table: 'bank_accounts',
            userId: user.id,
            events: ['UPDATE']
          },
          (payload) => {
            logger.debug('Received bank account real-time event', {
              eventType: payload.eventType,
              accountId: (payload.new as any)?.id || (payload.old as any)?.id
            });

            // Handle bank account balance updates
            // This could trigger a refresh of dashboard data
            if (payload.eventType === 'UPDATE' && payload.new) {
              logger.info('Bank account balance updated', { 
                accountId: (payload.new as any).id,
                newBalance: (payload.new as any).balance 
              });
              // Could dispatch an action to update account balances in state
            }
          }
        );

        logger.info('Real-time subscriptions established', {
          transactionsSubscriptionId,
          bankAccountsSubscriptionId
        });

        // Cleanup function
        return () => {
          logger.info('Cleaning up real-time subscriptions');
          unsubscribeConnection();
          RealtimeService.unsubscribe(transactionsSubscriptionId);
          RealtimeService.unsubscribe(bankAccountsSubscriptionId);
        };

      } catch (error) {
        logger.error('Failed to set up real-time integration', error as Error);
        dispatch(setRealtimeConnection(false));
        
        // Enable polling fallback
        RealtimeService.enablePollingFallback(true);
        RealtimeService.setPollingInterval(30000); // 30 seconds
      }
    };

    const cleanup = setupRealtime();

    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [user?.id, dispatch, transformTransaction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logger.info('Component unmounting, disconnecting real-time service');
      RealtimeService.disconnect();
    };
  }, []);

  return {
    realtimeConnected,
    
    // Manual connection management
    connect: useCallback(async () => {
      try {
        await RealtimeService.connect();
        return true;
      } catch (error) {
        logger.error('Manual connection failed', error as Error);
        return false;
      }
    }, []),
    
    disconnect: useCallback(() => {
      RealtimeService.disconnect();
    }, []),
    
    // Get connection status
    getConnectionStatus: useCallback(() => {
      return RealtimeService.getConnectionStatus();
    }, [])
  };
};
