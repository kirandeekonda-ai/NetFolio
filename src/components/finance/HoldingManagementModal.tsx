import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InvestmentHolding } from '@/types/finance';

interface HoldingManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    holding: InvestmentHolding | null;
    onAddTransaction: (data: any) => Promise<void>;
    onEditTransaction: (txId: string, data: any) => Promise<void>;
    onDeleteTransaction: (txId: string) => Promise<void>;
    onUpdateDetails: (data: any) => Promise<void>;
}

type TabType = 'transactions' | 'details';

export const HoldingManagementModal: React.FC<HoldingManagementModalProps> = ({
    isOpen,
    onClose,
    holding,
    onAddTransaction,
    onEditTransaction,
    onDeleteTransaction,
    onUpdateDetails
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('transactions');
    const [isAddingTransaction, setIsAddingTransaction] = useState(false);
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [txFormData, setTxFormData] = useState({
        type: 'buy',
        date: new Date().toISOString().split('T')[0],
        quantity: '',
        price: '',
        notes: ''
    });
    const [detailsFormData, setDetailsFormData] = useState({
        name: '',
        sector: '',
        asset_class: 'Equity',
        strategy_bucket: 'Long',
        holder_name: 'Kiran'
    });

    // Populate forms when holding changes
    useEffect(() => {
        if (holding) {
            setDetailsFormData({
                name: holding.name || '',
                sector: holding.sector || '',
                asset_class: holding.asset_class || 'Equity',
                strategy_bucket: holding.strategy_bucket || 'Long',
                holder_name: holding.holder_name || 'Kiran'
            });
        }
    }, [holding]);

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        await onAddTransaction({
            ...txFormData,
            ticker_symbol: holding?.ticker_symbol,
            name: holding?.name,
            holder_name: holding?.holder_name,
            asset_class: holding?.asset_class,
            sector: holding?.sector,
            strategy_bucket: holding?.strategy_bucket
        });
        setTxFormData({
            type: 'buy',
            date: new Date().toISOString().split('T')[0],
            quantity: '',
            price: '',
            notes: ''
        });
        setIsAddingTransaction(false);
    };

    const handleUpdateDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (holding) {
            await onUpdateDetails({
                id: holding.id,
                ...detailsFormData
            });
        }
    };

    if (!isOpen || !holding) return null;

    const transactions = holding.transactions || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{holding.name}</h3>
                        <p className="text-sm text-gray-600 mt-0.5">{holding.ticker_symbol}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'transactions'
                            ? 'text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Transactions
                        {activeTab === 'transactions' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'details'
                            ? 'text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Details
                        {activeTab === 'details' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                            />
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode="wait">
                        {activeTab === 'transactions' ? (
                            <motion.div
                                key="transactions"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                            >
                                {/* Add Transaction Button */}
                                {!isAddingTransaction && (
                                    <button
                                        onClick={() => setIsAddingTransaction(true)}
                                        className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Transaction
                                    </button>
                                )}

                                {/* Add Transaction Form */}
                                {isAddingTransaction && (
                                    <form onSubmit={handleAddTransaction} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">New Transaction</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                                                <select
                                                    value={txFormData.type}
                                                    onChange={(e) => setTxFormData({ ...txFormData, type: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                >
                                                    <option value="buy">Buy</option>
                                                    <option value="sell">Sell</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                                <input
                                                    type="date"
                                                    value={txFormData.date}
                                                    onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={txFormData.quantity}
                                                    onChange={(e) => setTxFormData({ ...txFormData, quantity: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Price per Unit</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={txFormData.price}
                                                    onChange={(e) => setTxFormData({ ...txFormData, price: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                type="submit"
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                Save Transaction
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingTransaction(false)}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Transaction History */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Transaction History ({transactions.length})</h4>
                                    {transactions.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p>No transactions yet</p>
                                        </div>
                                    ) : (
                                        transactions.map((tx: any) => (
                                            <div
                                                key={tx.id}
                                                className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${tx.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {tx.type.toUpperCase()}
                                                            </span>
                                                            <span className="text-sm text-gray-600">{formatDate(tx.date)}</span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                                                            <div>
                                                                <span className="text-gray-500">Qty:</span>
                                                                <span className="ml-1 font-medium">{Number(tx.quantity).toFixed(2)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">Price:</span>
                                                                <span className="ml-1 font-medium">₹{Number(tx.price_per_unit).toFixed(2)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">Total:</span>
                                                                <span className="ml-1 font-medium">{formatMoney(tx.quantity * tx.price_per_unit)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Delete this transaction?')) {
                                                                onDeleteTransaction(tx.id);
                                                            }
                                                        }}
                                                        className="text-red-500 hover:text-red-700 ml-2"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                            >
                                <form onSubmit={handleUpdateDetails} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Investment Name</label>
                                        <input
                                            type="text"
                                            value={detailsFormData.name}
                                            onChange={(e) => setDetailsFormData({ ...detailsFormData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
                                            <select
                                                value={detailsFormData.holder_name}
                                                onChange={(e) => setDetailsFormData({ ...detailsFormData, holder_name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="Kiran">Kiran</option>
                                                <option value="Anusha">Anusha</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Class</label>
                                            <select
                                                value={detailsFormData.asset_class}
                                                onChange={(e) => setDetailsFormData({ ...detailsFormData, asset_class: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="Equity">Equity</option>
                                                <option value="Mutual Fund">Mutual Fund</option>
                                                <option value="Debt">Debt</option>
                                                <option value="Commodity">Commodity</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sector (e.g., FMCG)</label>
                                        <input
                                            type="text"
                                            value={detailsFormData.sector}
                                            onChange={(e) => setDetailsFormData({ ...detailsFormData, sector: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bucket (Strategy)</label>
                                        <select
                                            value={detailsFormData.strategy_bucket}
                                            onChange={(e) => setDetailsFormData({ ...detailsFormData, strategy_bucket: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="Long">Long Term</option>
                                            <option value="Short">Short Term</option>
                                            <option value="Trading">Trading</option>
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                    >
                                        Update Details
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
