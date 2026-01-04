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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100"
                >
                    {/* Premium Header with Gradient */}
                    <div className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                        <div className="relative px-8 py-6 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                        <span className="text-2xl">📊</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white">Balance History</h3>
                                </div>
                                <p className="text-blue-100 font-medium ml-13">{account.bank_name}</p>
                                <p className="text-blue-200 text-sm ml-13">{account.account_nickname || account.account_type}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-colors text-white"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="py-20 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center animate-pulse">
                                    <span className="text-3xl">⏳</span>
                                </div>
                                <p className="text-gray-500 font-medium">Loading history...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="py-20 text-center flex flex-col items-center">
                                <div className="w-20 h-20 mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                                    <span className="text-4xl">📉</span>
                                </div>
                                <p className="text-lg font-semibold text-gray-700 mb-1">No History Found</p>
                                <p className="text-sm text-gray-500">Balance entries will appear here once added</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {history.map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="group relative bg-white hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 rounded-xl p-4 mb-2 border border-gray-100 hover:border-blue-200 transition-all duration-200 hover:shadow-md"
                                    >
                                        {/* Decorative accent */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${item.source === 'statement' ? 'bg-gradient-to-b from-blue-500 to-blue-600' : 'bg-gradient-to-b from-purple-500 to-purple-600'}`}></div>

                                        <div className="flex items-center justify-between gap-4">
                                            {/* Date & Icon */}
                                            <div className="flex items-center gap-3 min-w-[140px]">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.source === 'statement' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                                                    <span className="text-lg">{item.source === 'statement' ? '📄' : '✏️'}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{formatDate(item.date)}</p>
                                                    <p className="text-xs text-gray-500">{item.source === 'statement' ? 'Statement' : 'Manual Entry'}</p>
                                                </div>
                                            </div>

                                            {/* Balance */}
                                            <div className="flex-1 text-right">
                                                <p className="text-lg font-bold text-gray-900">{formatCurrency(item.amount)}</p>
                                                {item.notes && (
                                                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px] ml-auto" title={item.notes}>
                                                        {item.notes}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Actions for manual entries */}
                                            {item.source === 'manual' && item.id && (
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {onEdit && (
                                                        <button
                                                            onClick={() => onEdit(item)}
                                                            className="w-8 h-8 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors"
                                                            title="Edit"
                                                        >
                                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => item.id && handleDeleteClick(item.id)}
                                                        disabled={deletingId === item.id}
                                                        className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        {deletingId === item.id ? (
                                                            <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold text-gray-900">{history.length}</span> {history.length === 1 ? 'entry' : 'entries'} total
                            </p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                                Close
                            </button>
                        </div>
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
