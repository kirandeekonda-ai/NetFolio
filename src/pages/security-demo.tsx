import { NextPage } from 'next';
import { Layout } from '@/components/layout/Layout';
import { SecurityStatusDemo } from '@/components/SecurityStatusDemo';

const SecurityDemoPage: NextPage = () => {
  return (
    <Layout>
      <SecurityStatusDemo />
    </Layout>
  );
};

export default SecurityDemoPage;
