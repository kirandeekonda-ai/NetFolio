import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DropdownOption {
  value: string | number;
  label: string | number;
  description?: string;
  icon?: string | ReactNode;
}

interface ModernDropdownProps {
  options: DropdownOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  icon?: string | ReactNode;
  label?: string;
  className?: string;
  searchable?: boolean;
}

export const ModernDropdown: React.FC<ModernDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  icon,
  label,
  className = "",
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(option => String(option.value) === String(value));
  
  const filteredOptions = options.filter(option =>
    String(option.label).toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll and add overlay when dropdown is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('dropdown-open');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('dropdown-open');
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('dropdown-open');
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen && searchable) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className={`relative dropdown-container ${className}`} ref={dropdownRef} data-dropdown style={{ zIndex: isOpen ? 99999 : 'auto' }}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </label>
      )}
      
      <div className="relative">
        <motion.button
          type="button"
          onClick={toggleDropdown}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`
            w-full px-4 py-3 bg-gradient-to-r from-white to-slate-50 
            border border-slate-200 rounded-xl shadow-sm hover:shadow-md 
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300
            transition-all duration-200 font-medium text-slate-700 
            flex items-center justify-between group
            ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-300' : ''}
          `}
        >
          <span className="flex items-center truncate">
            {selectedOption ? (
              <>
                {selectedOption.icon && (
                  <span className="mr-2 opacity-70 flex-shrink-0">
                    {typeof selectedOption.icon === 'string' ? selectedOption.icon : selectedOption.icon}
                  </span>
                )}
                <span className="text-left">
                  <div className="font-medium">{selectedOption.label}</div>
                  {selectedOption.description && (
                    <div className="text-xs text-slate-500 truncate">{selectedOption.description}</div>
                  )}
                </span>
              </>
            ) : (
              <span className="text-slate-500">{placeholder}</span>
            )}
          </span>
          
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-400 group-hover:text-slate-600 ml-2 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Invisible backdrop to catch all clicks and prevent interference */}
              <div 
                className="fixed inset-0 z-[99998]" 
                style={{ zIndex: 99998 }}
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              />
              
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ 
                  duration: 0.2, 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25 
                }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-300 z-[99999] overflow-hidden"
                style={{ 
                  zIndex: 99999,
                  position: 'absolute',
                  pointerEvents: 'auto',
                  isolation: 'isolate'
                }}
                onClick={(e) => e.stopPropagation()}
              >
              {searchable && (
                <div className="p-3 border-b border-slate-100 bg-white">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search options..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                  />
                </div>
              )}

              <div className="max-h-64 overflow-y-auto bg-white" role="listbox">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => (
                    <motion.button
                      key={option.value}
                      type="button"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                        handleSelect(option.value);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className={`
                        w-full px-4 py-3 text-left hover:bg-slate-50 bg-white
                        transition-all duration-200 flex items-center justify-between group
                        cursor-pointer relative z-[99999]
                        ${String(value) === String(option.value) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}
                      `}
                      style={{ 
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 99999
                      }}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        {option.icon && (
                          <span className="mr-3 opacity-70 flex-shrink-0">
                            {typeof option.icon === 'string' ? option.icon : option.icon}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{option.label}</div>
                          {option.description && (
                            <div className="text-xs text-slate-500 truncate mt-1">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {String(value) === String(option.value) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-blue-500 flex-shrink-0 ml-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-slate-500 text-sm bg-white">
                    No options found
                  </div>
                )}
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ModernDropdown;
