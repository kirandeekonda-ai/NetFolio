import React from 'react';
import { InvestmentHolding } from '@/types/finance';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface DashboardInsightsProps {
    holdings: InvestmentHolding[];
}

const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};

export const DashboardInsights: React.FC<DashboardInsightsProps> = ({ holdings }) => {
    // Calculate P&L for each holding
    const holdingsWithPnL = holdings.map(h => {
        const invested = h.quantity * h.avg_price;
        const current = h.quantity * (h.current_price || h.avg_price);
        const pnl = current - invested;
        const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
        return { ...h, invested, current, pnl, pnlPercent };
    });

    // Top 5 winners and losers
    const topWinners = [...holdingsWithPnL]
        .filter(h => h.pnl > 0)
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 5);

    const topLosers = [...holdingsWithPnL]
        .filter(h => h.pnl < 0)
        .sort((a, b) => a.pnl - b.pnl)
        .slice(0, 5);

    // Portfolio health metrics
    const totalPnL = holdingsWithPnL.reduce((sum, h) => sum + h.pnl, 0);
    const winners = holdingsWithPnL.filter(h => h.pnl > 0).length;
    const losers = holdingsWithPnL.filter(h => h.pnl < 0).length;
    const winRate = holdings.length > 0 ? (winners / holdings.length) * 100 : 0;

    // Critical alerts
    const criticalLosers = holdingsWithPnL.filter(h => h.pnlPercent < -30);

    // Concentration risk
    const totalValue = holdingsWithPnL.reduce((sum, h) => sum + h.current, 0);
    const sortedByValue = [...holdingsWithPnL].sort((a, b) => b.current - a.current);
    const topHolding = sortedByValue[0];
    const topHoldingPercent = totalValue > 0 ? (topHolding?.current / totalValue) * 100 : 0;
    const highConcentration = topHoldingPercent > 15;

    // Portfolio health score (0-100)
    const healthScore = Math.min(100, Math.max(0,
        (winRate * 0.4) + // 40% weight on win rate
        ((100 - Math.min(100, topHoldingPercent * 2)) * 0.3) + // 30% on diversification
        ((100 - Math.min(100, criticalLosers.length * 10)) * 0.3) // 30% on avoiding big losers
    ));

    const getHealthColor = (score: number) => {
        if (score >= 70) return 'text-emerald-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getHealthLabel = (score: number) => {
        if (score >= 70) return 'Healthy';
        if (score >= 50) return 'Moderate';
        return 'Needs Attention';
    };

    return (
        <div className="space-y-6 mb-8">
            {/* Critical Alerts */}
            {(criticalLosers.length > 0 || highConcentration) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {criticalLosers.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
                        >
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div className="flex-1">
                                    <h3 className="text-red-800 font-semibold text-sm">⚠️ {criticalLosers.length} Underperformer{criticalLosers.length > 1 ? 's' : ''}</h3>
                                    <p className="text-red-700 text-xs mt-1">
                                        Holdings down &gt;30%. <Link href="/finance/performance" className="underline font-medium">Review now →</Link>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {highConcentration && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg"
                        >
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-orange-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div className="flex-1">
                                    <h3 className="text-orange-800 font-semibold text-sm">🎯 High Concentration</h3>
                                    <p className="text-orange-700 text-xs mt-1">
                                        {topHolding?.name} is {topHoldingPercent.toFixed(1)}% of portfolio. <Link href="/finance/allocation" className="underline font-medium">Diversify →</Link>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Main Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Portfolio Health */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-600">Portfolio Health</h3>
                        <span className="text-2xl">💊</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>
                            {healthScore.toFixed(0)}
                        </p>
                        <span className="text-gray-500">/100</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{getHealthLabel(healthScore)}</p>
                </motion.div>

                {/* Win Rate */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-100 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-600">Win Rate</h3>
                        <span className="text-2xl">🎯</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-emerald-600">
                            {winRate.toFixed(0)}%
                        </p>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{winners} winners, {losers} losers</p>
                </motion.div>

                {/* Top Winner */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-100 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-600">Top Winner</h3>
                        <span className="text-2xl">🔥</span>
                    </div>
                    {topWinners[0] ? (
                        <>
                            <p className="text-xs font-semibold text-gray-800 truncate">{topWinners[0].name}</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">
                                +{topWinners[0].pnlPercent.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{formatValue(topWinners[0].pnl)}</p>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400">No winners yet</p>
                    )}
                </motion.div>

                {/* Biggest Loser */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="bg-gradient-to-br from-red-50 to-rose-50 p-5 rounded-xl border border-red-100 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-600">Biggest Loser</h3>
                        <span className="text-2xl">📉</span>
                    </div>
                    {topLosers[0] ? (
                        <>
                            <p className="text-xs font-semibold text-gray-800 truncate">{topLosers[0].name}</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">
                                {topLosers[0].pnlPercent.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{formatValue(topLosers[0].pnl)}</p>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400">All holdings positive</p>
                    )}
                </motion.div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Holdings</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{holdings.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Asset Classes</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {new Set(holdings.map(h => h.asset_class).filter(Boolean)).size}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Sectors</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {new Set(holdings.map(h => h.sector).filter(Boolean)).size}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Top Holding</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{topHoldingPercent.toFixed(1)}%</p>
                </div>
            </div>
        </div>
    );
};
