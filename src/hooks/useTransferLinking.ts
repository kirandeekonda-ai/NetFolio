import { useState, useCallback } from 'react';
import { Transaction, TransferSuggestion, TransferLinkRequest } from '@/types';

interface TransferLinkingHook {
  isLoading: boolean;
  error: string | null;
  linkTransactions: (request: TransferLinkRequest) => Promise<boolean>;
  unlinkTransaction: (transactionId: string) => Promise<boolean>;
  detectPotentialTransfers: (options?: DetectionOptions) => Promise<TransferSuggestion[]>;
  suggestTransfersForTransaction: (transactionId: string, options?: DetectionOptions) => Promise<{
    targetTransaction: Transaction;
    suggestions: Array<{
      transaction: Transaction;
      confidence: number;
      amountDiff: number;
      dateDiff: number;
      reason: string;
    }>;
  }>;
  clearError: () => void;
}

interface DetectionOptions {
  dateTolerance?: number;
  amountTolerance?: number;
}

export const useTransferLinking = (): TransferLinkingHook => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const linkTransactions = useCallback(async (request: TransferLinkRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/transactions/transfer-linking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'link',
          ...request
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to link transactions');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Link transactions error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unlinkTransaction = useCallback(async (transactionId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/transactions/transfer-linking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unlink',
          transactionId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to unlink transaction');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Unlink transaction error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const detectPotentialTransfers = useCallback(async (options: DetectionOptions = {}): Promise<TransferSuggestion[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/transactions/transfer-linking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'detect',
          dateTolerance: options.dateTolerance || 1,
          amountTolerance: options.amountTolerance || 1.0
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to detect potential transfers');
      }

      return result.suggestions || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Detect transfers error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const suggestTransfersForTransaction = useCallback(async (
    transactionId: string, 
    options: DetectionOptions = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/transactions/transfer-linking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'suggest',
          transactionId,
          dateTolerance: options.dateTolerance || 2,
          amountTolerance: options.amountTolerance || 2.0
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get transfer suggestions');
      }

      return {
        targetTransaction: result.targetTransaction,
        suggestions: result.suggestions || []
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Suggest transfers error:', err);
      return {
        targetTransaction: null as any,
        suggestions: []
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    linkTransactions,
    unlinkTransaction,
    detectPotentialTransfers,
    suggestTransfersForTransaction,
    clearError
  };
};
