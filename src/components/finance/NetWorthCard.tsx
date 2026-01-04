import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { NetWorthSnapshot } from '@/services/NetWorthService';
import { useBalanceProtection } from '@/hooks/useBalanceProtection';

interface NetWorthCardProps {
    data: NetWorthSnapshot | null;
    isLoading: boolean;
}

export const NetWorthCard: React.FC<NetWorthCardProps> = ({ data, isLoading }) => {
    const { isProtected, isUnlocked } = useBalanceProtection();
    const isVisible = !isProtected || isUnlocked;

    const formatCurrency = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    const ChartTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Get the actual data point
            const dataPoint = payload[0].payload;

            return (
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl text-xs">
                    <p className="font-medium text-gray-900 mb-2">{new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <div className="space-y-1">
                        <p className="flex items-center justify-between gap-4">
                            <span className="text-blue-600 font-medium">Cash</span>
                            <span className="font-bold">{formatCurrency(dataPoint.cashBalance)}</span>
                        </p>
                        <p className="flex items-center justify-between gap-4">
                            <span className="text-purple-600 font-medium">Invested</span>
                            <span className="font-bold">{formatCurrency(dataPoint.investedAmount)}</span>
                        </p>
                        <div className="border-t border-gray-100 my-1 pt-1">
                            <p className="flex items-center justify-between gap-4">
                                <span className="text-gray-600 font-medium">Total</span>
                                <span className="font-bold text-gray-900">{formatCurrency(dataPoint.total)}</span>
                            </p>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 animate-pulse h-[300px]">
                <div className="h-8 w-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-12 w-64 bg-gray-200 rounded-lg mb-8"></div>
                <div className="h-40 w-full bg-gray-100 rounded-xl"></div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 md:p-8 shadow-lg border border-gray-100 relative overflow-hidden"
        >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <div className="w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 relative z-10">
                <div>
                    <h2 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Net Worth</h2>
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
                            {isVisible ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.totalNetWorth) : '••••••••'}
                        </h1>
                    </div>
                </div>

                <div className="flex gap-4 mt-6 md:mt-0">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                            <p className="text-xs text-blue-600 font-semibold mb-0.5">Liquidity (Cash)</p>
                            <p className="text-sm font-bold text-gray-900">{isVisible ? formatCurrency(data.cashTotal) : '••••••'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-100">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <div>
                            <p className="text-xs text-purple-600 font-semibold mb-0.5">Investments</p>
                            <p className="text-sm font-bold text-gray-900">{isVisible ? formatCurrency(data.investmentsTotal) : '••••••'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.history} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            minTickGap={50}
                            tickFormatter={(str) => new Date(str).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e5e7eb' }} />
                        <Area
                            type="monotone"
                            dataKey="investedAmount"
                            stackId="1"
                            stroke="#8b5cf6"
                            fill="url(#colorInvest)"
                            name="Invested"
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="cashBalance"
                            stackId="1"
                            stroke="#3b82f6"
                            fill="url(#colorCash)"
                            name="Cash"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};
