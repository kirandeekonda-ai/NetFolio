/**
 * Real-Time Connection Status Indicator
 * 
 * Visual indicator showing the status of real-time data connection
 * with user-friendly messaging and retry functionality.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeIntegration } from '@/hooks/useRealtimeIntegration';
import { RealtimeService } from '@/services/realtime/RealtimeService';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = '',
  showDetails = false,
  compact = false
}) => {
  const { realtimeConnected, connect } = useRealtimeIntegration();
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [connectionDetails, setConnectionDetails] = React.useState(() => 
    RealtimeService.getConnectionStatus()
  );

  // Update connection details periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setConnectionDetails(RealtimeService.getConnectionStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    try {
      await connect();
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusColor = () => {
    if (realtimeConnected) return 'bg-green-500';
    if (isRetrying) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (realtimeConnected) return 'Connected';
    if (isRetrying) return 'Connecting...';
    return 'Disconnected';
  };

  const getStatusMessage = () => {
    if (realtimeConnected) {
      return 'Real-time updates active';
    }
    if (isRetrying) {
      return 'Attempting to reconnect...';
    }
    return 'Real-time updates unavailable. Data will refresh periodically.';
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}>
          {realtimeConnected && (
            <motion.div
              className="w-2 h-2 rounded-full bg-green-400"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </div>
        {!realtimeConnected && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            {realtimeConnected && (
              <motion.div
                className="absolute inset-0 w-3 h-3 rounded-full bg-green-400"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [1, 0, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-900">
              Real-time Status: {getStatusText()}
            </div>
            <div className="text-xs text-gray-600">
              {getStatusMessage()}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {!realtimeConnected && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? 'Connecting...' : 'Retry'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-600"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Status:</span> {connectionDetails.connected ? 'Connected' : 'Disconnected'}
            </div>
            <div>
              <span className="font-medium">Attempts:</span> {connectionDetails.reconnectAttempts}
            </div>
            {connectionDetails.lastHeartbeat && (
              <div className="col-span-2">
                <span className="font-medium">Last Heartbeat:</span> {connectionDetails.lastHeartbeat.toLocaleTimeString()}
              </div>
            )}
            {connectionDetails.error && (
              <div className="col-span-2 text-red-600">
                <span className="font-medium">Error:</span> {connectionDetails.error}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
