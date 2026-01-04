import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BankAccount } from '@/types';
import simplifiedBalanceService from '@/services/SimplifiedBalanceService';

interface ManualBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: BankAccount;
    onSuccess: () => void;
    initialData?: {
        id: string;
        amount: number;
        date: string;
        notes?: string;
    } | null;
}

export const ManualBalanceModal: React.FC<ManualBalanceModalProps> = ({
    isOpen,
    onClose,
    account,
    onSuccess,
    initialData
}) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load initial data if editing
    useEffect(() => {
        if (isOpen && initialData) {
            setAmount(initialData.amount.toString());
            setDate(initialData.date);
            setNotes(initialData.notes || '');
        } else if (isOpen && !initialData) {
            // Reset for new entry
            setAmount('');
            setNotes('');
            setDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (initialData) {
                // UPDATE existing
                await simplifiedBalanceService.updateManualBalance(
                    initialData.id,
                    Number(amount),
                    date,
                    notes
                );
            } else {
                // CREATE new
                await simplifiedBalanceService.addManualBalance(
                    account.id,
                    Number(amount),
                    date,
                    notes
                );
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update balance');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Update Balance</h3>
                        <p className="text-sm text-gray-600 mt-0.5">{account.bank_name} {account.account_nickname ? `(${account.account_nickname})` : ''}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">The date this balance was accurate</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Balance Amount (₹)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-medium"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                            placeholder="Reason for manual update..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Updating...
                                </>
                            ) : (
                                'Save Balance'
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
