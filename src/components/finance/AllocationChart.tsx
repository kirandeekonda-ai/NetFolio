import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { InvestmentHolding } from '@/types/finance';

interface AllocationChartProps {
    holdings: InvestmentHolding[];
    type: 'sector' | 'asset_class';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export const AllocationChart: React.FC<AllocationChartProps> = ({ holdings, type }) => {
    const { data, totalValue } = useMemo(() => {
        const map = new Map<string, number>();

        holdings.forEach(h => {
            const key = (type === 'sector' ? h.sector : h.asset_class) || 'Other';
            const value = h.current_value || 0;
            map.set(key, (map.get(key) || 0) + value);
        });

        const chartData = Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const total = chartData.reduce((sum, item) => sum + item.value, 0);

        return { data: chartData, totalValue: total };
    }, [holdings, type]);

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (holdings.length === 0) return null;

    return (
        <div className="flex gap-6">
            {/* Chart */}
            <div className="flex-1 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => formatMoney(value)}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Breakdown Table */}
            <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-4 h-[350px] overflow-y-auto">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        {type === 'sector' ? 'Sector' : 'Asset Class'} Breakdown
                    </h4>
                    <div className="space-y-2">
                        {data.map((item, index) => {
                            const percentage = (item.value / totalValue) * 100;
                            return (
                                <div
                                    key={item.name}
                                    className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            ></div>
                                            <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={item.name}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className="h-1.5 rounded-full transition-all"
                                                style={{
                                                    width: `${percentage}%`,
                                                    backgroundColor: COLORS[index % COLORS.length]
                                                }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-600 ml-3 whitespace-nowrap">
                                            {formatMoney(item.value)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

