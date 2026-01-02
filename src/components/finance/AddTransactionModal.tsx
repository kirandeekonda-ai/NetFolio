import React, { useState } from 'react';
// Simplistic Modal wrapper if HeadlessUI isn't available, but usually it is in Next.js stacks.
import { motion, AnimatePresence } from 'framer-motion';

// Simplistic Modal wrapper if HeadlessUI isn't available, but usually it is in Next.js stacks.
// For safety, I will build a custom one to avoid dependency issues.

import { InvestmentHolding } from '@/types/finance';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: InvestmentHolding | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        ticker_symbol: '',
        name: '',
        holder_name: 'Kiran',
        type: 'buy',
        asset_class: 'Equity',
        sector: '',
        strategy_bucket: 'Long',
        date: new Date().toISOString().split('T')[0],
        quantity: '',
        price: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false); // Fix for overwrite bug

    // Populate form on open/change of initialData
    React.useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ticker_symbol: initialData.ticker_symbol,
                    name: initialData.name,
                    holder_name: initialData.holder_name,
                    type: 'buy', // Default to buy for edit? Or maybe we are just editing the holding details.
                    asset_class: initialData.asset_class || 'Equity',
                    sector: initialData.sector || '',
                    strategy_bucket: initialData.strategy_bucket || 'Long',
                    date: new Date().toISOString().split('T')[0], // Reset date for new transaction
                    quantity: String(initialData.quantity),
                    price: String(initialData.avg_price), // For edit, this is Avg Price
                });
            } else {
                // Reset
                setFormData({
                    ticker_symbol: '',
                    name: '',
                    holder_name: 'Kiran',
                    type: 'buy',
                    asset_class: 'Equity',
                    sector: '',
                    strategy_bucket: 'Long',
                    date: new Date().toISOString().split('T')[0],
                    quantity: '',
                    price: '',
                });
            }
        }
    }, [isOpen, initialData]);

    // NEW state for search
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    // Ref to prevent onBlur from overriding selection
    const selectionProcessing = React.useRef(false);

    const handleSymbolSearch = async (query: string) => {
        setFormData({ ...formData, ticker_symbol: query.toUpperCase() });
        if (query.length > 2) {
            try {
                // Using the new client service
                const { clientMarketData } = await import('@/services/ClientMarketDataService');
                const results = await clientMarketData.search(query);
                setSearchResults(results);
                setShowResults(true);
            } catch (e) {
                console.error(e);
            }
        } else {
            setShowResults(false);
        }
    };

    const selectSymbol = async (symbolData: any) => {
        setShowResults(false);
        setIsLoadingProfile(true);
        // Autofill Price and Sector
        try {
            const { clientMarketData } = await import('@/services/ClientMarketDataService');
            const profile = await clientMarketData.getProfile(symbolData.symbol);

            setFormData(prev => ({
                ...prev,
                ticker_symbol: symbolData.symbol,
                name: symbolData.name || symbolData.longname || symbolData.shortname || prev.name,
                sector: profile?.sector || '', // Keep manual if not found? No, profile.sector usually accurate.
                price: profile?.price ? String(profile.price) : prev.price,
                asset_class: (symbolData.type === 'ETF' || symbolData.quoteType === 'ETF') ? 'ETF' :
                    (symbolData.type === 'MUTUALFUND' || symbolData.quoteType === 'MUTUALFUND') ? 'Mutual Fund' :
                        'Equity'
            }));
        } catch (e) {
            console.error('Failed to fetch profile', e);
            // Fallback
            setFormData(prev => ({
                ...prev,
                ticker_symbol: symbolData.symbol,
                name: symbolData.name
            }));
        } finally {
            setIsLoadingProfile(false);
            // Small delay before releasing lock to ensure other events clear
            setTimeout(() => {
                selectionProcessing.current = false;
            }, 500);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                ...formData,
                quantity: Number(formData.quantity),
                price: Number(formData.price),
                name: formData.name || formData.ticker_symbol // Fallback name
            });
            onClose();
            // Reset form
            setFormData({
                ticker_symbol: '',
                name: '',
                holder_name: 'Kiran',
                type: 'buy',
                asset_class: 'Equity',
                sector: '',
                strategy_bucket: 'Long',
                date: new Date().toISOString().split('T')[0],
                quantity: '',
                price: '',
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">{initialData ? 'Edit Holding' : 'Add Investment'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol (e.g., ITC.NS)</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                                value={formData.ticker_symbol}
                                onChange={(e) => handleSymbolSearch(e.target.value)}
                                onBlur={() => {
                                    // Delay to allow click on dropdown
                                    setTimeout(() => {
                                        if (selectionProcessing.current) return;

                                        setShowResults(false);
                                        // If user typed something but didn't select, try to fetch details for what they typed
                                        if (formData.ticker_symbol && !formData.name) {
                                            selectSymbol({ symbol: formData.ticker_symbol, name: '', type: 'EQUITY' });
                                        }
                                    }, 200);
                                }}
                                placeholder="ITC.NS"
                            />
                            {/* Search Results Dropdown */}
                            {showResults && searchResults.length > 0 && (
                                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {searchResults.map((result, idx) => (
                                        <li
                                            key={idx}
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                            onClick={() => selectSymbol(result)}
                                        >
                                            <div className="font-medium text-gray-900">{result.name}</div>
                                            <div className="text-gray-500 text-xs flex justify-between">
                                                <span>{result.symbol}</span>
                                                <span className="uppercase">{result.type === 'MUTUALFUND' ? 'Mutual Fund' : result.type}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="ITC Limited"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                value={formData.holder_name}
                                onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                            >
                                <option value="Kiran">Kiran</option>
                                <option value="Anusha">Anusha</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Class</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                value={formData.asset_class}
                                onChange={(e) => setFormData({ ...formData, asset_class: e.target.value })}
                            >
                                <option value="Equity">Equity</option>
                                <option value="Mutual Fund">Mutual Fund</option>
                                <option value="Debt Mutual Fund">Debt Mutual Fund</option>
                                <option value="ETF">ETF</option>
                                <option value="Gold">Gold</option>
                                <option value="Bonds">Bonds</option>
                                <option value="REIT">REIT</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="buy">Buy</option>
                                <option value="sell">Sell</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sector (e.g. FMCG)</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                value={formData.sector}
                                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                placeholder="Auto-filled later"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bucket (Strategy)</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                value={formData.strategy_bucket}
                                onChange={(e) => setFormData({ ...formData, strategy_bucket: e.target.value })}
                            >
                                <option value="Long">Long Term</option>
                                <option value="Swing">Swing Trade</option>
                                <option value="Opportunity">Opportunity</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                                type="number"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg outline-none ${isLoadingProfile ? 'bg-gray-100 text-gray-400' : ''}`}
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="0.00"
                                    disabled={isLoadingProfile}
                                />
                                {isLoadingProfile && (
                                    <span className="absolute right-3 top-2 text-xs text-blue-500 animate-pulse">Fetching...</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : (initialData ? 'Update Holding' : 'Add Investment')}
                        </button>
                    </div>

                </form>
            </motion.div>
        </div>
    );
};
