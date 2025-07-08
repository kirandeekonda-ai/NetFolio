import { NextPage } from 'next';
import { useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

const IndexPage: NextPage = () => {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      // User is authenticated, redirect to landing
      router.push('/landing');
    } else {
      // User is not authenticated, redirect to auth
      router.push('/auth');
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-light-gray">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">Loading NetFolio...</p>
      </motion.div>
    </div>
  );
};

export default IndexPage;
