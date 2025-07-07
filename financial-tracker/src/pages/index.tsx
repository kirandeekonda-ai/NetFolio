import { NextPage } from 'next';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { Auth } from '@/components/Auth';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

const LandingPage: NextPage = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        {!session ? (
          // New User View
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">Simplify Your Personal Finances</h1>
            <p className="text-xl text-gray-600 mb-8">Easy expense & income tracking, quick bank statement upload & categorization, and real-time financial insights.</p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => router.push('/#auth-modal')}>Sign Up for Free</Button>
              <Button variant="secondary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Learn More</Button>
            </div>

            <div id="features" className="mt-16">
              <h2 className="text-3xl font-bold mb-8">Key Features</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Card>Easy Expense & Income Tracking</Card>
                <Card>Quick Bank Statement Upload & Categorization</Card>
                <Card>Real-time Financial Insights</Card>
                <Card>Secure and Private by Design</Card>
              </div>
            </div>
            <div id="auth-modal" className="mt-16">
              <Auth />
            </div>
          </div>
        ) : (
          // Returning User View
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Welcome back, {session.user.email}!</h1>
            <div className="flex justify-center space-x-4 mb-8">
              <Button onClick={() => router.push('/upload')}>Upload Bank Statement</Button>
              <Button onClick={() => router.push('/categorize')}>Categorize Transactions</Button>
              <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </div>

            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Financial Summary</h2>
              {/* Placeholder for financial summary widget */}
              <p>Income: $5000</p>
              <p>Expenses: $2500</p>
              <p>Net Balance: $2500</p>
            </Card>

            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Notifications</h2>
              {/* Placeholder for notifications */}
              <p>You have 3 uncategorized transactions.</p>
            </div>

            <div className="mt-8">
              <Button onClick={handleLogout}>Logout</Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LandingPage;
