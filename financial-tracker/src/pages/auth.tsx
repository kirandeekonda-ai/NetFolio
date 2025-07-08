import { NextPage } from 'next';
import { useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Auth } from '@/components/Auth';
import { motion } from 'framer-motion';

const AuthPage: NextPage = () => {
  const session = useSession();
  const router = useRouter();

  // Redirect to landing if already authenticated
  useEffect(() => {
    if (session) {
      router.push('/landing');
    }
  }, [session, router]);

  if (session) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-6xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Marketing content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Simplify Your Personal Finances
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Easy expense & income tracking, quick bank statement upload & categorization, and real-time financial insights.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AI-Powered Categorization</h3>
                    <p className="text-gray-600">Automatically categorize transactions using advanced AI</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Smart Insights</h3>
                    <p className="text-gray-600">Get detailed insights into your spending patterns</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Bank-Level Security</h3>
                    <p className="text-gray-600">Your data is protected with enterprise-grade security</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right side - Auth component */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center"
            >
              <Auth />
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AuthPage;
