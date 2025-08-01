import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

interface UserFlowState {
  hasCompletedOnboarding: boolean;
  hasAccounts: boolean;
  hasTransactions: boolean;
  lastVisit: string | null;
}

const IndexPage: NextPage = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [loadingStage, setLoadingStage] = useState('initializing');
  const [userState, setUserState] = useState<UserFlowState | null>(null);

  // Intelligent routing based on user state
  useEffect(() => {
    const determineUserFlow = async () => {
      if (!session?.user) {
        // Not authenticated - go to marketing landing page
        setLoadingStage('redirecting');
        setTimeout(() => router.push('/auth/landing'), 500);
        return;
      }

      try {
        setLoadingStage('analyzing');

        // Check user preferences for onboarding completion
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('onboarded')
          .eq('user_id', session.user.id)
          .single();

        // Check if user has bank accounts
        const { data: accounts } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);

        // Check if user has transactions (using Redux store count since no DB table)
        // In a real app, this would query the transactions table
        const hasTransactions = false; // Will be updated when transactions table exists

        const flowState: UserFlowState = {
          hasCompletedOnboarding: preferences?.onboarded || false,
          hasAccounts: (accounts?.length || 0) > 0,
          hasTransactions,
          lastVisit: new Date().toISOString()
        };

        setUserState(flowState);

        // Intelligent routing logic
        setLoadingStage('routing');
        
        if (!flowState.hasCompletedOnboarding) {
          // First-time user - go to onboarding
          setTimeout(() => router.push('/onboarding'), 300);
        } else if (!flowState.hasAccounts) {
          // Onboarded but no accounts - go to quick-start
          setTimeout(() => router.push('/quick-start'), 300);
        } else {
          // Established user - go to main landing dashboard
          setTimeout(() => router.push('/landing'), 300);
        }

      } catch (error) {
        console.error('Error determining user flow:', error);
        // Fallback to landing page on error
        setLoadingStage('redirecting');
        setTimeout(() => router.push('/landing'), 300);
      }
    };

    // Add a small delay for better UX
    const timer = setTimeout(() => {
      setLoadingStage('authenticating');
      setTimeout(determineUserFlow, 400);
    }, 600);

    return () => clearTimeout(timer);
  }, [session, router, supabase]);

  const getLoadingMessage = () => {
    switch (loadingStage) {
      case 'initializing':
        return 'Initializing NetFolio...';
      case 'authenticating':
        return 'Checking authentication...';
      case 'analyzing':
        return 'Analyzing your account setup...';
      case 'routing':
        return 'Personalizing your experience...';
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
      case 'analyzing':
        return '🔍';
      case 'routing':
        return '🎯';
      case 'redirecting':
        return session ? '📊' : '🔑';
      default:
        return '💼';
    }
  };

  const getProgressWidth = () => {
    switch (loadingStage) {
      case 'initializing':
        return '20%';
      case 'authenticating':
        return '40%';
      case 'analyzing':
        return '60%';
      case 'routing':
        return '80%';
      case 'redirecting':
        return '100%';
      default:
        return '0%';
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
              <span className={['authenticating', 'analyzing'].includes(loadingStage) ? 'text-blue-600 font-medium' : ''}>
                Authenticate
              </span>
              <span className={loadingStage === 'routing' ? 'text-blue-600 font-medium' : ''}>
                Analyze
              </span>
              <span className={loadingStage === 'redirecting' ? 'text-blue-600 font-medium' : ''}>
                Navigate
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: getProgressWidth() }}
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
