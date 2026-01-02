import React, { useMemo } from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { InvestmentHolding } from '@/types/finance';

interface PortfolioHeatmapProps {
    holdings: InvestmentHolding[];
}

const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, name, pnlPercent, value } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: (pnlPercent || 0) >= 0
                        ? `rgba(16, 185, 129, ${0.4 + (Math.min((pnlPercent || 0), 50) / 100)})` // Emerald with opacity based on intensity
                        : `rgba(239, 68, 68, ${0.4 + (Math.min(Math.abs((pnlPercent || 0)), 50) / 100)})`, // Red with opacity
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {width > 50 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={Math.min(width / 5, height / 2, 14)}
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                >
                    {name}
                </text>
            )}
            {width > 50 && height > 50 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 16}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.9)"
                    fontSize={12}
                    style={{ pointerEvents: 'none' }}
                >
                    {pnlPercent > 0 ? '+' : ''}{(pnlPercent || 0).toFixed(1)}%
                </text>
            )}
        </g>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg z-50">
                <p className="font-bold text-gray-900">{data.name}</p>
                <div className="flex justify-between items-center space-x-4 mt-1">
                    <span className="text-gray-500 text-sm">Value:</span>
                    <span className="font-medium text-gray-900">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.value)}
                    </span>
                </div>
                <div className="flex justify-between items-center space-x-4">
                    <span className="text-gray-500 text-sm">Return:</span>
                    <span className={`${data.pnlPercent >= 0 ? 'text-emerald-600' : 'text-red-600'} font-bold`}>
                        {data.pnlPercent > 0 ? '+' : ''}{data.pnlPercent.toFixed(2)}%
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export const PortfolioHeatmap: React.FC<PortfolioHeatmapProps> = ({ holdings }) => {
    const data = useMemo(() => {
        return holdings
            .filter(h => (h.current_value || 0) > 0)
            .map(h => ({
                name: h.ticker_symbol.replace('.NS', '').replace('.BO', ''),
                value: h.current_value || 0,
                pnlPercent: h.pnl_percentage || 0
            }))
            .sort((a, b) => b.value - a.value);
    }, [holdings]);

    if (holdings.length === 0) return null;

    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={data}
                    dataKey="value"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill="#8884d8"
                    content={<CustomizedContent />}
                >
                    <Tooltip content={<CustomTooltip />} />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
};
