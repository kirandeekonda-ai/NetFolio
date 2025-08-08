import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, BankAccount } from '@/types';
import { formatAmount } from '@/utils/currency';
import { useTransferLinking } from '@/hooks/useTransferLinking';
import { useToast } from '@/components/Toast';

interface TransferDetectionPanelProps {
  transactions: Transaction[];
  currency: string;
  onTransferLinked: () => void;
}

interface DetectedTransfer {
  transaction1: Transaction;
  transaction2: Transaction;
  confidence: number;
  amountDiff: number;
  dateDiff: number;
  reason: string;
}

export const TransferDetectionPanel: React.FC<TransferDetectionPanelProps> = ({
  transactions,
  currency,
  onTransferLinked
}) => {
  const [detectedTransfers, setDetectedTransfers] = useState<DetectedTransfer[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());
  const [isLinking, setIsLinking] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const { 
    detectPotentialTransfers, 
    linkTransactions, 
    unlinkTransaction,
    isLoading, 
    error 
  } = useTransferLinking();
  
  const { addToast } = useToast();

  // Fetch bank accounts when component mounts
  useEffect(() => {
    fetchBankAccounts();
  }, []);

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

  // Auto-detect transfers when component mounts
  useEffect(() => {
    handleDetectTransfers();
  }, [transactions]);

  // Get already linked transfers
  const linkedTransfers = transactions.filter(t => 
    t.is_internal_transfer && t.linked_transaction_id
  );

  const handleDetectTransfers = async () => {
    setIsDetecting(true);
    try {
      const suggestions = await detectPotentialTransfers({
        dateTolerance: 2,
        amountTolerance: 2.0
      });
      
      // Filter out duplicates and only show high confidence (>90%)
      const highConfidenceTransfers = suggestions.filter(transfer => transfer.confidence > 0.9);
      
      // Remove duplicates by creating a set of unique pair combinations
      const uniqueTransfers = [];
      const seenPairs = new Set();
      
      for (const transfer of highConfidenceTransfers) {
        // Create a consistent pair identifier regardless of order
        const id1 = transfer.transaction1.id;
        const id2 = transfer.transaction2.id;
        const pairKey = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
        
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          uniqueTransfers.push(transfer);
        }
      }
      
      setDetectedTransfers(uniqueTransfers);
    } catch (err) {
      console.error('Failed to detect transfers:', err);
      addToast({
        type: 'error',
        message: 'Failed to detect potential transfers',
        duration: 3000
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSelectPair = (pairId: string) => {
    const newSelected = new Set(selectedPairs);
    if (newSelected.has(pairId)) {
      newSelected.delete(pairId);
    } else {
      newSelected.add(pairId);
    }
    setSelectedPairs(newSelected);
  };

  const handleLinkSelected = async () => {
    if (selectedPairs.size === 0) return;

    setIsLinking(true);
    const loadingToastId = addToast({
      type: 'loading',
      message: `Linking ${selectedPairs.size} transfer pair${selectedPairs.size > 1 ? 's' : ''}...`,
      duration: 0
    });

    try {
      let successCount = 0;
      
      for (const pairId of selectedPairs) {
        const transfer = detectedTransfers.find(t => getPairId(t) === pairId);
        if (transfer) {
          const success = await linkTransactions({
            transaction1Id: transfer.transaction1.id,
            transaction2Id: transfer.transaction2.id,
            confidence: transfer.confidence,
            notes: `Auto-detected transfer: ${transfer.reason}`
          });
          if (success) successCount++;
        }
      }

      addToast({
        type: 'success',
        message: `Successfully linked ${successCount} transfer pair${successCount > 1 ? 's' : ''}`,
        duration: 3000
      });

      // Refresh detection after linking
      setSelectedPairs(new Set());
      await handleDetectTransfers();
      onTransferLinked();
      
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to link transfers',
        duration: 3000
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleDelinkTransfer = async (transactionId: string) => {
    const success = await unlinkTransaction(transactionId);
    if (success) {
      addToast({
        type: 'success',
        message: 'Transfer unlinked successfully',
        duration: 3000
      });
      await handleDetectTransfers();
      onTransferLinked();
    } else {
      addToast({
        type: 'error',
        message: 'Failed to unlink transfer',
        duration: 3000
      });
    }
  };

  const getPairId = (transfer: DetectedTransfer) => {
    return `${transfer.transaction1.id}-${transfer.transaction2.id}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-orange-100 text-orange-800';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
              <span className="text-xl">🔗</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Transfer Detection</h3>
              <p className="text-sm text-gray-600">AI-powered detection showing only high confidence matches (&gt;90%)</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDetectTransfers}
              disabled={isDetecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              {isDetecting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{isDetecting ? 'Detecting...' : '🔍 Re-detect'}</span>
            </button>
            
            {selectedPairs.size > 0 && (
              <button
                onClick={handleLinkSelected}
                disabled={isLinking}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {isLinking && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>{isLinking ? 'Linking...' : `🔗 Link ${selectedPairs.size} Transfer${selectedPairs.size > 1 ? 's' : ''}`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{detectedTransfers.length}</div>
            <div className="text-sm text-gray-600">High Confidence (&gt;90%)</div>
          </div>
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{linkedTransfers.length}</div>
            <div className="text-sm text-gray-600">Already Linked</div>
          </div>
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{selectedPairs.size}</div>
            <div className="text-sm text-gray-600">Selected</div>
          </div>
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {detectedTransfers.filter(t => t.confidence >= 0.95).length}
            </div>
            <div className="text-sm text-gray-600">Perfect Match (&gt;95%)</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Already Linked Transfers */}
      {linkedTransfers.length > 0 && (
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                <span className="text-lg">✅</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">Already Linked Transfers</h4>
                <p className="text-sm text-gray-600">{linkedTransfers.length} transfer{linkedTransfers.length !== 1 ? 's' : ''} currently linked</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {linkedTransfers.map((transaction) => (
              <div key={transaction.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      {transaction.description}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {getBankDisplayName(transaction)} • {new Date(transaction.transaction_date).toLocaleDateString()}
                    </div>
                    <div className={`text-lg font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(transaction.amount, currency)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-600 text-sm font-medium flex items-center space-x-1">
                      <span>🔄</span>
                      <span>Linked</span>
                    </div>
                    <button
                      onClick={() => handleDelinkTransfer(transaction.id)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center space-x-1"
                    >
                      <span>🔗❌</span>
                      <span>{isLoading ? 'Unlinking...' : 'Unlink'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detected Transfers */}
      {detectedTransfers.length > 0 ? (
        <div className="space-y-4">
          {detectedTransfers.map((transfer, index) => {
            const pairId = getPairId(transfer);
            const isSelected = selectedPairs.has(pairId);
            
            return (
              <motion.div
                key={pairId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-2xl shadow-lg border-2 transition-all cursor-pointer ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelectPair(pairId)}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectPair(pairId)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(transfer.confidence)}`}>
                        {Math.round(transfer.confidence * 100)}% Confidence
                      </span>
                      <span className="text-sm text-gray-600">{transfer.reason}</span>
                    </div>
                    
                    {transfer.amountDiff > 0 && (
                      <span className="text-sm text-orange-600">
                        ±{formatAmount(transfer.amountDiff, currency)} difference
                      </span>
                    )}
                  </div>

                  {/* Transactions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Transaction 1 */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-red-800">Outgoing</span>
                        <span className="text-sm text-gray-600">
                          {new Date(transfer.transaction1.transaction_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="font-medium text-gray-900 mb-1">
                        {transfer.transaction1.description}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {getBankDisplayName(transfer.transaction1)}
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        -{formatAmount(Math.abs(transfer.transaction1.amount), currency)}
                      </div>
                    </div>

                    {/* Transaction 2 */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-800">Incoming</span>
                        <span className="text-sm text-gray-600">
                          {new Date(transfer.transaction2.transaction_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="font-medium text-gray-900 mb-1">
                        {transfer.transaction2.description}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {getBankDisplayName(transfer.transaction2)}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        +{formatAmount(Math.abs(transfer.transaction2.amount), currency)}
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {transfer.dateDiff > 0 && (
                    <div className="mt-3 text-center text-sm text-gray-500">
                      {transfer.dateDiff} day{transfer.dateDiff !== 1 ? 's' : ''} apart
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : !isDetecting ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <div className="text-gray-600 text-lg font-medium">No potential transfers detected</div>
          <div className="text-gray-500 text-sm mt-2">
            No matching transactions found that could be linked as transfers
          </div>
        </div>
      ) : null}
    </div>
  );
};
