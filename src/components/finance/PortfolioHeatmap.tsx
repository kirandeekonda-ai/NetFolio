import React, { useMemo } from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { InvestmentHolding } from '@/types/finance';

interface PortfolioHeatmapProps {
    holdings: InvestmentHolding[];
}

const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, name, pnlPercent, value } = props;

    // Function to truncate text
    const truncateText = (text: string, maxWidth: number, fontSize: number) => {
        if (!text) return '';
        const charWidth = fontSize * 0.6; // Approximation for average character width
        const maxChars = Math.floor(maxWidth / charWidth);
        if (text.length > maxChars && maxChars > 3) {
            return text.substring(0, maxChars - 3) + '...';
        }
        return text;
    };

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
            {name && (
                <text
                    x={x + 4}
                    y={y + 18}
                    fontSize={Math.max(10, Math.min(14, width / 8))}
                    fill="white"
                    fontWeight="600"
                    style={{
                        pointerEvents: 'none',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                >
                    {/* Truncate name to fit box width */}
                    {(() => {
                        const maxChars = Math.floor(width / 7);
                        return name.length > maxChars ? name.substring(0, maxChars - 2) + '..' : name;
                    })()}
                </text>
            )}
            {pnlPercent !== undefined && (
                <text
                    x={x + 4}
                    y={y + 34}
                    fontSize={Math.max(9, Math.min(12, width / 10))}
                    fill="white"
                    fontWeight="500"
                    style={{
                        pointerEvents: 'none',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                >
                    {pnlPercent >= 0 ? '+' : ''}{(pnlPercent || 0).toFixed(1)}%
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
                name: h.name || 'Unknown', // Use investment name instead of symbol
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
