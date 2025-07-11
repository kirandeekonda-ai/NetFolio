import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SecurityBreakdown {
  accountNumbers: number;
  mobileNumbers: number;
  emails: number;
  panIds: number;
  customerIds: number;
  ifscCodes: number;
  cardNumbers: number;
  addresses: number;
  names: number;
}

interface SecurityStatusProps {
  breakdown: SecurityBreakdown;
  isVisible: boolean;
  isProcessing: boolean;
  showCountdown?: boolean;
}

const SECURITY_MESSAGES: Record<keyof SecurityBreakdown, string> = {
  accountNumbers: 'Account Numbers Protected',
  mobileNumbers: 'Mobile Numbers Secured',
  emails: 'Email Addresses Masked',
  panIds: 'PAN IDs Sanitized',
  customerIds: 'Customer IDs Protected',
  ifscCodes: 'IFSC Codes Secured',
  cardNumbers: 'Card Numbers Masked',
  addresses: 'Addresses Protected',
  names: 'Names Sanitized'
};

const SECURITY_ICONS: Record<keyof SecurityBreakdown, string> = {
  accountNumbers: '🏦',
  mobileNumbers: '📱',
  emails: '📧',
  panIds: '🆔',
  customerIds: '👤',
  ifscCodes: '🏛️',
  cardNumbers: '💳',
  addresses: '🏠',
  names: '👥'
};

export const SecurityStatus: React.FC<SecurityStatusProps> = ({
  breakdown,
  isVisible,
  isProcessing,
  showCountdown = false
}) => {
  if (!isVisible) {
    return null;
  }

  // Filter out items with 0 count
  const activeSecurityItems = Object.entries(breakdown)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      type: type as keyof SecurityBreakdown,
      count,
      message: SECURITY_MESSAGES[type as keyof SecurityBreakdown],
      icon: SECURITY_ICONS[type as keyof SecurityBreakdown]
    }));

  const totalItemsProtected = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ 
        duration: 0.6, 
        ease: "easeOut",
        scale: {
          type: "spring",
          stiffness: 200,
          damping: 15
        }
      }}
      className="mt-4 border-2 border-emerald-300 rounded-lg bg-emerald-50 shadow-lg relative overflow-hidden"
    >
      {/* Animated border glow effect */}
      <motion.div
        className="absolute inset-0 border-2 border-emerald-400 rounded-lg"
        animate={totalItemsProtected > 0 ? {
          opacity: [0.3, 0.8, 0.3],
          scale: [1, 1.02, 1],
        } : {}}
        transition={{
          duration: 2,
          repeat: showCountdown ? Infinity : 0,
          ease: "easeInOut"
        }}
      />
      <div className="p-3 border-b border-emerald-300 flex justify-between items-center bg-emerald-100">
        <h3 className="text-sm font-bold text-emerald-900 flex items-center">
          <span className="mr-2 text-lg">🔐</span>
          Security Protection Status
          {isProcessing && (
            <span className="ml-2 inline-block w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></span>
          )}
        </h3>
        <div className="text-xs text-emerald-700 font-bold bg-emerald-200 px-2 py-1 rounded-full">
          {totalItemsProtected} items secured
        </div>
      </div>
      
      <div className="p-3">
        {totalItemsProtected === 0 ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">✅</div>
            <div className="text-sm text-emerald-700 font-medium">
              No sensitive data detected
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              Your document appears to be clean of personal identifiers
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs text-emerald-700 mb-3 font-medium">
              We've automatically protected the following sensitive information:
            </div>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {activeSecurityItems.map((item, index) => (
                  <motion.div
                    key={item.type}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-center justify-between bg-white p-2 rounded border border-emerald-100"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-xs text-emerald-800 font-medium">
                        {item.message}
                      </span>
                    </div>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-semibold">
                      {item.count}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-3 text-xs text-emerald-600 bg-emerald-100 p-2 rounded">
              <span className="font-medium">🛡️ Privacy Protection:</span> All sensitive data has been masked before AI processing to ensure your privacy and security.
            </div>
            {showCountdown && (
              <div className="mt-2 text-xs text-emerald-700 bg-emerald-200 p-2 rounded text-center font-medium">
                ⏳ Please review the security details above. Processing will continue shortly...
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
