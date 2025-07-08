import { NextPage } from 'next';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { motion } from 'framer-motion';

const Upload: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to statements page
    router.replace('/statements');
  }, [router]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="text-center p-8">
            <div className="text-6xl mb-4">📄</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Redirecting...</h1>
            <p className="text-gray-600">
              Upload functionality has been moved to the Statements page. Redirecting you now...
            </p>
            <div className="mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto"></div>
            </div>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Upload;
