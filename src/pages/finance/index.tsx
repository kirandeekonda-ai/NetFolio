import { useState, useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { Layout } from '@/components/layout/Layout';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { InvestmentHolding, FinanceDashboardData } from '@/types/finance';
import { investmentService } from '@/services/InvestmentService';
import { HoldingsTable } from '@/components/finance/HoldingsTable';
import { AddTransactionModal } from '@/components/finance/AddTransactionModal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AllocationChart } from '@/components/finance/AllocationChart';
import { PortfolioHeatmap } from '@/components/finance/PortfolioHeatmap';

export default function FinanceDashboard() {
    const user = useUser();
    const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<FinanceDashboardData['metrics']>({
        total_invested: 0,
        current_value: 0,
        total_pnl: 0,
        total_pnl_percentage: 0,
        day_change_amount: 0,
        day_change_percentage: 0
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterPerson, setFilterPerson] = useState<'All' | 'Kiran' | 'Anusha'>('All');
    const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'Sector' | 'Assets' | 'Performance'>('Sector');
    const [isExporting, setIsExporting] = useState(false);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await investmentService.getHoldings(user.id, filterPerson);

            // FETCH LIVE PRICES
            try {
                const symbols = data.map(h => h.ticker_symbol).filter(Boolean);
                if (symbols.length > 0) {
                    const { clientMarketData } = await import('@/services/ClientMarketDataService');
                    // Now returns Record<string, MarketQuote>
                    const liveQuotes = await clientMarketData.getBatchQuotes(symbols);

                    // Update holdings with live prices
                    data.forEach(h => {
                        const quote = liveQuotes[h.ticker_symbol];
                        if (quote) {
                            h.current_price = quote.price;

                            // Calculate Basic Metrics
                            h.current_value = h.quantity * (h.current_price || 0);
                            h.pnl_amount = (h.current_value || 0) - (h.invested_amount || 0);
                            h.pnl_percentage = (h.invested_amount || 0) > 0
                                ? (h.pnl_amount! / h.invested_amount!) * 100
                                : 0;

                            // Calculate Day's Change
                            // Change per share * quantity = Total Day Change Amount
                            // We use regularMarketChange if available, else calc manually from prevClose
                            const changePerShare = quote.change || (quote.price - (quote.previousClose || quote.price));

                            h.day_change_amount = changePerShare * h.quantity;
                            h.day_change_percentage = quote.changePercent || 0;
                        }
                    });
                }
            } catch (e) {
                console.error('Live price fetch failed', e);
            }

            setHoldings(data);
            setMetrics(investmentService.calculateMetrics(data));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.id, filterPerson]); // Use user?.id instead of user to prevent unnecessary re-renders

    const handleExport = async () => {
        if (!user) return;

        setIsExporting(true);
        try {
            const response = await fetch(`/api/finance/export?userId=${user.id}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            // Create and download holdings CSV
            const holdingsBlob = new Blob([data.holdings], { type: 'text/csv' });
            const holdingsUrl = URL.createObjectURL(holdingsBlob);
            const holdingsLink = document.createElement('a');
            holdingsLink.href = holdingsUrl;
            holdingsLink.download = `portfolio_holdings_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(holdingsLink);
            holdingsLink.click();
            document.body.removeChild(holdingsLink);
            URL.revokeObjectURL(holdingsUrl);

            // Small delay before second download
            await new Promise(resolve => setTimeout(resolve, 500));

            // Create and download transactions CSV
            const transactionsBlob = new Blob([data.transactions], { type: 'text/csv' });
            const transactionsUrl = URL.createObjectURL(transactionsBlob);
            const transactionsLink = document.createElement('a');
            transactionsLink.href = transactionsUrl;
            transactionsLink.download = `portfolio_transactions_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(transactionsLink);
            transactionsLink.click();
            document.body.removeChild(transactionsLink);
            URL.revokeObjectURL(transactionsUrl);

            // Show success message
            alert(`✅ Export successful!\n\n📊 Holdings: ${data.stats?.holdingsCount || 0}\n📝 Transactions: ${data.stats?.transactionsCount || 0}\n\nFiles downloaded to your Downloads folder.`);

        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export portfolio. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const [editingHolding, setEditingHolding] = useState<InvestmentHolding | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<{ tx: any, holding: InvestmentHolding } | null>(null);

    const handleSaveTransaction = async (data: any) => {
        if (!user) return;

        if (editingTransaction) {
            // Edit Transaction
            await investmentService.updateTransaction(editingTransaction.tx.id, {
                type: data.type,
                date: data.date,
                quantity: Number(data.quantity),
                price_per_unit: Number(data.price),
            });
            setEditingTransaction(null);
        } else if (editingHolding) {
            // Edit Mode (Holding)
            await investmentService.updateHolding(editingHolding.id, {
                quantity: Number(data.quantity),
                avg_price: Number(data.price),
                // Allow updating other fields too
                holder_name: data.holder_name,
                asset_class: data.asset_class,
                sector: data.sector,
                strategy_bucket: data.strategy_bucket,
                name: data.name
            });
            setEditingHolding(null);
        } else {
            // New Transaction
            const transaction = {
                type: data.type,
                date: data.date,
                quantity: data.quantity,
                price_per_unit: data.price,
                notes: ''
            };

            const holdingDetails = {
                ticker_symbol: data.ticker_symbol,
                name: data.name,
                holder_name: data.holder_name,
                asset_class: data.asset_class,
                sector: data.sector,
                strategy_bucket: data.strategy_bucket
            };

            await investmentService.addTransaction(transaction, holdingDetails);
        }
        await fetchData(); // Refresh data
    };

    const handleDelete = async (id: string) => {
        setLoading(true);
        await investmentService.deleteHolding(id);
        await fetchData();
    };

    const handleDeleteTransaction = async (id: string) => {
        setLoading(true);
        await investmentService.deleteTransaction(id);
        await fetchData();
    };

    // ...



    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    if (!user) return <div className="p-10">Please log in.</div>;

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <Head>
                    <title>Portfolio | NetFolio</title>
                </Head>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Premium Header */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                        <div className="relative px-8 py-12">
                            <div className="flex items-center justify-between">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <h1 className="text-4xl font-light text-white mb-2">Portfolio Tracker</h1>
                                    <p className="text-xl text-blue-100 font-light">
                                        Track stocks, mutual funds, and assets
                                    </p>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="flex space-x-3 items-center"
                                >
                                    {/* Person Filter */}
                                    <div className="flex bg-white/10 backdrop-blur-sm p-1 rounded-lg border border-white/20 mr-4">
                                        {(['All', 'Kiran', 'Anusha'] as const).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setFilterPerson(p)}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterPerson === p
                                                    ? 'bg-white text-indigo-900 shadow-sm'
                                                    : 'text-blue-100 hover:bg-white/10'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Analytics Links */}
                                        <Link href="/finance/performance" className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-all duration-200 border border-white/30 shadow-lg hover:shadow-xl hover:scale-105 text-sm">
                                            📈 Performance
                                        </Link>
                                        <Link href="/finance/allocation" className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-all duration-200 border border-white/30 shadow-lg hover:shadow-xl hover:scale-105 text-sm">
                                            🎯 Allocation
                                        </Link>

                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-all duration-200 border border-white/30 shadow-lg hover:shadow-xl hover:scale-105"
                                        >
                                            + Add Investment
                                        </button>
                                        <button
                                            onClick={handleExport}
                                            disabled={isExporting || holdings.length === 0}
                                            className="bg-emerald-500/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-500/30 transition-all duration-200 border border-emerald-400/30 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        >
                                            {isExporting ? '⏳ Exporting...' : '📥 Export Portfolio'}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>


                    {/* Scorecards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="p-6 border-l-4 border-blue-500">
                            <p className="text-gray-500 text-sm uppercase tracking-wide font-medium">Net Worth</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{formatMoney(metrics.current_value)}</p>
                            <p className="text-sm text-gray-400 mt-1">Total Portfolio Value</p>
                        </Card>

                        <Card className="p-6 border-l-4 border-purple-500">
                            <p className="text-gray-500 text-sm uppercase tracking-wide font-medium">Invested</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{formatMoney(metrics.total_invested)}</p>
                            <p className="text-sm text-gray-400 mt-1">Total Capital Deployed</p>
                        </Card>

                        <Card className={`p-6 border-l-4 ${metrics.day_change_amount >= 0 ? 'border-emerald-400' : 'border-rose-400'}`}>
                            <p className="text-gray-500 text-sm uppercase tracking-wide font-medium">Day's Change</p>
                            <div className="flex items-baseline space-x-2 mt-2">
                                <p className={`text-3xl font-bold ${metrics.day_change_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {metrics.day_change_amount >= 0 ? '+' : ''}{formatMoney(metrics.day_change_amount)}
                                </p>
                                <span className={`px-2 py-0.5 rounded text-sm font-medium ${metrics.day_change_amount >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {metrics.day_change_percentage.toFixed(2)}%
                                </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">Live Daily Movement</p>
                        </Card>

                        <Card className={`p-6 border-l-4 ${metrics.total_pnl >= 0 ? 'border-emerald-600' : 'border-red-600'}`}>
                            <p className="text-gray-500 text-sm uppercase tracking-wide font-medium">Overall P&L</p>
                            <div className="flex items-baseline space-x-2 mt-2">
                                <p className={`text-3xl font-bold ${metrics.total_pnl >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {metrics.total_pnl >= 0 ? '+' : ''}{formatMoney(metrics.total_pnl)}
                                </p>
                                <span className={`px-2 py-0.5 rounded text-sm font-medium ${metrics.total_pnl >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                    {metrics.total_pnl_percentage.toFixed(2)}%
                                </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">Unrealized Gains</p>
                        </Card>
                    </div>

                    {/* Analytics Tabs */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                        <div className="border-b border-gray-100 px-6 pt-4">
                            <div className="flex space-x-8">
                                {(['Sector', 'Assets', 'Performance'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveAnalyticsTab(tab)}
                                        className={`pb-4 text-sm font-medium transition-colors relative ${activeAnalyticsTab === tab
                                            ? 'text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab}
                                        {activeAnalyticsTab === tab && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-6">
                            {activeAnalyticsTab === 'Sector' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-6">Sector Allocation</h3>
                                    <div className="h-[400px]">
                                        <AllocationChart holdings={holdings} type="sector" />
                                    </div>
                                </motion.div>
                            )}

                            {activeAnalyticsTab === 'Assets' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-6">Asset Class Allocation</h3>
                                    <div className="h-[400px]">
                                        <AllocationChart holdings={holdings} type="asset_class" />
                                    </div>
                                </motion.div>
                            )}

                            {activeAnalyticsTab === 'Performance' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Portfolio Heatmap</h3>
                                        <div className="flex space-x-3 text-xs">
                                            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-emerald-500 mr-2"></span>Profit</span>
                                            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-red-500 mr-2"></span>Loss</span>
                                        </div>
                                    </div>
                                    <div className="h-[400px]">
                                        <PortfolioHeatmap holdings={holdings} />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Main Table */}
                    <div>
                        <HoldingsTable
                            holdings={holdings}
                            isLoading={loading}
                            onEdit={(h) => {
                                setEditingHolding(h);
                                setIsModalOpen(true);
                            }}
                            onDelete={handleDelete}
                            onEditTransaction={(tx, h) => {
                                setEditingTransaction({ tx, holding: h });
                                setIsModalOpen(true);
                            }}
                            onDeleteTransaction={handleDeleteTransaction}
                        />
                    </div>
                </motion.div>
            </div>

            <AddTransactionModal
                isOpen={isModalOpen}
                initialData={editingHolding || (editingTransaction ? editingTransaction.holding : null)}
                initialTransaction={editingTransaction ? editingTransaction.tx : null}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingHolding(null);
                    setEditingTransaction(null);
                }}
                onSave={handleSaveTransaction}
            />
        </Layout>
    );
}
