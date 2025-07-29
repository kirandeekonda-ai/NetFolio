import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

const IndexPage: NextPage = () => {
  const session = useSession();
  const router = useRouter();
  const [loadingStage, setLoadingStage] = useState('initializing');

  useEffect(() => {
    const stages = ['initializing', 'authenticating', 'redirecting'];
    let currentStageIndex = 0;

    const progressInterval = setInterval(() => {
      if (currentStageIndex < stages.length - 1) {
        currentStageIndex++;
        setLoadingStage(stages[currentStageIndex]);
      }
    }, 800);

    const timeout = setTimeout(() => {
      clearInterval(progressInterval);
      
      if (session) {
        setLoadingStage('redirecting');
        // Add slight delay for better UX
        setTimeout(() => router.push('/landing'), 300);
      } else {
        setLoadingStage('redirecting');
        setTimeout(() => router.push('/auth'), 300);
      }
    }, 1500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, [session, router]);

  const getLoadingMessage = () => {
    switch (loadingStage) {
      case 'initializing':
        return 'Initializing NetFolio...';
      case 'authenticating':
        return 'Checking authentication...';
      case 'redirecting':
        return session ? 'Taking you to your dashboard...' : 'Loading sign-in...';
      default:
        return 'Loading NetFolio...';
    }
  };

  const getLoadingIcon = () => {
    switch (loadingStage) {
      case 'initializing':
        return '🚀';
      case 'authenticating':
        return '🔐';
      case 'redirecting':
        return session ? '📊' : '🔑';
      default:
        return '💼';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6"
      >
        {/* Enhanced Logo Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-2xl">{getLoadingIcon()}</span>
            </motion.div>
          </div>
        </motion.div>

        {/* NetFolio Branding */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            NetFolio
          </h1>
          <p className="text-gray-600 text-lg">Personal Finance Management</p>
        </motion.div>

        {/* Progressive Loading Message */}
        <motion.div
          key={loadingStage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <p className="text-gray-700 font-medium">{getLoadingMessage()}</p>
          
          {/* Progress Indicator */}
          <div className="w-64 mx-auto">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span className={loadingStage === 'initializing' ? 'text-blue-600 font-medium' : ''}>
                Initialize
              </span>
              <span className={loadingStage === 'authenticating' ? 'text-blue-600 font-medium' : ''}>
                Authenticate
              </span>
              <span className={loadingStage === 'redirecting' ? 'text-blue-600 font-medium' : ''}>
                Navigate
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                initial={{ width: '0%' }}
                animate={{ 
                  width: loadingStage === 'initializing' ? '33%' : 
                         loadingStage === 'authenticating' ? '66%' : '100%' 
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Subtle Feature Hints */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-xs text-gray-500 space-y-1"
        >
          <p>✨ AI-Powered Transaction Categorization</p>
          <p>📊 Real-time Financial Insights</p>
          <p>🔒 Bank-Level Security</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default IndexPage;
