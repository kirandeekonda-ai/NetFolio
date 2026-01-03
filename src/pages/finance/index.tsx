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
import { HoldingManagementModal } from '@/components/finance/HoldingManagementModal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AllocationChart } from '@/components/finance/AllocationChart';
import { PortfolioHeatmap } from '@/components/finance/PortfolioHeatmap';
import { DashboardInsights } from '@/components/finance/DashboardInsights';

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

                                    <div className="flex items-center gap-4">
                                        {/* Analytics Links - Outline Style */}
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                                            <Link
                                                href="/finance/performance"
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-sm font-medium hover:bg-white/20 transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                                Performance
                                            </Link>
                                            <div className="h-6 w-px bg-white/20"></div>
                                            <Link
                                                href="/finance/allocation"
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-sm font-medium hover:bg-white/20 transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                                </svg>
                                                Allocation
                                            </Link>
                                        </div>

                                        {/* Action Buttons - Solid Style */}
                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="flex items-center gap-2 bg-white text-indigo-600 px-5 py-2.5 rounded-lg font-semibold hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add Investment
                                        </button>
                                        <button
                                            onClick={handleExport}
                                            disabled={isExporting || holdings.length === 0}
                                            className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        >
                                            {isExporting ? (
                                                <>
                                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Exporting...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    Export Portfolio
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>


                    {/* Scorecards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 shadow-xl"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-white/90 text-sm font-medium uppercase tracking-wide">Net Worth</p>
                                </div>
                                <p className="text-4xl font-bold text-white mb-1">{formatMoney(metrics.current_value)}</p>
                                <p className="text-white/70 text-sm">Total Portfolio Value</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-6 shadow-xl"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <p className="text-white/90 text-sm font-medium uppercase tracking-wide">Invested</p>
                                </div>
                                <p className="text-4xl font-bold text-white mb-1">{formatMoney(metrics.total_invested)}</p>
                                <p className="text-white/70 text-sm">Total Capital Deployed</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className={`relative overflow-hidden rounded-2xl ${metrics.day_change_amount >= 0
                                ? 'bg-gradient-to-br from-emerald-400 to-teal-600'
                                : 'bg-gradient-to-br from-rose-400 to-red-600'
                                } p-6 shadow-xl`}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <p className="text-white/90 text-sm font-medium uppercase tracking-wide">Day's Change</p>
                                </div>
                                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                    <p className="text-3xl font-bold text-white">
                                        {metrics.day_change_amount >= 0 ? '+' : ''}{formatMoney(metrics.day_change_amount)}
                                    </p>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white whitespace-nowrap">
                                        {metrics.day_change_percentage >= 0 ? '+' : ''}{metrics.day_change_percentage.toFixed(2)}%
                                    </span>
                                </div>
                                <p className="text-white/70 text-sm">Live Daily Movement</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className={`relative overflow-hidden rounded-2xl ${metrics.total_pnl >= 0
                                ? 'bg-gradient-to-br from-green-500 to-emerald-700'
                                : 'bg-gradient-to-br from-red-500 to-rose-700'
                                } p-6 shadow-xl`}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <p className="text-white/90 text-sm font-medium uppercase tracking-wide">Overall P&L</p>
                                </div>
                                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                    <p className="text-3xl font-bold text-white">
                                        {metrics.total_pnl >= 0 ? '+' : ''}{formatMoney(metrics.total_pnl)}
                                    </p>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white whitespace-nowrap">
                                        {metrics.total_pnl >= 0 ? '+' : ''}{metrics.total_pnl_percentage.toFixed(2)}%
                                    </span>
                                </div>
                                <p className="text-white/70 text-sm">Unrealized Gains</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Dashboard Insights */}
                    <DashboardInsights holdings={holdings} />

                    {/* Analytics Charts Section */}
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
                                // Don't set isModalOpen - HoldingManagementModal uses editingHolding
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

            {/* Add Investment Modal - for NEW investments only */}
            <AddTransactionModal
                isOpen={isModalOpen && !editingHolding}
                initialData={editingTransaction ? editingTransaction.holding : null}
                initialTransaction={editingTransaction ? editingTransaction.tx : null}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingTransaction(null);
                }}
                onSave={handleSaveTransaction}
            />

            {/* Holding Management Modal - for EXISTING holdings */}
            <HoldingManagementModal
                isOpen={!!editingHolding}
                holding={editingHolding}
                onClose={() => setEditingHolding(null)}
                onAddTransaction={async (data) => {
                    // Add new transaction to existing holding
                    const transaction = {
                        type: data.type,
                        date: data.date,
                        quantity: Number(data.quantity),
                        price_per_unit: Number(data.price),
                        notes: data.notes || ''
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
                    await fetchData();
                }}
                onEditTransaction={async (txId, data) => {
                    // Edit existing transaction
                    await investmentService.updateTransaction(txId, {
                        type: data.type,
                        date: data.date,
                        quantity: Number(data.quantity),
                        price_per_unit: Number(data.price),
                    });
                    await fetchData();
                }}
                onDeleteTransaction={async (txId) => {
                    await handleDeleteTransaction(txId);
                }}
                onUpdateDetails={async (data) => {
                    // Update holding details
                    await investmentService.updateHolding(data.id, {
                        name: data.name,
                        sector: data.sector,
                        asset_class: data.asset_class,
                        strategy_bucket: data.strategy_bucket,
                        holder_name: data.holder_name
                    });
                    await fetchData();
                    setEditingHolding(null);
                }}
            />
        </Layout>
    );
}
