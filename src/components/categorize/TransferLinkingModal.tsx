import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, BankAccount } from '@/types';
import { formatAmount } from '@/utils/currency';
import { useTransferLinking } from '@/hooks/useTransferLinking';
import { Portal } from '../Portal';

interface TransferLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTransaction: Transaction;
  currency: string;
  onTransferLinked: () => void;
}

interface SuggestionWithDetails {
  transaction: Transaction;
  confidence: number;
  amountDiff: number;
  dateDiff: number;
  reason: string;
}

export const TransferLinkingModal: React.FC<TransferLinkingModalProps> = ({
  isOpen,
  onClose,
  sourceTransaction,
  currency,
  onTransferLinked
}) => {
  const [suggestions, setSuggestions] = useState<SuggestionWithDetails[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionWithDetails | null>(null);
  const [notes, setNotes] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const {
    isLoading,
    error,
    linkTransactions,
    suggestTransfersForTransaction,
    clearError
  } = useTransferLinking();

  // Fetch bank accounts
  useEffect(() => {
    if (isOpen) {
      fetchBankAccounts();
    }
  }, [isOpen]);

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/bank-accounts');
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  };

  // Load suggestions when modal opens
  useEffect(() => {
    if (isOpen && sourceTransaction) {
      loadSuggestions();
    }
  }, [isOpen, sourceTransaction]);

  const loadSuggestions = async () => {
    try {
      const result = await suggestTransfersForTransaction(sourceTransaction.id, {
        dateTolerance: 3,
        amountTolerance: 2.0
      });
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  };

  const handleLinkTransfer = async () => {
    if (!selectedSuggestion) return;

    setIsLinking(true);
    try {
      const success = await linkTransactions({
        transaction1Id: sourceTransaction.id,
        transaction2Id: selectedSuggestion.transaction.id,
        confidence: selectedSuggestion.confidence,
        notes: notes.trim() || undefined
      });

      if (success) {
        onTransferLinked();
        onClose();
        // Reset state
        setSelectedSuggestion(null);
        setNotes('');
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Failed to link transfer:', err);
    } finally {
      setIsLinking(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedSuggestion(null);
    setNotes('');
    setSuggestions([]);
    clearError();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getBankDisplayName = (transaction: Transaction) => {
    if (!transaction.bank_account_id) return 'Unknown Account';
    
    const bankAccount = bankAccounts.find(acc => acc.id === transaction.bank_account_id);
    if (bankAccount) {
      // Return bank name with optional nickname or account number
      const accountIdentifier = bankAccount.account_nickname || 
                               (bankAccount.account_number_last4 ? `****${bankAccount.account_number_last4}` : '');
      return accountIdentifier ? `${bankAccount.bank_name} (${accountIdentifier})` : bankAccount.bank_name;
    }
    
    // Fallback to account ID
    return `Account ${transaction.bank_account_id.slice(-4)}`;
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">🔗 Link Transfer</h2>
                  <p className="text-blue-100 mt-1">Find and link the matching transaction for this transfer</p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white/80 hover:text-white transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Source Transaction */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Source Transaction</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{sourceTransaction.description}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(sourceTransaction.transaction_date).toLocaleDateString()} • {getBankDisplayName(sourceTransaction)}
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${sourceTransaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(sourceTransaction.amount, currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-800 text-sm">{error}</div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <div className="text-gray-600 mt-2">Finding potential matches...</div>
                </div>
              )}

              {/* Suggestions */}
              {!isLoading && suggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Potential Matches ({suggestions.length} found)
                  </h3>
                  <div className="space-y-3">
                    {suggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.transaction.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedSuggestion?.transaction.id === suggestion.transaction.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedSuggestion(suggestion)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{suggestion.transaction.description}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {new Date(suggestion.transaction.transaction_date).toLocaleDateString()} • {getBankDisplayName(suggestion.transaction)}
                            </div>
                            <div className="text-sm text-blue-600 mt-1">{suggestion.reason}</div>
                            {suggestion.amountDiff > 0 && (
                              <div className="text-sm text-orange-600 mt-1">
                                Amount difference: {formatAmount(suggestion.amountDiff, currency)}
                              </div>
                            )}
                            {suggestion.dateDiff > 0 && (
                              <div className="text-sm text-gray-500 mt-1">
                                {suggestion.dateDiff} day{suggestion.dateDiff !== 1 ? 's' : ''} apart
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                              {getConfidenceText(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
                            </span>
                            <div className={`text-lg font-bold ${suggestion.transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatAmount(suggestion.transaction.amount, currency)}
                            </div>
                          </div>
                        </div>
                        
                        {selectedSuggestion?.transaction.id === suggestion.transaction.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 pt-4 border-t border-blue-200"
                          >
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Notes (optional)
                            </label>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Add any notes about this transfer link..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={2}
                            />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Suggestions */}
              {!isLoading && suggestions.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-6xl mb-4">🔍</div>
                  <div className="text-gray-600 text-lg font-medium">No potential matches found</div>
                  <div className="text-gray-500 text-sm mt-2">
                    No similar transactions were found that could be linked as transfers.
                    Try adjusting the date range or amount tolerance, or manually categorize as a transfer.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!isLoading && suggestions.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedSuggestion 
                    ? `Selected: ${selectedSuggestion.transaction.description.substring(0, 30)}...`
                    : 'Select a transaction to link'
                  }
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLinkTransfer}
                    disabled={!selectedSuggestion || isLinking}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {isLinking && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    <span>{isLinking ? 'Linking...' : 'Link Transfer'}</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
};
