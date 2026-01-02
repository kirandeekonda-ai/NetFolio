import React, { useMemo } from 'react';
import { InvestmentHolding } from '@/types/finance';

import { motion } from 'framer-motion';

interface HoldingsTableProps {
    holdings: InvestmentHolding[];
    isLoading: boolean;
    onEdit: (holding: InvestmentHolding) => void;
    onDelete: (id: string) => void;
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

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, isLoading, onEdit, onDelete }) => {

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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Person</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bucket</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CMP</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Val</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {holdings.map((h, idx) => {
                        const isProfit = (h.pnl_amount || 0) >= 0;
                        return (
                            <motion.tr
                                key={h.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                onClick={() => onEdit(h)}
                            >
                                {/* Investment */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{h.name}</span>
                                        <span className="text-xs text-gray-500">{h.ticker_symbol}</span>
                                    </div>
                                </td>

                                {/* Person */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${h.holder_name === 'Kiran' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                        }`}>
                                        {h.holder_name}
                                    </span>
                                </td>

                                {/* Sector / Sub Category */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {h.sector || '-'}
                                </td>

                                {/* Bucket */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs border border-gray-200">
                                        {h.strategy_bucket || 'Long'}
                                    </span>
                                </td>

                                {/* Units */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                                    {h.quantity}
                                </td>

                                {/* Avg Price */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right font-mono">
                                    {formatDecimal(h.avg_price)}
                                </td>

                                {/* CMP (Live) */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-medium">
                                    {formatDecimal(h.current_price || h.avg_price)}
                                    {/* Indicator dot could go here */}
                                </td>

                                {/* Current Value */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold font-mono">
                                    {formatValue(h.current_value || 0)}
                                </td>

                                {/* P&L */}
                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium font-mono border-l-4 ${isProfit ? 'border-l-emerald-500 bg-emerald-50/30' : 'border-l-red-500 bg-red-50/30'
                                    }`}>
                                    <div className={isProfit ? 'text-emerald-700' : 'text-red-700'}>
                                        <div>{isProfit ? '+' : ''}{formatValue(h.pnl_amount || 0)}</div>
                                        <div className="text-xs opacity-80">
                                            ({isProfit ? '+' : ''}{h.pnl_percentage?.toFixed(2)}%)
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(h);
                                            }}
                                            className="text-blue-600 hover:text-blue-900 transition-colors"
                                            title="Edit Holding"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this holding?')) onDelete(h.id);
                                            }}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                            title="Delete Holding"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
