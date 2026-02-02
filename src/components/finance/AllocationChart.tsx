import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { InvestmentHolding } from '@/types/finance';

interface AllocationChartProps {
    holdings: InvestmentHolding[];
    type: 'sector' | 'asset_class';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

// Custom label with leader lines pointing outward
const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, fill } = props;

    if (percent < 0.05) return null; // Hide labels for very small slices

    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);

    // Points for the leader line
    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    const mx = cx + (outerRadius + 25) * cos;
    const my = cy + (outerRadius + 25) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 15;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            {/* Leader line */}
            <path
                d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
                stroke={fill}
                fill="none"
                strokeWidth={1.5}
                strokeOpacity={0.8}
            />
            {/* End dot */}
            <circle cx={ex} cy={ey} r={2.5} fill={fill} />
            {/* Label text */}
            <text
                x={ex + (cos >= 0 ? 1 : -1) * 6}
                y={ey - 2}
                textAnchor={textAnchor}
                fill="#374151"
                fontSize={11}
                fontWeight="500"
            >
                {name}
            </text>
            {/* Percentage */}
            <text
                x={ex + (cos >= 0 ? 1 : -1) * 6}
                y={ey + 12}
                textAnchor={textAnchor}
                fill="#6b7280"
                fontSize={10}
            >
                {(percent * 100).toFixed(1)}%
            </text>
        </g>
    );
};

export const AllocationChart: React.FC<AllocationChartProps> = ({ holdings, type }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

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

    const formatCompact = (value: number) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
        return `₹${value}`;
    };

    if (holdings.length === 0) return null;

    return (
        <div className="flex flex-col md:flex-row gap-6">
            {/* Chart with center label and leader lines */}
            <div className="hidden md:block flex-1 h-[350px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={2}
                            dataKey="value"
                            label={renderCustomLabel}
                            labelLine={false}
                            isAnimationActive={false}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        filter: activeIndex === index ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2)) brightness(1.1)' : 'none'
                                    }}
                                    stroke={activeIndex === index ? '#fff' : 'none'}
                                    strokeWidth={activeIndex === index ? 2 : 0}
                                />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Center label - shows total */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center bg-white/90 backdrop-blur-sm rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-lg border border-gray-100">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Total</p>
                        <p className="text-base font-bold text-gray-900">{formatCompact(totalValue)}</p>
                        <p className="text-[10px] text-gray-400">{data.length} types</p>
                    </div>
                </div>
            </div>

            {/* Breakdown Table - Enhanced with hover sync */}
            <div className="flex-1 w-full">
                <div className="bg-gray-50 rounded-lg p-4 h-[350px] overflow-y-auto w-full">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        {type === 'sector' ? 'Sector' : 'Asset Class'} Breakdown
                    </h4>
                    <div className="space-y-2">
                        {data.map((item, index) => {
                            const percentage = (item.value / totalValue) * 100;
                            const isActive = index === activeIndex;
                            return (
                                <div
                                    key={item.name}
                                    className={`bg-white rounded-lg p-3 shadow-sm transition-all duration-200 cursor-pointer ${isActive ? 'shadow-md scale-[1.02]' : 'hover:shadow-md'
                                        }`}
                                    style={{
                                        borderLeft: `4px solid ${isActive ? COLORS[index % COLORS.length] : 'transparent'}`,
                                        backgroundColor: isActive ? `${COLORS[index % COLORS.length]}10` : 'white'
                                    }}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onMouseLeave={() => setActiveIndex(null)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-3 h-3 rounded-full transition-transform duration-200 ${isActive ? 'scale-125' : ''}`}
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            ></div>
                                            <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={item.name}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <span
                                            className={`text-sm font-bold transition-all duration-200 ${isActive ? 'text-base' : ''}`}
                                            style={{ color: isActive ? COLORS[index % COLORS.length] : '#111827' }}
                                        >
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="h-1.5 rounded-full transition-all duration-500"
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
