/**
 * InnovativeDateSelector Component
 * Creative date range selector with animated pills and visual icons
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateRange } from '../types/analytics.types';

interface DatePeriod {
  id: string;
  label: string;
  icon: string;
  months: number;
  gradient: string;
  description: string;
}

interface InnovativeDateSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  className?: string;
}

const datePeriods: DatePeriod[] = [
  {
    id: '1m',
    label: '1M',
    icon: '🌱',
    months: 1,
    gradient: 'from-emerald-400 to-emerald-600',
    description: 'Last Complete Month'
  },
  {
    id: '3m',
    label: '3M',
    icon: '🌿',
    months: 3,
    gradient: 'from-blue-400 to-blue-600',
    description: 'Last 3 Complete Months'
  },
  {
    id: '6m',
    label: '6M',
    icon: '🌳',
    months: 6,
    gradient: 'from-purple-400 to-purple-600',
    description: 'Last 6 Complete Months'
  },
  {
    id: '1y',
    label: '1Y',
    icon: '🌲',
    months: 12,
    gradient: 'from-amber-400 to-amber-600',
    description: 'Last 12 Complete Months'
  }
];

export const InnovativeDateSelector: React.FC<InnovativeDateSelectorProps> = ({
  dateRange,
  onDateRangeChange,
  className = ''
}) => {
  const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);

  const getCurrentPeriod = (): string => {
    const diffInMs = new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    if (diffInDays <= 35) return '1m';
    if (diffInDays <= 100) return '3m';
    if (diffInDays <= 190) return '6m';
    return '1y';
  };

  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());

  const calculateDateRange = (months: number): DateRange => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Calculate the last complete month (previous month)
    const lastCompleteMonth = currentMonth - 1;
    const lastCompleteYear = lastCompleteMonth < 0 ? currentYear - 1 : currentYear;
    const adjustedLastMonth = lastCompleteMonth < 0 ? 11 : lastCompleteMonth;
    
    // Calculate start month (months back from the last complete month)
    const startMonthIndex = adjustedLastMonth - months + 1;
    let startYear = lastCompleteYear;
    let startMonth = startMonthIndex;
    
    // Handle year boundary crossing
    if (startMonth < 0) {
      startYear -= 1;
      startMonth = 12 + startMonth;
    }
    
    // Start of first month in range (1st day)
    const start = new Date(startYear, startMonth, 1);
    
    // End of last complete month (last day)
    const end = new Date(lastCompleteYear, adjustedLastMonth + 1, 0);
    
    // Format dates properly to avoid timezone issues
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      start: formatDate(start),
      end: formatDate(end)
    };
  };

  const handlePeriodSelect = (period: DatePeriod) => {
    setSelectedPeriod(period.id);
    const newDateRange = calculateDateRange(period.months);
    onDateRangeChange(newDateRange);
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Analysis Period</h3>
          <p className="text-sm text-gray-500">Choose your financial insights timeframe</p>
        </div>
        
        {/* Active Period Indicator */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full"
        >
          <span className="text-sm text-gray-600">Active:</span>
          <span className="text-sm font-medium text-gray-900">
            {datePeriods.find(p => p.id === selectedPeriod)?.description}
          </span>
        </motion.div>
      </div>

      {/* Innovative Pill Selector */}
      <div className="relative">
        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-2xl">
          {datePeriods.map((period) => {
            const isSelected = selectedPeriod === period.id;
            const isHovered = hoveredPeriod === period.id;
            
            return (
              <motion.button
                key={period.id}
                onClick={() => handlePeriodSelect(period)}
                onMouseEnter={() => setHoveredPeriod(period.id)}
                onMouseLeave={() => setHoveredPeriod(null)}
                className="relative flex-1 group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className={`
                    relative overflow-hidden rounded-xl p-4 transition-all duration-300 cursor-pointer
                    ${isSelected 
                      ? `bg-gradient-to-r ${period.gradient} text-white shadow-lg shadow-${period.gradient.split('-')[1]}-500/25` 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                  layout
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-2 -right-2 text-4xl transform rotate-12">
                      {period.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 text-center">
                    <motion.div 
                      className="text-2xl mb-2"
                      animate={{ 
                        rotateY: isSelected ? [0, 360] : 0,
                        scale: isSelected ? [1, 1.1, 1] : 1
                      }}
                      transition={{ duration: 0.6 }}
                    >
                      {period.icon}
                    </motion.div>
                    
                    <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {period.label}
                    </div>
                    
                    <div className={`text-xs mt-1 ${isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                      {period.description}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center"
                      >
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hover Glow Effect */}
                  <AnimatePresence>
                    {isHovered && !isSelected && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute inset-0 bg-gradient-to-r ${period.gradient} opacity-5 rounded-xl`}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.button>
            );
          })}
        </div>

        {/* Animated Timeline */}
        <motion.div 
          className="mt-4 relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Short Term</span>
            <span>•••</span>
            <span>Long Term</span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${datePeriods.find(p => p.id === selectedPeriod)?.gradient}`}
              initial={{ width: 0 }}
              animate={{ 
                width: `${((datePeriods.findIndex(p => p.id === selectedPeriod) + 1) / datePeriods.length) * 100}%`
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      </div>

      {/* Quick Info */}
      <motion.div
        key={selectedPeriod}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200"
      >
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="text-lg">{datePeriods.find(p => p.id === selectedPeriod)?.icon}</span>
          <span>
            Analyzing <span className="font-medium text-gray-900">
              {datePeriods.find(p => p.id === selectedPeriod)?.months} month{datePeriods.find(p => p.id === selectedPeriod)?.months !== 1 ? 's' : ''}
            </span> of financial data
          </span>
        </div>
      </motion.div>
    </div>
  );
};
