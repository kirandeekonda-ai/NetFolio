import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { InvestmentHolding } from '@/types/finance';

interface AllocationChartProps {
    holdings: InvestmentHolding[];
    type: 'sector' | 'asset_class';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export const AllocationChart: React.FC<AllocationChartProps> = ({ holdings, type }) => {
    const data = useMemo(() => {
        const map = new Map<string, number>();

        holdings.forEach(h => {
            const key = (type === 'sector' ? h.sector : h.asset_class) || 'Other';
            const value = h.current_value || 0;
            map.set(key, (map.get(key) || 0) + value);
        });

        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Sort descending
    }, [holdings, type]);

    if (holdings.length === 0) return null;

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
