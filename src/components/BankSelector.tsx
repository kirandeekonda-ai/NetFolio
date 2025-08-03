import { FC, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from './Input';
import { getBankLogoPath, getBankEmoji } from '@/utils/bankLogos';

interface Bank {
  id: string;
  bank_name: string;
  bank_code: string;
  logo_url: string;
  bank_type: string;
  display_order: number;
}

interface BankSelectorProps {
  value: string;
  onChange: (bankName: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const BankSelector: FC<BankSelectorProps> = ({
  value,
  onChange,
  placeholder = "Search or type bank name...",
  error,
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load popular banks on initial focus
  const loadPopularBanks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/banks/search?limit=15');
      if (response.ok) {
        const data = await response.json();
        setBanks(data.banks || []);
      }
    } catch (error) {
      console.error('Error loading popular banks:', error);
      setBanks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Search banks based on input
  const searchBanks = async (term: string) => {
    if (!term.trim()) {
      await loadPopularBanks();
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/banks/search?q=${encodeURIComponent(term)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setBanks(data.banks || []);
      }
    } catch (error) {
      console.error('Error searching banks:', error);
      setBanks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (isOpen) {
        searchBanks(searchTerm);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, isOpen]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setSelectedIndex(-1);
    
    if (!isOpen && newValue.length > 0) {
      setIsOpen(true);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (!isOpen) {
      setIsOpen(true);
      if (banks.length === 0) {
        loadPopularBanks();
      }
    }
  };

  // Handle bank selection
  const handleBankSelect = (bank: Bank) => {
    setSearchTerm(bank.bank_name);
    onChange(bank.bank_name);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < banks.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && banks[selectedIndex]) {
          handleBankSelect(banks[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get bank type badge color
  const getBankTypeBadge = (bankType: string) => {
    switch (bankType) {
      case 'commercial':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Commercial' };
      case 'regional':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Regional' };
      case 'foreign':
        return { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Foreign' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Other' };
    }
  };

  return (
    <div className="relative">
      {/* Input Field */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          error={error}
          disabled={disabled}
          className={`${className} pr-10`}
          autoComplete="off"
        />
        
        {/* Search/Loading Icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          ) : (
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-y-auto"
          >
            {banks.length > 0 ? (
              <div className="py-2">
                {!searchTerm && (
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    Popular Banks
                  </div>
                )}
                
                {banks.map((bank, index) => {
                  const badge = getBankTypeBadge(bank.bank_type);
                  return (
                    <motion.button
                      key={bank.id}
                      type="button"
                      onClick={() => handleBankSelect(bank)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                        selectedIndex === index ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                      whileHover={{ backgroundColor: 'rgb(249 250 251)' }}
                    >
                      {/* Bank Logo */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                        {(() => {
                          const logoPath = getBankLogoPath(bank.bank_name);
                          if (logoPath) {
                            return (
                              <img
                                src={logoPath}
                                alt={`${bank.bank_name} logo`}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (nextElement) nextElement.style.display = 'flex';
                                }}
                              />
                            );
                          }
                          return null;
                        })()}
                        <div 
                          className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-600 bg-gradient-to-br from-blue-50 to-indigo-50"
                          style={{ display: getBankLogoPath(bank.bank_name) ? 'none' : 'flex' }}
                        >
                          {bank.bank_name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Bank Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 truncate">
                            {bank.bank_name}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                        {bank.bank_code && (
                          <div className="text-xs text-gray-500 mt-1">
                            Code: {bank.bank_code}
                          </div>
                        )}
                      </div>

                      {/* Selection Indicator */}
                      {selectedIndex === index && (
                        <div className="flex-shrink-0 text-blue-500">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : !isLoading ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🏦</div>
                <div className="font-medium mb-1">
                  {searchTerm ? 'No banks found' : 'Start typing to search'}
                </div>
                <div className="text-sm">
                  {searchTerm 
                    ? `We'll use "${searchTerm}" as your bank name`
                    : 'Try typing your bank name or select from popular options'
                  }
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
