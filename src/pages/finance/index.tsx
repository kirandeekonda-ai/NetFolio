import { useState, useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { Layout } from '@/components/layout/Layout';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { InvestmentHolding, FinanceDashboardData } from '@/types/finance';
import { investmentService } from '@/services/InvestmentService';
import { HoldingsTable } from '@/components/finance/HoldingsTable';
import { AddTransactionModal } from '@/components/finance/AddTransactionModal';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AllocationChart } from '@/components/finance/AllocationChart';

export default function FinanceDashboard() {
    const user = useUser();
    const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<FinanceDashboardData['metrics']>({
        total_invested: 0,
        current_value: 0,
        total_pnl: 0,
        total_pnl_percentage: 0
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterPerson, setFilterPerson] = useState<'All' | 'Kiran' | 'Anusha'>('All');

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
                    const livePrices = await clientMarketData.getBatchQuotes(symbols);

                    // Update holdings with live prices
                    data.forEach(h => {
                        if (livePrices[h.ticker_symbol]) {
                            h.current_price = livePrices[h.ticker_symbol];
                            // Recalculate values based on live price
                            h.current_value = h.quantity * (h.current_price || 0);
                            h.pnl_amount = (h.current_value || 0) - (h.invested_amount || 0);
                            h.pnl_percentage = (h.invested_amount || 0) > 0
                                ? (h.pnl_amount! / h.invested_amount!) * 100
                                : 0;
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
    }, [user, filterPerson]);

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

                                    <Button
                                        variant="custom"
                                        onClick={() => setIsModalOpen(true)}
                                        className="bg-white text-indigo-600 hover:bg-blue-50 border-none px-6 py-3 font-medium flex items-center space-x-2 rounded-lg shadow-sm"
                                    >
                                        <span>+ Add Investment</span>
                                    </Button>
                                </motion.div>
                            </div>
                        </div>
                    </div>


                    {/* Scorecards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

                        <Card className={`p-6 border-l-4 ${metrics.total_pnl >= 0 ? 'border-emerald-500' : 'border-red-500'}`}>
                            <p className="text-gray-500 text-sm uppercase tracking-wide font-medium">Overall P&L</p>
                            <div className="flex items-baseline space-x-2 mt-2">
                                <p className={`text-3xl font-bold ${metrics.total_pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {metrics.total_pnl >= 0 ? '+' : ''}{formatMoney(metrics.total_pnl)}
                                </p>
                                <span className={`px-2 py-0.5 rounded text-sm font-medium ${metrics.total_pnl >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                    {metrics.total_pnl_percentage.toFixed(2)}%
                                </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">Unrealized Gains</p>
                        </Card>
                    </div>

                    {/* Analytics Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <Card className="p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Sector Allocation</h3>
                            <div className="h-[300px]">
                                <AllocationChart holdings={holdings} type="sector" />
                            </div>
                        </Card>
                        <Card className="p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Allocation</h3>
                            <div className="h-[300px]">
                                <AllocationChart holdings={holdings} type="asset_class" />
                            </div>
                        </Card>
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
