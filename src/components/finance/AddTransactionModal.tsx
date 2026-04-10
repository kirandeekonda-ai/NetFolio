import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { InvestmentHolding } from '@/types/finance';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: InvestmentHolding | null;
    initialTransaction?: any | null; // Cheap way to avoid import cycle or duplicate types
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onSave, initialData, initialTransaction }) => {
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
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Ref to prevent onBlur from overriding selection
    const selectionProcessing = useRef(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Populate form on open/change of initialData
    React.useEffect(() => {
        if (isOpen) {
            if (initialTransaction) {
                // Edit Transaction Mode
                setFormData({
                    ticker_symbol: initialData?.ticker_symbol || '',
                    name: initialData?.name || '',
                    holder_name: initialData?.holder_name || 'Kiran',
                    type: initialTransaction.type,
                    asset_class: initialData?.asset_class || 'Equity',
                    sector: initialData?.sector || '',
                    strategy_bucket: initialData?.strategy_bucket || 'Long',
                    date: initialTransaction.date ? new Date(initialTransaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    quantity: String(initialTransaction.quantity),
                    price: String(initialTransaction.price_per_unit),
                });
            } else if (initialData) {
                // Edit Holding / Add Transaction to Holding Mode
                setFormData({
                    ticker_symbol: initialData.ticker_symbol,
                    name: initialData.name,
                    holder_name: initialData.holder_name,
                    type: 'buy',
                    asset_class: initialData.asset_class || 'Equity',
                    sector: initialData.sector || '',
                    strategy_bucket: initialData.strategy_bucket || 'Long',
                    date: new Date().toISOString().split('T')[0],
                    quantity: String(initialData.quantity), // Default to current qty? Or 0? Maybe 0 for new tx.
                    price: String(initialData.avg_price),
                });
            } else {
                // Reset - New Investment
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
    }, [isOpen, initialData, initialTransaction]);

    // NEW state for search
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    const doSearch = useCallback(async (query: string) => {
        if (query.length < 2) { setShowResults(false); setSearchResults([]); return; }
        setIsSearching(true);
        try {
            const { clientMarketData } = await import('@/services/ClientMarketDataService');
            const results = await clientMarketData.search(query);
            if (Array.isArray(results) && results.length > 0) {
                setSearchResults(results);
                setShowResults(true);
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        } catch (e) {
            console.error('Search error:', e);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSymbolSearch = (query: string) => {
        setFormData(prev => ({ ...prev, ticker_symbol: query.toUpperCase() }));
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => doSearch(query), 350);
    };

    const handleNameSearch = (query: string) => {
        setFormData(prev => ({ ...prev, name: query }));
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => doSearch(query), 350);
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
                    <h3 className="text-lg font-semibold text-gray-900">
                        {initialTransaction ? 'Edit Transaction' : (initialData ? 'Add / Edit Investment' : 'Add Investment')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol (e.g., ITC.NS)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    disabled={!!initialData || !!initialTransaction}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase ${initialData || initialTransaction ? 'bg-gray-100 text-gray-500' : ''}`}
                                    value={formData.ticker_symbol}
                                    onChange={(e) => handleSymbolSearch(e.target.value)}
                                    onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            if (selectionProcessing.current) return;
                                            setShowResults(false);
                                            if (formData.ticker_symbol && !formData.name) {
                                                selectSymbol({ symbol: formData.ticker_symbol, name: '', type: 'EQUITY' });
                                            }
                                        }, 200);
                                    }}
                                    placeholder="ITC.NS"
                                />
                                {isSearching && (
                                    <div className="absolute right-2 top-2.5">
                                        <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                    </div>
                                )}
                            </div>
                            {/* Search Results Dropdown */}
                            {showResults && searchResults.length > 0 && (
                                <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                    {searchResults.map((result, idx) => (
                                        <li
                                            key={idx}
                                            className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0 border-gray-50"
                                            onMouseDown={() => { selectionProcessing.current = true; selectSymbol(result); }}
                                        >
                                            <div className="font-medium text-gray-900">
                                                {[result.name, result.longname, result.shortname, result.symbol]
                                                    .find(v => v && v !== 'null' && v.trim() !== '') || result.symbol}
                                            </div>
                                            <div className="text-gray-500 text-xs flex justify-between mt-0.5">
                                                <span className="font-mono">{result.symbol}</span>
                                                <span className="capitalize text-blue-600">{result.type === 'MUTUALFUND' ? 'Mutual Fund' : result.type === 'ETF' ? 'ETF' : 'Equity'}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={(e) => handleNameSearch(e.target.value)}
                                    onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                                    onBlur={() => setTimeout(() => { if (!selectionProcessing.current) setShowResults(false); }, 200)}
                                    placeholder="Search by company name..."
                                />
                                {isSearching && (
                                    <div className="absolute right-2 top-2.5">
                                        <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                    </div>
                                )}
                            </div>
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
                            {isSubmitting ? 'Saving...' : (initialTransaction ? 'Update Transaction' : (initialData ? 'Update Holding' : 'Add Investment'))}
                        </button>
                    </div>

                </form>
            </motion.div>
        </div>
    );
};
