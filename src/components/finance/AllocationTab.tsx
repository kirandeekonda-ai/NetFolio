import React from 'react';
import { InvestmentHolding } from '@/types/finance';
import { motion } from 'framer-motion';

interface AllocationTabProps {
    holdings: InvestmentHolding[];
}

const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};

export const AllocationTab: React.FC<AllocationTabProps> = ({ holdings }) => {
    // Calculate total portfolio value
    const totalValue = holdings.reduce((sum, h) => sum + (h.quantity * (h.current_price || h.avg_price)), 0);

    // Group by Asset Class
    const byAssetClass: Record<string, { value: number; count: number; }> = {};
    holdings.forEach(h => {
        const assetClass = h.asset_class || 'Other';
        const value = h.quantity * (h.current_price || h.avg_price);
        if (!byAssetClass[assetClass]) {
            byAssetClass[assetClass] = { value: 0, count: 0 };
        }
        byAssetClass[assetClass].value += value;
        byAssetClass[assetClass].count += 1;
    });

    // Group by Sector
    const bySector: Record<string, { value: number; count: number; }> = {};
    holdings.forEach(h => {
        const sector = h.sector || 'Other';
        const value = h.quantity * (h.current_price || h.avg_price);
        if (!bySector[sector]) {
            bySector[sector] = { value: 0, count: 0 };
        }
        bySector[sector].value += value;
        bySector[sector].count += 1;
    });

    // Calculate concentration risk
    const holingsWithValue = holdings.map(h => ({
        ...h,
        value: h.quantity * (h.current_price || h.avg_price)
    })).sort((a, b) => b.value - a.value);

    const top5Value = holingsWithValue.slice(0, 5).reduce((sum, h) => sum + h.value, 0);
    const top10Value = holingsWithValue.slice(0, 10).reduce((sum, h) => sum + h.value, 0);
    const concentrationRisk = totalValue > 0 ? (top5Value / totalValue) * 100 : 0;

    // Largest single holding
    const largestHolding = holingsWithValue[0];
    const largestHoldingPercent = totalValue > 0 ? (largestHolding?.value / totalValue) * 100 : 0;

    // Largest sector
    const largestSector = Object.entries(bySector).sort((a, b) => b[1].value - a[1].value)[0];
    const largestSectorPercent = totalValue > 0 && largestSector ? (largestSector[1].value / totalValue) * 100 : 0;

    // Diversification score (inverse Herfindahl index, normalized to 0-100)
    const herfindahlIndex = holdings.reduce((sum, h) => {
        const share = totalValue > 0 ? (h.quantity * (h.current_price || h.avg_price)) / totalValue : 0;
        return sum + (share * share);
    }, 0);
    const diversificationScore = totalValue > 0 ? (1 - herfindahlIndex) * 100 : 0;

    // Risk levels
    const highRisk = largestHoldingPercent > 15;
    const mediumRisk = concentrationRisk > 50;
    const sectorRisk = largestSectorPercent > 35;

    return (
        <div className="space-y-6">
            {/* Concentration Alerts */}
            {(highRisk || mediumRisk || sectorRisk) && (
                <div className="space-y-3">
                    {highRisk && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
                        >
                            <div className="flex items-start">
                                <svg className="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <h3 className="text-red-800 font-semibold">🚨 High Concentration Risk</h3>
                                    <p className="text-red-700 text-sm mt-1">
                                        <strong>{largestHolding?.name}</strong> represents <strong>{largestHoldingPercent.toFixed(1)}%</strong> of your portfolio.
                                        Consider diversifying - single holdings should ideally be &lt;15%.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {sectorRisk && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg"
                        >
                            <div className="flex items-start">
                                <svg className="w-6 h-6 text-orange-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <h3 className="text-orange-800 font-semibold">⚠️ Sector Over-Concentration</h3>
                                    <p className="text-orange-700 text-sm mt-1">
                                        <strong>{largestSector?.[0]}</strong> sector is <strong>{largestSectorPercent.toFixed(1)}%</strong> of portfolio.
                                        Consider sector diversification - ideally &lt;35% per sector.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Diversification Score</h3>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-3xl font-bold ${diversificationScore > 70 ? 'text-emerald-600' :
                            diversificationScore > 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                            {diversificationScore.toFixed(0)}
                        </p>
                        <span className="text-gray-500">/100</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {diversificationScore > 70 ? 'Well diversified' :
                            diversificationScore > 50 ? 'Moderately diversified' : 'Poorly diversified'}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Top 5 Concentration</h3>
                    <p className={`text-3xl font-bold ${concentrationRisk > 50 ? 'text-red-600' :
                        concentrationRisk > 30 ? 'text-yellow-600' : 'text-emerald-600'
                        }`}>
                        {concentrationRisk.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                        {formatValue(top5Value)} in top 5
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Top 10 Concentration</h3>
                    <p className="text-3xl font-bold text-gray-900">
                        {totalValue > 0 ? ((top10Value / totalValue) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                        {formatValue(top10Value)} in top 10
                    </p>
                </div>
            </div>

            {/* Asset Class & Sector Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asset Class Allocation */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                        <h3 className="text-lg font-semibold text-blue-900">Asset Class Allocation</h3>
                    </div>
                    <div className="p-4">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                                    <th className="pb-3">Asset Class</th>
                                    <th className="pb-3 text-right">Value</th>
                                    <th className="pb-3 text-right">%</th>
                                    <th className="pb-3 text-right">Count</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {Object.entries(byAssetClass)
                                    .sort((a, b) => b[1].value - a[1].value)
                                    .map(([assetClass, data]) => {
                                        const percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
                                        return (
                                            <tr key={assetClass} className="hover:bg-gray-50">
                                                <td className="py-3">
                                                    <span className="font-medium text-gray-900">{assetClass}</span>
                                                </td>
                                                <td className="py-3 text-right font-mono text-gray-900">
                                                    {formatValue(data.value)}
                                                </td>
                                                <td className="py-3 text-right font-mono text-gray-600">
                                                    {percentage.toFixed(1)}%
                                                </td>
                                                <td className="py-3 text-right text-gray-500">
                                                    {data.count}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sector Allocation */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-purple-50 px-6 py-4 border-b border-purple-100">
                        <h3 className="text-lg font-semibold text-purple-900">Sector Allocation</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white">
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                                    <th className="px-6 pb-3 pt-4">Sector</th>
                                    <th className="px-6 pb-3 pt-4 text-right">Value</th>
                                    <th className="px-6 pb-3 pt-4 text-right">%</th>
                                    <th className="px-6 pb-3 pt-4 text-right">Count</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {Object.entries(bySector)
                                    .sort((a, b) => b[1].value - a[1].value)
                                    .map(([sector, data]) => {
                                        const percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
                                        return (
                                            <tr key={sector} className="hover:bg-gray-50">
                                                <td className="px-6 py-3">
                                                    <span className="font-medium text-gray-900">{sector}</span>
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono text-gray-900">
                                                    {formatValue(data.value)}
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono text-gray-600">
                                                    {percentage.toFixed(1)}%
                                                </td>
                                                <td className="px-6 py-3 text-right text-gray-500">
                                                    {data.count}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Top Holdings */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Top 10 Holdings by Value</h3>
                    <p className="text-sm text-gray-600">Largest positions in your portfolio</p>
                </div>
                <div className="p-4">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                                <th className="pb-3">Rank</th>
                                <th className="pb-3">Investment</th>
                                <th className="pb-3 text-right">Value</th>
                                <th className="pb-3 text-right">% of Portfolio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {holingsWithValue.slice(0, 10).map((h, idx) => {
                                const percentage = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
                                return (
                                    <tr key={h.id} className="hover:bg-gray-50">
                                        <td className="py-3">
                                            <span className="text-gray-400 text-sm font-medium">#{idx + 1}</span>
                                        </td>
                                        <td className="py-3">
                                            <div>
                                                <p className="font-medium text-gray-900">{h.name}</p>
                                                <p className="text-xs text-gray-500">{h.ticker_symbol}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 text-right font-mono text-gray-900 font-medium">
                                            {formatValue(h.value)}
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className={`font-mono ${percentage > 15 ? 'text-red-600 font-bold' :
                                                percentage > 10 ? 'text-orange-600 font-semibold' : 'text-gray-600'
                                                }`}>
                                                {percentage.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
