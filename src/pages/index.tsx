import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useSessionContext, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

interface UserFlowState {
  hasCompletedOnboarding: boolean;
  hasAccounts: boolean;
  hasTransactions: boolean;
  lastVisit: string | null;
}

const IndexPage: NextPage = () => {
  const { session, isLoading } = useSessionContext(); // Use context to get loading state
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [loadingStage, setLoadingStage] = useState('initializing');
  const [userState, setUserState] = useState<UserFlowState | null>(null);

  // Intelligent routing based on user state
  useEffect(() => {
    // Wait for Supabase to finish loading the session
    if (isLoading) return;

    const determineUserFlow = async () => {
      if (!session?.user) {
        // Not authenticated - go to marketing landing page
        setLoadingStage('redirecting');
        router.push('/auth/landing');
        return;
      }

      try {
        setLoadingStage('analyzing');

        // Parallel DB queries for faster loading
        const [preferencesResult, accountsResult] = await Promise.all([
          supabase
            .from('user_preferences')
            .select('onboarded')
            .eq('user_id', session.user.id)
            .single(),
          supabase
            .from('bank_accounts')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)
        ]);

        const flowState: UserFlowState = {
          hasCompletedOnboarding: preferencesResult.data?.onboarded || false,
          hasAccounts: (accountsResult.data?.length || 0) > 0,
          hasTransactions: false,
          lastVisit: new Date().toISOString()
        };

        setUserState(flowState);

        // Intelligent routing logic - instant, no delays
        setLoadingStage('routing');

        if (!flowState.hasCompletedOnboarding) {
          router.push('/onboarding');
        } else if (!flowState.hasAccounts) {
          router.push('/quick-start');
        } else {
          router.push('/landing');
        }

      } catch (error) {
        console.error('Error determining user flow:', error);
        setLoadingStage('redirecting');
        router.push('/landing');
      }
    };

    // Execute flow determination
    if (session?.user) {
      setLoadingStage('authenticating');
    }

    determineUserFlow();

  }, [session, isLoading, router, supabase]); // Depend on session and isLoading

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
    const stages = ['initializing', 'authenticating', 'analyzing', 'routing', 'redirecting'];
    const currentIndex = stages.indexOf(loadingStage);
    const baseProgress = currentIndex >= 0 ? (currentIndex + 1) * (100 / stages.length) : 0;
    return `${baseProgress}%`;
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-2"
        >
          <motion.p
            key={loadingStage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-gray-700 font-medium h-6"
          >
            {getLoadingMessage()}
          </motion.p>

          {/* Progress Indicator */}
          <div className="w-64 mx-auto">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              {[
                { stage: 'initializing', label: 'Initialize' },
                { stage: ['authenticating', 'analyzing'], label: 'Authenticate' },
                { stage: 'routing', label: 'Analyze' },
                { stage: 'redirecting', label: 'Navigate' }
              ].map(({ stage, label }) => (
                <motion.span
                  key={label}
                  animate={{
                    color: Array.isArray(stage)
                      ? stage.includes(loadingStage) ? '#2563EB' : '#6B7280'
                      : stage === loadingStage ? '#2563EB' : '#6B7280',
                    fontWeight: Array.isArray(stage)
                      ? stage.includes(loadingStage) ? 500 : 400
                      : stage === loadingStage ? 500 : 400
                  }}
                  transition={{ duration: 0.4 }}
                >
                  {label}
                </motion.span>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                initial={{ width: '0%', x: '-10%' }}
                animate={{
                  width: getProgressWidth(),
                  x: '0%'
                }}
                transition={{
                  duration: 1.2,
                  ease: [0.4, 0.0, 0.2, 1], // Custom cubic-bezier for smooth animation
                  bounce: 0
                }}
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
