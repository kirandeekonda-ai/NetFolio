import React, { useState } from 'react';
import { InvestmentHolding } from '@/types/finance';
import { motion, AnimatePresence } from 'framer-motion';

interface HoldingsTableProps {
    holdings: InvestmentHolding[];
    isLoading: boolean;
    onEdit: (holding: InvestmentHolding) => void;
    onDelete: (id: string) => void;
    onEditTransaction: (tx: any, holding: InvestmentHolding) => void;
    onDeleteTransaction: (txId: string) => void;
}

const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDecimal = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(value);
};

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, isLoading, onEdit, onDelete, onEditTransaction, onDeleteTransaction }) => {
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    const toggleRow = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRowId(expandedRowId === id ? null : id);
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Loading portfolio data...</div>;
    }

    if (holdings.length === 0) {
        return (
            <div className="p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 mb-2">No investments found.</p>
                <p className="text-sm text-gray-400">Add your first custom investment to start tracking.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="w-8 px-3 py-3"></th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Person</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bucket</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CMP</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cur. Val</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                        <th className="relative px-3 py-3">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {holdings.map((h, idx) => {
                        const isProfit = (h.pnl_amount || 0) >= 0;
                        const isExpanded = expandedRowId === h.id;
                        return (
                            <React.Fragment key={h.id}>
                                <motion.tr
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`hover:bg-gray-50 transition-colors cursor-pointer group ${isExpanded ? 'bg-gray-50' : ''}`}
                                    onClick={() => onEdit(h)}
                                >
                                    {/* Expand Toggle */}
                                    <td className="px-3 py-4 text-center">
                                        <button
                                            onClick={(e) => toggleRow(h.id, e)}
                                            className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className={`h-4 w-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </td>

                                    {/* Investment */}
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex flex-col max-w-[180px]">
                                            <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate" title={h.name}>{h.name}</span>
                                            <span className="text-xs text-gray-500">{h.ticker_symbol}</span>
                                        </div>
                                    </td>

                                    {/* Person */}
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${h.holder_name === 'Kiran' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {h.holder_name}
                                        </span>
                                    </td>

                                    {/* Sector */}
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 max-w-[120px] truncate" title={h.sector}>
                                        {h.sector || '-'}
                                    </td>

                                    {/* Bucket */}
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs border border-gray-200">
                                            {h.strategy_bucket || 'Long'}
                                        </span>
                                    </td>

                                    {/* Units */}
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                                        {h.quantity}
                                    </td>

                                    {/* Avg Price */}
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 text-right font-mono">
                                        {formatDecimal(h.avg_price)}
                                    </td>

                                    {/* CMP */}
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-mono font-medium">
                                        {formatDecimal(h.current_price || h.avg_price)}
                                    </td>

                                    {/* Current Value */}
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold font-mono">
                                        {formatValue(h.current_value || 0)}
                                    </td>

                                    {/* P&L */}
                                    <td className={`px-3 py-4 whitespace-nowrap text-sm text-right font-medium font-mono border-l-4 ${isProfit ? 'border-l-emerald-500 bg-emerald-50/30' : 'border-l-red-500 bg-red-50/30'
                                        }`}>
                                        <div className={isProfit ? 'text-emerald-700' : 'text-red-700'}>
                                            <div>{isProfit ? '+' : ''}{formatValue(h.pnl_amount || 0)}</div>
                                            <div className="text-xs opacity-80">
                                                ({isProfit ? '+' : ''}{h.pnl_percentage?.toFixed(2)}%)
                                            </div>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(h);
                                                }}
                                                className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-colors"
                                                title="Edit Holding"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Are you sure you want to delete this holding?')) onDelete(h.id);
                                                }}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                                                title="Delete Holding"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>

                                {/* Expanded History Row */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.tr
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-gray-50"
                                        >
                                            <td colSpan={11} className="px-3 py-3">
                                                <div className="ml-8 p-4 bg-white rounded-lg border border-gray-200 shadow-inner">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Transaction History</h4>
                                                    {!h.transactions || h.transactions.length === 0 ? (
                                                        <div className="text-sm text-gray-500 italic">No historical transactions found.</div>
                                                    ) : (
                                                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                                                            <thead>
                                                                <tr className="text-gray-500">
                                                                    <th className="text-left font-medium py-2">Date</th>
                                                                    <th className="text-left font-medium py-2">Type</th>
                                                                    <th className="text-right font-medium py-2">Qty</th>
                                                                    <th className="text-right font-medium py-2">Price</th>
                                                                    <th className="text-right font-medium py-2">Amount</th>
                                                                    <th className="text-right font-medium py-2 w-24">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-50">
                                                                {h.transactions.map((tx) => (
                                                                    <tr key={tx.id} className="group/tx hover:bg-gray-100 transition-colors">
                                                                        <td className="py-2 text-gray-900">{new Date(tx.date).toLocaleDateString()}</td>
                                                                        <td className="py-2">
                                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                                                {tx.type.toUpperCase()}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2 text-right font-mono">{tx.quantity}</td>
                                                                        <td className="py-2 text-right font-mono">{formatDecimal(tx.price_per_unit)}</td>
                                                                        <td className="py-2 text-right font-mono text-gray-600">{formatValue(tx.quantity * tx.price_per_unit)}</td>
                                                                        <td className="py-2 text-right">
                                                                            <div className="flex justify-end space-x-1 transition-opacity">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        onEditTransaction(tx, h);
                                                                                    }}
                                                                                    className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                                                                                    title="Edit Transaction"
                                                                                >
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                                    </svg>
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (confirm('Delete this transaction?')) onDeleteTransaction(tx.id);
                                                                                    }}
                                                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                                                    title="Delete Transaction"
                                                                                >
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
