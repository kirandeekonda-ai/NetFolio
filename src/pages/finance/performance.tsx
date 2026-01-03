import { useState, useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { Layout } from '@/components/layout/Layout';
import Head from 'next/head';
import { InvestmentHolding } from '@/types/finance';
import { investmentService } from '@/services/InvestmentService';
import { PerformanceTab } from '@/components/finance/PerformanceTab';
import Link from 'next/link';

export default function PerformancePage() {
    const user = useUser();
    const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const data = await investmentService.getHoldings(user.id, 'All');

                // Fetch live prices
                try {
                    const symbols = data.map(h => h.ticker_symbol).filter(Boolean);
                    if (symbols.length > 0) {
                        const { clientMarketData } = await import('@/services/ClientMarketDataService');
                        const liveQuotes = await clientMarketData.getBatchQuotes(symbols);

                        data.forEach(h => {
                            const quote = liveQuotes[h.ticker_symbol];
                            if (quote) {
                                h.current_price = quote.price;
                                h.previous_close = quote.previousClose;
                                h.last_price_update = quote.timestamp;
                            }
                        });
                    }
                } catch (err) {
                    console.error('Failed to fetch live prices:', err);
                }

                setHoldings(data);
            } catch (error) {
                console.error('Error fetching holdings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    if (!user) return <div className="p-10">Please log in.</div>;

    return (
        <Layout>
            <Head>
                <title>Performance Analysis | NetFolio</title>
            </Head>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/finance" className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">Performance Analysis</h1>
                    </div>
                    <p className="text-gray-600">Analyze your investment performance with detailed metrics and insights</p>
                </div>

                {/* Performance Component */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="text-gray-500">Loading...</div>
                    </div>
                ) : (
                    <PerformanceTab holdings={holdings} />
                )}
            </div>
        </Layout>
    );
}
