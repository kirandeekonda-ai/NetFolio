/**
 * Service Layer Demo Component
 * 
 * Demonstrates the new service layer functionality with real-time
 * connection status and logging integration.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ConnectionStatus } from './ConnectionStatus';
import { LoggingService, DatabaseService, LLMService } from '@/services';
import { useRealtimeIntegration } from '@/hooks/useRealtimeIntegration';
import { useUser } from '@supabase/auth-helpers-react';

const logger = LoggingService.setContext('ServiceLayerDemo');

export const ServiceLayerDemo: React.FC = () => {
  const user = useUser();
  const { realtimeConnected, connect, getConnectionStatus } = useRealtimeIntegration();
  const [serviceStatus, setServiceStatus] = useState({
    database: false,
    llm: false,
    logging: true, // Always true since we're using it
    realtime: false
  });
  const [demoData, setDemoData] = useState({
    transactionCount: 0,
    bankAccountCount: 0,
    lastUpdate: ''
  });
  const [testResults, setTestResults] = useState<string[]>([]);

  // Test services on component mount
  useEffect(() => {
    const testServices = async () => {
      logger.info('Service Layer Demo initialized');
      
      // Test Database Service
      try {
        if (user?.id) {
          logger.info('Testing database service with user ID', { userId: user.id });
          setTestResults(prev => [...prev, `✓ User authenticated: ${user.id}`]);
          
          // Test 1: Basic connectivity with transaction count (simpler operation)
          try {
            const transactionCount = await DatabaseService.getTransactionCount(user.id);
            setTestResults(prev => [...prev, `✓ Transaction count retrieved: ${transactionCount}`]);
            
            // Test 2: Bank accounts retrieval
            const bankAccounts = await DatabaseService.getBankAccounts(user.id);
            setTestResults(prev => [...prev, `✓ Bank accounts retrieved: ${bankAccounts.length}`]);
            
            setDemoData({
              transactionCount: transactionCount,
              bankAccountCount: bankAccounts.length,
              lastUpdate: new Date().toLocaleTimeString()
            });
            
            setServiceStatus(prev => ({ ...prev, database: true }));
            setTestResults(prev => [...prev, `✅ Database service: ACTIVE`]);
            logger.info('Database service test successful', { 
              transactionCount,
              bankAccountCount: bankAccounts.length 
            });
          } catch (dbError) {
            setTestResults(prev => [...prev, `❌ Database operation failed: ${(dbError as Error).message}`]);
            throw dbError;
          }
        } else {
          logger.warn('No user ID available for database test');
          setTestResults(prev => [...prev, `❌ No user authentication available`]);
          setServiceStatus(prev => ({ ...prev, database: false }));
        }
      } catch (error) {
        logger.error('Database service test failed', error as Error);
        setTestResults(prev => [...prev, `❌ Database service: FAILED - ${(error as Error).message}`]);
        setServiceStatus(prev => ({ ...prev, database: false }));
        
        // Set demo data even if database fails
        setDemoData({
          transactionCount: 0,
          bankAccountCount: 0,
          lastUpdate: new Date().toLocaleTimeString()
        });
      }

      // Test LLM Service
      try {
        const providers = LLMService.getAvailableProviders();
        setServiceStatus(prev => ({ ...prev, llm: providers.length > 0 }));
        logger.info('LLM service test successful', { providers });
      } catch (error) {
        logger.error('LLM service test failed', error as Error);
        setServiceStatus(prev => ({ ...prev, llm: false }));
      }
    };

    testServices();
  }, [user?.id]);

  // Update realtime status
  useEffect(() => {
    setServiceStatus(prev => ({ ...prev, realtime: realtimeConnected }));
  }, [realtimeConnected]);

  const refreshData = async () => {
    logger.info('Manual data refresh requested');
    if (user?.id) {
      try {
        logger.info('Refreshing data for user', { userId: user.id });
        
        // Use the more reliable transaction count method
        const transactionCount = await DatabaseService.getTransactionCount(user.id);
        const bankAccounts = await DatabaseService.getBankAccounts(user.id);
        
        setDemoData({
          transactionCount,
          bankAccountCount: bankAccounts.length,
          lastUpdate: new Date().toLocaleTimeString()
        });
        
        // Update database status to active since refresh worked
        setServiceStatus(prev => ({ ...prev, database: true }));
        logger.info('Data refreshed successfully', { transactionCount, bankAccountCount: bankAccounts.length });
      } catch (error) {
        logger.error('Data refresh failed', error as Error);
        setServiceStatus(prev => ({ ...prev, database: false }));
      }
    } else {
      logger.warn('No user ID available for data refresh');
    }
  };

  const testRealTimeConnection = async () => {
    logger.info('Testing real-time connection');
    const connected = await connect();
    logger.info('Real-time connection test completed', { connected });
  };

  return (
    <div className="space-y-6">
      {/* Service Layer Status Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          🚀 Service Layer Status
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(serviceStatus).map(([service, status]) => (
            <div key={service} className="text-center">
              <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                status ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <div className="text-sm font-medium capitalize">{service}</div>
              <div className={`text-xs ${status ? 'text-green-600' : 'text-red-600'}`}>
                {status ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Real-Time Connection Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-md font-medium text-gray-900 mb-3">
          Real-Time Connection
        </h3>
        <ConnectionStatus showDetails={true} />
        
        <button
          onClick={testRealTimeConnection}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Test Connection
        </button>
      </motion.div>

      {/* Data Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-lg border border-gray-200"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-medium text-gray-900">
            Database Summary
          </h3>
          <button
            onClick={refreshData}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
          >
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {demoData.transactionCount}
            </div>
            <div className="text-sm text-gray-600">Transactions</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {demoData.bankAccountCount}
            </div>
            <div className="text-sm text-gray-600">Bank Accounts</div>
          </div>
        </div>
        
        {demoData.lastUpdate && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            Last updated: {demoData.lastUpdate}
          </div>
        )}
      </motion.div>

      {/* Service Layer Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"
      >
        <h3 className="text-sm font-medium text-yellow-800 mb-2">
          ⚡ Service Layer Active
        </h3>
        <p className="text-xs text-yellow-700">
          The new service layer abstraction is now active! This includes:
        </p>
        <ul className="text-xs text-yellow-700 mt-2 space-y-1">
          <li>• 🗄️ Database Service - Standardized Supabase operations</li>
          <li>• 🤖 LLM Service - Multi-provider AI integration</li>
          <li>• 📝 Logging Service - Structured application logging</li>
          <li>• ⚡ Real-time Service - Live data synchronization</li>
        </ul>
      </motion.div>

      {/* Test Results - Debug Information */}
      {testResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gray-50 p-4 rounded-lg border border-gray-200"
        >
          <h3 className="text-sm font-medium text-gray-800 mb-2">
            🔍 Service Test Results
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="text-xs font-mono text-gray-700">
                {result}
              </div>
            ))}
          </div>
          <button
            onClick={() => setTestResults([])}
            className="mt-2 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
          >
            Clear Results
          </button>
        </motion.div>
      )}
    </div>
  );
};
