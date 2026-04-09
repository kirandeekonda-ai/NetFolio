import React, { useState, useMemo } from 'react';
import { InvestmentHolding } from '@/types/finance';
import { motion, AnimatePresence } from 'framer-motion';
import { FilterDropdown } from './FilterDropdown';

interface HoldingsTableProps {
    holdings: InvestmentHolding[];
    isLoading: boolean;
    onEdit: (holding: InvestmentHolding) => void;
    onDelete: (id: string) => void;
    onEditTransaction: (tx: any, holding: InvestmentHolding) => void;
    onDeleteTransaction: (txId: string) => void;
}

/** Flat transaction with its parent holding metadata */
interface FlatTransaction {
    id: string;
    holdingId: string;
    holdingName: string;
    tickerSymbol: string;
    holderName: string;
    assetClass: string;
    type: 'buy' | 'sell' | 'dividend';
    date: string;
    quantity: number;
    price_per_unit: number;
    amount: number;
    holding: InvestmentHolding;
    tx: any;
}

const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDecimal = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(value);
};

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, isLoading, onEdit, onDelete, onEditTransaction, onDeleteTransaction }) => {
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortColumn, setSortColumn] = useState<keyof InvestmentHolding | 'pnl' | 'currentValue' | 'investedValue' | 'xirr' | 'cagr'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [pnlView, setPnlView] = useState<'day' | 'total'>('day'); // State for P&L toggle
    const [activeView, setActiveView] = useState<'holdings' | 'transactions'>('holdings'); // View toggle
    const [txSearchQuery, setTxSearchQuery] = useState(''); // Transaction search
    const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'buy' | 'sell' | 'dividend'>('all'); // Tx type filter

    // Multi-select filters
    const [selectedInvestments, setSelectedInvestments] = useState<Set<string>>(new Set());
    const [selectedAssetClasses, setSelectedAssetClasses] = useState<Set<string>>(new Set());
    const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set());
    const [selectedPersons, setSelectedPersons] = useState<Set<string>>(new Set());

    const toggleRow = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRowId(expandedRowId === id ? null : id);
    };

    const handleSort = (column: keyof InvestmentHolding | 'pnl' | 'currentValue' | 'investedValue' | 'xirr' | 'cagr') => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Extract unique values for filters
    const uniqueInvestments = Array.from(new Set(holdings.map(h => h.name).filter(Boolean))) as string[];
    const uniqueAssetClasses = Array.from(new Set(holdings.map(h => h.asset_class).filter(Boolean))) as string[];
    const uniqueSectors = Array.from(new Set(holdings.map(h => h.sector).filter(Boolean))) as string[];
    const uniquePersons = Array.from(new Set(holdings.map(h => h.holder_name).filter(Boolean))) as string[];

    // Toggle filter selection
    const toggleFilter = (filterSet: Set<string>, setFilterSet: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
        const newSet = new Set(filterSet);
        if (newSet.has(value)) {
            newSet.delete(value);
        } else {
            newSet.add(value);
        }
        setFilterSet(newSet);
    };

    // Clear all filters
    const clearAllFilters = () => {
        setSelectedInvestments(new Set());
        setSelectedAssetClasses(new Set());
        setSelectedSectors(new Set());
        setSelectedPersons(new Set());
        setSearchQuery('');
    };

    const hasActiveFilters = selectedInvestments.size > 0 || selectedAssetClasses.size > 0 ||
        selectedSectors.size > 0 || selectedPersons.size > 0;

    // Filter holdings based on search query and selected filters
    const filteredHoldings = holdings.filter(holding => {
        // Search filter
        const matchesSearch = !searchQuery ||
            holding.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            holding.ticker_symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            holding.sector?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            holding.holder_name?.toLowerCase().includes(searchQuery.toLowerCase());

        // Multi-select filters
        const matchesInvestment = selectedInvestments.size === 0 || selectedInvestments.has(holding.name || '');
        const matchesAssetClass = selectedAssetClasses.size === 0 || selectedAssetClasses.has(holding.asset_class || '');
        const matchesSector = selectedSectors.size === 0 || selectedSectors.has(holding.sector || '');
        const matchesPerson = selectedPersons.size === 0 || selectedPersons.has(holding.holder_name || '');

        return matchesSearch && matchesInvestment && matchesAssetClass && matchesSector && matchesPerson;
    });

    // Sort filtered holdings
    const sortedHoldings = [...filteredHoldings].sort((a, b) => {
        let aValue: any, bValue: any;

        if (sortColumn === 'pnl') {
            aValue = ((a.quantity * (a.current_price || a.avg_price)) - (a.quantity * a.avg_price));
            bValue = ((b.quantity * (b.current_price || b.avg_price)) - (b.quantity * b.avg_price));
        } else if (sortColumn === 'currentValue') {
            aValue = a.quantity * (a.current_price || a.avg_price);
            bValue = b.quantity * (b.current_price || b.avg_price);
        } else if (sortColumn === 'investedValue') {
            aValue = a.quantity * a.avg_price;
            bValue = b.quantity * b.avg_price;
        } else {
            aValue = a[sortColumn];
            bValue = b[sortColumn];
        }

        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Build flat transactions list (latest first)
    const allTransactions = useMemo((): FlatTransaction[] => {
        const txList: FlatTransaction[] = [];
        holdings.forEach(h => {
            (h.transactions || []).forEach(tx => {
                txList.push({
                    id: tx.id,
                    holdingId: h.id,
                    holdingName: h.name,
                    tickerSymbol: h.ticker_symbol,
                    holderName: h.holder_name,
                    assetClass: h.asset_class,
                    type: tx.type,
                    date: tx.date,
                    quantity: tx.quantity,
                    price_per_unit: tx.price_per_unit,
                    amount: tx.quantity * tx.price_per_unit,
                    holding: h,
                    tx,
                });
            });
        });
        // Sort latest first
        return txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [holdings]);

    // Compute last entered date
    const lastEntryDate = useMemo(() => {
        if (allTransactions.length === 0) return null;
        return new Date(allTransactions[0].date);
    }, [allTransactions]);

    // Filter transactions
    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(tx => {
            const q = txSearchQuery.toLowerCase();
            const matchesSearch = !q ||
                tx.holdingName?.toLowerCase().includes(q) ||
                tx.tickerSymbol?.toLowerCase().includes(q) ||
                tx.holderName?.toLowerCase().includes(q) ||
                tx.assetClass?.toLowerCase().includes(q);
            const matchesType = txTypeFilter === 'all' || tx.type === txTypeFilter;
            return matchesSearch && matchesType;
        });
    }, [allTransactions, txSearchQuery, txTypeFilter]);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Loading portfolio data...</div>;
    }

    if (holdings.length === 0) {
        return (
            <div className="p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 mb-2">No investments found.</p>
                <p className="text-sm text-gray-400">Add your first custom investment to start tracking.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* View Toggle + Last Entry Banner */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveView('holdings')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeView === 'holdings'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        📊 Holdings
                    </button>
                    <button
                        onClick={() => setActiveView('transactions')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeView === 'transactions'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        📋 All Transactions
                        {allTransactions.length > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                {allTransactions.length}
                            </span>
                        )}
                    </button>
                </div>
                {lastEntryDate && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                            <span className="font-medium">Last entry:</span>{' '}
                            {lastEntryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                )}
            </div>

            {/* HOLDINGS VIEW */}
            {activeView === 'holdings' && (
            <>
            {/* Filter Dropdowns */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Investment Filter */}
                <FilterDropdown
                    label="Investment"
                    options={uniqueInvestments}
                    selected={selectedInvestments}
                    onToggle={(value) => toggleFilter(selectedInvestments, setSelectedInvestments, value)}
                />

                {/* Asset Class Filter */}
                <FilterDropdown
                    label="Asset Class"
                    options={uniqueAssetClasses}
                    selected={selectedAssetClasses}
                    onToggle={(value) => toggleFilter(selectedAssetClasses, setSelectedAssetClasses, value)}
                />

                {/* Sector Filter */}
                <FilterDropdown
                    label="Sector"
                    options={uniqueSectors}
                    selected={selectedSectors}
                    onToggle={(value) => toggleFilter(selectedSectors, setSelectedSectors, value)}
                />

                {/* Person Filter */}
                <FilterDropdown
                    label="Person"
                    options={uniquePersons}
                    selected={selectedPersons}
                    onToggle={(value) => toggleFilter(selectedPersons, setSelectedPersons, value)}
                />

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Search by name, ticker, sector, or person..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 outline-none text-gray-700 placeholder-gray-400"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
                <div className="text-sm text-gray-500">
                    {filteredHoldings.length} of {holdings.length}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="w-8 px-3 py-3"></th>
                            <th
                                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-1">
                                    Investment
                                    {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('holder_name')}
                            >
                                <div className="flex items-center gap-1">
                                    Person
                                    {sortColumn === 'holder_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('sector')}
                            >
                                <div className="flex items-center gap-1">
                                    Sector
                                    {sortColumn === 'sector' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('asset_class')}
                            >
                                <div className="flex items-center gap-1">
                                    Asset Class
                                    {sortColumn === 'asset_class' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('quantity')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Units
                                    {sortColumn === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('avg_price')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Avg Price
                                    {sortColumn === 'avg_price' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('investedValue')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Invested Val
                                    {sortColumn === 'investedValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('current_price')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    CMP
                                    {sortColumn === 'current_price' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('currentValue')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Cur. Val
                                    {sortColumn === 'currentValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors w-[140px]"
                                onClick={() => handleSort('pnl')}
                            >
                                <div className="flex items-center justify-end gap-2">
                                    <span>P&L</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPnlView(pnlView === 'day' ? 'total' : 'day');
                                            }}
                                            className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors w-12 text-center font-medium"
                                            title={pnlView === 'day' ? 'Switch to Total P&L' : 'Switch to Day P&L'}
                                        >
                                            {pnlView === 'day' ? 'Day' : 'Total'}
                                        </button>
                                        {sortColumn === 'pnl' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </div>
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('xirr')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    XIRR
                                    {sortColumn === 'xirr' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('cagr')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    CAGR
                                    {sortColumn === 'cagr' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th className="relative px-3 py-3 w-20">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedHoldings.map((h) => {
                            const isExpanded = expandedRowId === h.id;

                            // Calculate Total P&L
                            const invested = h.quantity * h.avg_price;
                            const current = h.quantity * (h.current_price || h.avg_price);
                            const totalPnl = current - invested;
                            const totalPnlPercent = invested > 0 ? (totalPnl / invested) * 100 : 0;

                            // Calculate Day P&L (only if previous_close is available)
                            const hasPreviousClose = h.previous_close !== undefined && h.previous_close !== null;
                            const dayPnl = hasPreviousClose
                                ? h.quantity * ((h.current_price || h.avg_price) - h.previous_close!)
                                : 0;
                            const dayPnlPercent = hasPreviousClose && h.previous_close! > 0
                                ? (((h.current_price || h.avg_price) - h.previous_close!) / h.previous_close!) * 100
                                : 0;

                            // Select which P&L to display
                            const pnl = pnlView === 'day' ? dayPnl : totalPnl;
                            const pnlPercent = pnlView === 'day' ? dayPnlPercent : totalPnlPercent;
                            const isProfit = pnl >= 0;
                            const showNA = pnlView === 'day' && !hasPreviousClose;

                            return (
                                <React.Fragment key={h.id}>
                                    <tr
                                        onClick={() => onEdit(h)}
                                        className={`hover:bg-gray-50 cursor-pointer group transition-colors ${isExpanded ? 'bg-gray-50' : ''} ${pnlPercent > 20 ? 'bg-emerald-50/40 hover:bg-emerald-50' :
                                            pnlPercent < -20 ? 'bg-red-50/40 hover:bg-red-50' : ''
                                            }`}
                                    >
                                        {/* Expand Toggle */}
                                        <td className="px-3 py-4 text-center">
                                            <button
                                                onClick={(e) => toggleRow(h.id, e)}
                                                className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className={`h-4 w-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </td>

                                        {/* Investment */}
                                        <td className="px-3 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 max-w-[220px]">
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate" title={h.name}>{h.name}</span>
                                                        {pnlPercent > 50 && <span className="text-xs">🔥</span>}
                                                        {pnlPercent < -30 && <span className="text-xs">⚠️</span>}
                                                    </div>
                                                    <span className="text-xs text-gray-500">{h.ticker_symbol}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Person */}
                                        <td className="px-3 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${h.holder_name === 'Kiran' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {h.holder_name}
                                            </span>
                                        </td>

                                        {/* Sector */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 max-w-[120px] truncate" title={h.sector}>
                                            {h.sector || '-'}
                                        </td>

                                        {/* Asset Class */}
                                        <td className="px-3 py-2 text-sm text-gray-900">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                {h.asset_class || 'N/A'}
                                            </span>
                                        </td>

                                        {/* Units */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                                            {Number(h.quantity).toFixed(2)}
                                        </td>

                                        {/* Avg Price */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 text-right font-mono">
                                            {formatDecimal(h.avg_price)}
                                        </td>

                                        {/* Invested Value */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-mono font-medium">
                                            {formatValue(h.quantity * h.avg_price)}
                                        </td>

                                        {/* CMP */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-mono font-medium">
                                            {formatDecimal(h.current_price || h.avg_price)}
                                        </td>

                                        {/* Current Value */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold font-mono">
                                            {formatValue(h.current_value || 0)}
                                        </td>

                                        {/* P&L */}
                                        <td className={`px-3 py-4 whitespace-nowrap text-sm text-right font-medium font-mono border-l-4 ${isProfit ? 'border-l-emerald-500 bg-emerald-50/30' : 'border-l-red-500 bg-red-50/30'}`}>
                                            {showNA ? (
                                                <div className="text-gray-400 text-xs italic">
                                                    <div>N/A</div>
                                                    <div>(No previous close)</div>
                                                </div>
                                            ) : (
                                                <div className={isProfit ? 'text-emerald-700' : 'text-red-700'}>
                                                    <div>{isProfit ? '+' : ''}{formatValue(pnl)}</div>
                                                    <div className="text-xs opacity-80">
                                                        ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)
                                                    </div>
                                                </div>
                                            )}
                                        </td>

                                        {/* XIRR */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-mono">
                                            {h.xirr !== undefined && h.xirr !== null ? (
                                                <span className={h.xirr >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                    {Math.abs(h.xirr) > 100 ? '>10,000%' : (h.xirr * 100).toFixed(2) + '%'}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>

                                        {/* CAGR */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-mono">
                                            {h.cagr !== undefined && h.cagr !== null ? (
                                                <span
                                                    className={h.cagr >= 0 ? 'text-emerald-600' : 'text-red-600'}
                                                    title={`Based on start date: ${new Date(h.investment_date).toLocaleDateString()}`}
                                                >
                                                    {Math.abs(h.cagr) > 100 ? '>10,000%' : (h.cagr * 100).toFixed(2) + '%'}
                                                </span>
                                            ) : (
                                                <span
                                                    className="text-gray-300 cursor-help"
                                                    title={`Held: ~${((h.days_held || 0) / 30.44).toFixed(1)} months (Requires > 3 months)`}
                                                >
                                                    -
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEdit(h);
                                                    }}
                                                    className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-colors"
                                                    title="Edit Holding"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Are you sure you want to delete this holding?')) onDelete(h.id);
                                                    }}
                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Delete Holding"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded History Row */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.tr
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-gray-50"
                                            >
                                                <td colSpan={13} className="px-3 py-3">
                                                    <div className="ml-8 p-4 bg-white rounded-lg border border-gray-200 shadow-inner">
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Transaction History</h4>
                                                        {!h.transactions || h.transactions.length === 0 ? (
                                                            <div className="text-sm text-gray-500 italic">No historical transactions found.</div>
                                                        ) : (
                                                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                                                <thead>
                                                                    <tr className="text-gray-500">
                                                                        <th className="text-left font-medium py-2">Date</th>
                                                                        <th className="text-left font-medium py-2">Type</th>
                                                                        <th className="text-right font-medium py-2">Qty</th>
                                                                        <th className="text-right font-medium py-2">Price</th>
                                                                        <th className="text-right font-medium py-2">Amount</th>
                                                                        <th className="text-right font-medium py-2 w-24">Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-50">
                                                                    {h.transactions.map((tx) => (
                                                                        <tr key={tx.id} className="group/tx hover:bg-gray-100 transition-colors">
                                                                            <td className="py-2 text-gray-900">{new Date(tx.date).toLocaleDateString()}</td>
                                                                            <td className="py-2">
                                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                                                    {tx.type.toUpperCase()}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2 text-right font-mono">{tx.quantity}</td>
                                                                            <td className="py-2 text-right font-mono">{formatDecimal(tx.price_per_unit)}</td>
                                                                            <td className="py-2 text-right font-mono text-gray-600">{formatValue(tx.quantity * tx.price_per_unit)}</td>
                                                                            <td className="py-2 text-right">
                                                                                <div className="flex justify-end space-x-1 transition-opacity">
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            onEditTransaction(tx, h);
                                                                                        }}
                                                                                        className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                                                                                        title="Edit Transaction"
                                                                                    >
                                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                                        </svg>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (confirm('Delete this transaction?')) onDeleteTransaction(tx.id);
                                                                                        }}
                                                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                                                        title="Delete Transaction"
                                                                                    >
                                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                        </svg>
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            </> /* end holdings view */
            )}

            {/* TRANSACTIONS VIEW */}
            {activeView === 'transactions' && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    {/* Transactions toolbar */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px] flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name, ticker, person…"
                                value={txSearchQuery}
                                onChange={(e) => setTxSearchQuery(e.target.value)}
                                className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
                            />
                            {txSearchQuery && (
                                <button onClick={() => setTxSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Type filter pills */}
                        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                            {(['all', 'buy', 'sell', 'dividend'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setTxTypeFilter(type)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                                        txTypeFilter === type
                                            ? type === 'buy'
                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                : type === 'sell'
                                                    ? 'bg-red-500 text-white shadow-sm'
                                                    : type === 'dividend'
                                                        ? 'bg-blue-500 text-white shadow-sm'
                                                        : 'bg-white text-gray-700 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>

                        <span className="text-sm text-gray-500">
                            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Transactions table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
                        {filteredTransactions.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-gray-400 text-sm">No transactions found.</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Investment</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Person</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset Class</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredTransactions.map((flatTx, idx) => {
                                        const txDate = new Date(flatTx.date);
                                        const isFirst = idx === 0;
                                        const isSecondDay = idx > 0 &&
                                            new Date(filteredTransactions[idx - 1].date).toDateString() !== txDate.toDateString();
                                        const showDateDivider = isFirst || isSecondDay;

                                        return (
                                            <React.Fragment key={flatTx.id}>
                                                {showDateDivider && (
                                                    <tr className="bg-gradient-to-r from-indigo-50 to-blue-50">
                                                        <td colSpan={9} className="px-4 py-1.5">
                                                            <span className="text-xs font-semibold text-indigo-600">
                                                                📅 {txDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )}
                                                <motion.tr
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: idx * 0.01 }}
                                                    className={`group hover:bg-gray-50 transition-colors ${
                                                        flatTx.type === 'buy' ? 'border-l-2 border-l-emerald-400' :
                                                        flatTx.type === 'sell' ? 'border-l-2 border-l-red-400' :
                                                        'border-l-2 border-l-blue-400'
                                                    }`}
                                                >
                                                    {/* Date */}
                                                    <td className="px-4 py-3 text-gray-500 text-xs tabular-nums whitespace-nowrap">
                                                        {txDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    {/* Type */}
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                                            flatTx.type === 'buy' ? 'bg-emerald-100 text-emerald-800' :
                                                            flatTx.type === 'sell' ? 'bg-red-100 text-red-800' :
                                                            'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {flatTx.type === 'buy' ? '▲ BUY' : flatTx.type === 'sell' ? '▼ SELL' : '💰 DIV'}
                                                        </span>
                                                    </td>
                                                    {/* Investment name */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900 text-sm">{flatTx.holdingName}</span>
                                                            {flatTx.tickerSymbol && (
                                                                <span className="text-xs text-gray-400">{flatTx.tickerSymbol}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {/* Person */}
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            flatTx.holderName === 'Kiran' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                        }`}>
                                                            {flatTx.holderName}
                                                        </span>
                                                    </td>
                                                    {/* Asset Class */}
                                                    <td className="px-4 py-3 text-xs text-gray-600">{flatTx.assetClass}</td>
                                                    {/* Qty */}
                                                    <td className="px-4 py-3 text-right font-mono text-gray-900">
                                                        {Number(flatTx.quantity).toFixed(2)}
                                                    </td>
                                                    {/* Price */}
                                                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                                                        {formatDecimal(flatTx.price_per_unit)}
                                                    </td>
                                                    {/* Amount */}
                                                    <td className={`px-4 py-3 text-right font-mono font-semibold whitespace-nowrap ${
                                                        flatTx.type === 'buy' ? 'text-emerald-700' : 'text-red-700'
                                                    }`}>
                                                        {flatTx.type === 'sell' ? '−' : '+'}{formatValue(flatTx.amount)}
                                                    </td>
                                                    {/* Actions */}
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => onEditTransaction(flatTx.tx, flatTx.holding)}
                                                                className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                                                                title="Edit Transaction"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('Delete this transaction?')) onDeleteTransaction(flatTx.id);
                                                                }}
                                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                                title="Delete Transaction"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
};
