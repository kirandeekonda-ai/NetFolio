import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ModernDropdown } from '@/components/ModernDropdown';
import { Transaction, Category } from '@/types';

export interface FilterCriteria {
  searchTerm: string;
  dateRange: {
    start: string;
    end: string;
  };
  amountRange: {
    min: number | null;
    max: number | null;
  };
  categoryStatus: 'all' | 'categorized' | 'uncategorized' | 'specific-category';
  selectedCategory: string | null;
  transactionType: 'all' | 'credit' | 'debit';
  sortBy: 'date' | 'amount' | 'description' | 'category';
  sortOrder: 'asc' | 'desc';
}

interface AdvancedFiltersProps {
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  categories: Category[];
  transactions: Transaction[];
  activeView: 'table' | 'insights' | 'analytics' | 'tools' | 'transfers';
  setActiveView: (view: 'table' | 'insights' | 'analytics' | 'tools' | 'transfers') => void;
  viewTabs: { id: string; label: string; icon: string }[];
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  categories,
  transactions,
  activeView,
  setActiveView,
  viewTabs,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Calculate active filters count
  useEffect(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.amountRange.min !== null || filters.amountRange.max !== null) count++;
    if (filters.categoryStatus !== 'all') count++;
    if (filters.transactionType !== 'all') count++;
    if (filters.sortBy !== 'date' || filters.sortOrder !== 'desc') count++;
    setActiveFiltersCount(count);
  }, [filters]);

  const updateFilters = (updates: Partial<FilterCriteria>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchTerm: '',
      dateRange: { start: '', end: '' },
      amountRange: { min: null, max: null },
      categoryStatus: 'all',
      selectedCategory: null,
      transactionType: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const categoryStatusOptions = [
    { value: 'all', label: 'All Transactions' },
    { value: 'categorized', label: 'Categorized Only' },
    { value: 'uncategorized', label: 'Uncategorized Only' },
    { value: 'specific-category', label: 'Specific Category' }
  ];

  const transactionTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'credit', label: 'Credits Only' },
    { value: 'debit', label: 'Debits Only' }
  ];

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'description', label: 'Description' },
    { value: 'category', label: 'Category' }
  ];

  return (
    <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-4 md:p-6">
      {/* Filter Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 mb-6">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="min-w-[40px] w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
            <span className="text-xl">🔍</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Advanced Filters</h3>
            <p className="text-sm text-gray-600">
              {activeFiltersCount > 0 ? `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active` : 'No filters applied'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {activeFiltersCount > 0 && (
            <Button
              onClick={clearAllFilters}
              variant="secondary"
              className="text-xs sm:text-sm px-3 py-1.5"
            >
              Clear All
            </Button>
          )}
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="secondary"
            className="text-xs sm:text-sm px-3 py-1.5"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
            <motion.span
              className="ml-2 inline-block"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.span>
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => updateFilters({ categoryStatus: filters.categoryStatus === 'uncategorized' ? 'all' : 'uncategorized' })}
          className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${filters.categoryStatus === 'uncategorized'
              ? 'bg-orange-100 text-orange-800 border-2 border-orange-300'
              : 'bg-white/60 text-gray-700 border border-gray-200 hover:bg-white/80'
            }`}
        >
          🏷️ Uncategorized
        </button>

        <button
          onClick={() => updateFilters({ transactionType: filters.transactionType === 'debit' ? 'all' : 'debit' })}
          className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${filters.transactionType === 'debit'
              ? 'bg-red-100 text-red-800 border-2 border-red-300'
              : 'bg-white/60 text-gray-700 border border-gray-200 hover:bg-white/80'
            }`}
        >
          💸 Expenses
        </button>

        <button
          onClick={() => updateFilters({ transactionType: filters.transactionType === 'credit' ? 'all' : 'credit' })}
          className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${filters.transactionType === 'credit'
              ? 'bg-green-100 text-green-800 border-2 border-green-300'
              : 'bg-white/60 text-gray-700 border border-gray-200 hover:bg-white/80'
            }`}
        >
          💰 Income
        </button>

        <button
          onClick={() => updateFilters({
            sortBy: 'amount',
            sortOrder: filters.sortBy === 'amount' && filters.sortOrder === 'desc' ? 'asc' : 'desc'
          })}
          className="p-3 rounded-xl text-sm font-medium bg-white/60 text-gray-700 border border-gray-200 hover:bg-white/80 transition-all duration-200"
        >
          📊 By Amount {filters.sortBy === 'amount' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
        </button>
      </div>

      {/* Advanced Search */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <span className="text-gray-500 text-lg">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Search transactions by description, amount, or category..."
          value={filters.searchTerm}
          onChange={(e) => updateFilters({ searchTerm: e.target.value })}
          className="w-full pl-10 pr-4 py-3 bg-white/90 border border-gray-200 rounded-2xl shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300
                   placeholder-gray-400 text-gray-900 transition-all duration-200"
        />
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Date Range */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => updateFilters({
                      dateRange: { ...filters.dateRange, start: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300"
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => updateFilters({
                      dateRange: { ...filters.dateRange, end: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300"
                    placeholder="End Date"
                  />
                </div>
              </div>

              {/* Amount Range */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Amount Range</label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min Amount"
                    value={filters.amountRange.min || ''}
                    onChange={(e) => updateFilters({
                      amountRange: {
                        ...filters.amountRange,
                        min: e.target.value ? Number(e.target.value) : null
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300"
                  />
                  <input
                    type="number"
                    placeholder="Max Amount"
                    value={filters.amountRange.max || ''}
                    onChange={(e) => updateFilters({
                      amountRange: {
                        ...filters.amountRange,
                        max: e.target.value ? Number(e.target.value) : null
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300"
                  />
                </div>
              </div>

              {/* Category Status */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Category Status</label>
                <select
                  value={filters.categoryStatus}
                  onChange={(e) => updateFilters({
                    categoryStatus: e.target.value as FilterCriteria['categoryStatus'],
                    selectedCategory: e.target.value === 'specific-category' ? filters.selectedCategory : null
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300"
                >
                  {categoryStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {filters.categoryStatus === 'specific-category' && (
                  <select
                    value={filters.selectedCategory || ''}
                    onChange={(e) => updateFilters({ selectedCategory: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Transaction Type */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
                <select
                  value={filters.transactionType}
                  onChange={(e) => updateFilters({
                    transactionType: e.target.value as FilterCriteria['transactionType']
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300"
                >
                  {transactionTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Options */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Sort By</label>
                <div className="flex space-x-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilters({
                      sortBy: e.target.value as FilterCriteria['sortBy']
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => updateFilters({
                      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {filters.sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>

              {/* Quick Amount Presets */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Quick Amount Filters</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateFilters({ amountRange: { min: null, max: -1000 } })}
                    className="px-3 py-2 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Large Expenses
                  </button>
                  <button
                    onClick={() => updateFilters({ amountRange: { min: 1000, max: null } })}
                    className="px-3 py-2 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Large Income
                  </button>
                  <button
                    onClick={() => updateFilters({ amountRange: { min: -500, max: 500 } })}
                    className="px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Small Amounts
                  </button>
                  <button
                    onClick={() => updateFilters({ amountRange: { min: null, max: null } })}
                    className="px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Clear Range
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
