import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Layout } from '@/components/layout/Layout';
import { WelcomeWizard } from '@/components/WelcomeWizard';
import { Auth } from '@/components/Auth';
import { motion } from 'framer-motion';

const OnboardingPage: NextPage = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!session?.user) {
        router.push('/auth/landing');
        return;
      }

      try {
        // Check if user has already completed onboarding
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('onboarded')
          .eq('user_id', session.user.id)
          .single();

        if (preferences?.onboarded) {
          setHasCompletedOnboarding(true);
          // User already onboarded, redirect to quick-start or landing
          setTimeout(() => router.push('/quick-start'), 500);
          return;
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [session, supabase, router]);

  const handleOnboardingComplete = async () => {
    if (!session?.user) return;

    try {
      // Save onboarding completion to user_preferences
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
          onboarded: true,
          onboarded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      // Redirect to quick-start flow
      router.push('/quick-start');
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
      // Still redirect on error - don't block the user
      router.push('/quick-start');
    }
  };

  if (!session?.user) {
    return <Auth />;
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl">🚀</span>
              </div>
            </div>
            <p className="text-gray-600">Preparing your onboarding experience...</p>
            <div className="text-xs text-gray-500">
              Setting up your personalized finance dashboard...
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (hasCompletedOnboarding) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back!</h2>
            <p className="text-gray-600">You've already completed onboarding. Taking you to your dashboard...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <WelcomeWizard 
            user={session.user}
            onComplete={handleOnboardingComplete}
          />
        </motion.div>
      </div>
    </Layout>
  );
};

export default OnboardingPage;
