import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';
import { Auth } from '@/components/Auth';
import { Layout } from '@/components/layout/Layout';
import { WelcomeWizard } from '../components/WelcomeWizard';
import { LandingDashboard } from '../components/LandingDashboard';
import { motion } from 'framer-motion';

interface UserProfile {
  user_id: string;
  currency: string;
  onboarded: boolean;
  categories: any[];
}

const LandingPage: NextPage = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch user profile and transactions for onboarding check
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      return data as UserProfile;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const { data: transactionsCount } = useQuery({
    queryKey: ['transactionsCount', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return 0;
      
      // For now, use Redux store since we don't have transactions table in Supabase
      // In a real app, this would query the database
      return 0;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Redirect if user is not signed in
  useEffect(() => {
    if (!session && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/auth/landing');
    }
  }, [session, router, isRedirecting]);

  // Show loading state while checking auth
  if (!session || isRedirecting) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl">🔐</span>
              </div>
            </div>
            <p className="text-gray-600">Loading your dashboard...</p>
            <div className="text-xs text-gray-500">
              Verifying authentication status...
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Show loading state while fetching profile
  if (profileLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl">⚙️</span>
              </div>
            </div>
            <p className="text-gray-600">Setting up your experience...</p>
            <div className="text-xs text-gray-500">
              Loading your preferences and data...
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Determine if user is first-time
  const isFirstTime = !profile?.onboarded && (transactionsCount === 0);

  // Show appropriate experience
  return (
    <Layout>
      {isFirstTime ? (
        <WelcomeWizard 
          user={session.user}
          onComplete={() => {
            // This will be handled by the WelcomeWizard component
            router.push('/dashboard');
          }}
        />
      ) : (
        <LandingDashboard 
          user={session.user}
          profile={profile}
        />
      )}
    </Layout>
  );
};

export default LandingPage;
