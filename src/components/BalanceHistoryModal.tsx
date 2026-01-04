import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BankAccount } from '@/types';
import simplifiedBalanceService from '@/services/SimplifiedBalanceService';
import { ConfirmationDialog } from './ConfirmationDialog';

interface BalanceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: BankAccount;
    onEdit?: (item: HistoryItem) => void;
    onHistoryChanged?: () => void;
}

interface HistoryItem {
    id?: string;
    date: string;
    amount: number;
    source: 'statement' | 'manual';
    notes?: string;
}

export const BalanceHistoryModal: React.FC<BalanceHistoryModalProps> = ({
    isOpen,
    onClose,
    account,
    onEdit,
    onHistoryChanged
}) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && account) {
            loadHistory();
        }
    }, [isOpen, account]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore - Validated that service returns this structure now
            const data = await simplifiedBalanceService.getBalanceHistory(account.id);
            setHistory(data);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setItemToDelete(id);
        setShowConfirmDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        setDeletingId(itemToDelete);
        try {
            await simplifiedBalanceService.deleteManualBalance(itemToDelete);
            await loadHistory(); // Refresh list
            if (onHistoryChanged) onHistoryChanged(); // Notify parent
            setShowConfirmDialog(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Failed to delete entry', error);
            alert('Failed to delete entry'); // Keep alert strictly for error fallback
        } finally {
            setDeletingId(null);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: account.currency || 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Balance History</h3>
                            <p className="text-sm text-gray-600 mt-0.5">{account.bank_name} - {account.account_nickname || account.account_type}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-0">
                        {isLoading ? (
                            <div className="py-12 text-center text-gray-500">
                                Loading history...
                            </div>
                        ) : history.length === 0 ? (
                            <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                                <span className="text-4xl mb-2">📉</span>
                                <p>No balance history found.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Balance</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {history.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(item.date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                                                {formatCurrency(item.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.source === 'statement'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-purple-100 text-purple-800'
                                                    }`}>
                                                    {item.source === 'statement' ? 'Statement' : 'Manual'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-[150px] truncate" title={item.notes}>
                                                {item.notes || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {item.source === 'manual' && item.id && (
                                                    <div className="flex items-center justify-end space-x-3">
                                                        {onEdit && (
                                                            <button
                                                                onClick={() => onEdit(item)}
                                                                className="text-blue-600 hover:text-blue-900 font-medium"
                                                                title="Edit"
                                                            >
                                                                ✏️
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => item.id && handleDeleteClick(item.id)}
                                                            disabled={deletingId === item.id}
                                                            className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
                                                            title="Delete"
                                                        >
                                                            {deletingId === item.id ? '...' : '🗑️'}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>

            <ConfirmationDialog
                isOpen={showConfirmDialog}
                onClose={() => {
                    setShowConfirmDialog(false);
                    setItemToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Entry"
                message="Are you sure you want to delete this balance entry? This action cannot be undone."
                isLoading={!!deletingId}
            />
        </>
    );
};
