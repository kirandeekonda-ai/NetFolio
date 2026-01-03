import React from 'react';
import { InvestmentHolding } from '@/types/finance';
import { motion } from 'framer-motion';

interface PerformanceTabProps {
    holdings: InvestmentHolding[];
}

const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};

const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ holdings }) => {
    // Calculate P&L for each holding
    const holdingsWithPnL = holdings.map(h => {
        const invested = h.quantity * h.avg_price;
        const current = h.quantity * (h.current_price || h.avg_price);
        const pnl = current - invested;
        const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

        return {
            ...h,
            invested,
            current,
            pnl,
            pnlPercent
        };
    });

    // Top 10 Gainers (by absolute ₹)
    const topGainers = [...holdingsWithPnL]
        .filter(h => h.pnl > 0)
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 10);

    // Top 10 Losers (by absolute ₹)
    const topLosers = [...holdingsWithPnL]
        .filter(h => h.pnl < 0)
        .sort((a, b) => a.pnl - b.pnl)
        .slice(0, 10);

    // Performance distribution
    const totalHoldings = holdings.length;
    const winners = holdingsWithPnL.filter(h => h.pnl > 0).length;
    const losers = holdingsWithPnL.filter(h => h.pnl < 0).length;
    const breakEven = totalHoldings - winners - losers;

    // Critical underperformers (>30% down)
    const criticalLosers = holdingsWithPnL.filter(h => h.pnlPercent < -30);

    // Calculate total metrics
    const totalInvested = holdingsWithPnL.reduce((sum, h) => sum + h.invested, 0);
    const totalCurrent = holdingsWithPnL.reduce((sum, h) => sum + h.current, 0);
    const totalPnL = totalCurrent - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Performance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                >
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Overall P&L</h3>
                    <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatValue(totalPnL)}
                    </p>
                    <p className={`text-sm ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatPercent(totalPnLPercent)}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                >
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Winners</h3>
                    <p className="text-2xl font-bold text-emerald-600">{winners}</p>
                    <p className="text-sm text-gray-500">{((winners / totalHoldings) * 100).toFixed(1)}% of portfolio</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                >
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Losers</h3>
                    <p className="text-2xl font-bold text-red-600">{losers}</p>
                    <p className="text-sm text-gray-500">{((losers / totalHoldings) * 100).toFixed(1)}% of portfolio</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                >
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Win Rate</h3>
                    <p className="text-2xl font-bold text-gray-900">
                        {totalHoldings > 0 ? ((winners / totalHoldings) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-sm text-gray-500">{winners} winning holdings</p>
                </motion.div>
            </div>

            {/* Critical Alert */}
            {criticalLosers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
                >
                    <div className="flex items-start">
                        <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <h3 className="text-red-800 font-semibold mb-1">⚠️ {criticalLosers.length} Critical Underperformers</h3>
                            <p className="text-red-700 text-sm">
                                You have {criticalLosers.length} holdings down more than 30%. Consider reviewing these investments.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Top Gainers & Losers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Gainers */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
                        <h3 className="text-lg font-semibold text-emerald-900">🏆 Top 10 Gainers</h3>
                        <p className="text-sm text-emerald-700">Best performing investments</p>
                    </div>
                    <div className="p-4">
                        {topGainers.length > 0 ? (
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                                        <th className="pb-3">Investment</th>
                                        <th className="pb-3 text-right">P&L</th>
                                        <th className="pb-3 text-right">%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {topGainers.map((h, idx) => (
                                        <tr key={h.id} className="hover:bg-gray-50">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 text-sm">#{idx + 1}</span>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{h.name}</p>
                                                        <p className="text-xs text-gray-500">{h.ticker_symbol}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 text-right font-mono text-emerald-600 font-medium">
                                                {formatValue(h.pnl)}
                                            </td>
                                            <td className="py-3 text-right font-mono text-emerald-600 font-medium">
                                                {formatPercent(h.pnlPercent)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No gainers found</p>
                        )}
                    </div>
                </div>

                {/* Top Losers */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-red-50 px-6 py-4 border-b border-red-100">
                        <h3 className="text-lg font-semibold text-red-900">📉 Top 10 Losers</h3>
                        <p className="text-sm text-red-700">Worst performing investments</p>
                    </div>
                    <div className="p-4">
                        {topLosers.length > 0 ? (
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                                        <th className="pb-3">Investment</th>
                                        <th className="pb-3 text-right">P&L</th>
                                        <th className="pb-3 text-right">%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {topLosers.map((h, idx) => (
                                        <tr key={h.id} className="hover:bg-gray-50">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 text-sm">#{idx + 1}</span>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{h.name}</p>
                                                        <p className="text-xs text-gray-500">{h.ticker_symbol}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 text-right font-mono text-red-600 font-medium">
                                                {formatValue(h.pnl)}
                                            </td>
                                            <td className="py-3 text-right font-mono text-red-600 font-medium">
                                                {formatPercent(h.pnlPercent)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No losers found</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
