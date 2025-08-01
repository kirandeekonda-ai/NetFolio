import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { Auth } from '@/components/Auth';
import { Button } from '@/components/Button';
import { motion } from 'framer-motion';
import Head from 'next/head';

const LandingPage: NextPage = () => {
  const session = useSession();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Categorization',
      description: 'Automatically categorize your transactions using advanced AI technology that learns your spending patterns.'
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      description: 'Get detailed insights into your spending habits with interactive charts and personalized financial reports.'
    },
    {
      icon: '📄',
      title: 'Easy Statement Upload',
      description: 'Simply upload your bank statements and let our AI extract and organize all your transactions instantly.'
    },
    {
      icon: '🔒',
      title: 'Bank-Level Security',
      description: 'Your financial data is protected with enterprise-grade encryption and security measures.'
    },
    {
      icon: '⚡',
      title: 'Real-Time Sync',
      description: 'Stay up-to-date with real-time synchronization across all your devices and accounts.'
    },
    {
      icon: '📱',
      title: 'Multi-Device Access',
      description: 'Access your financial dashboard from anywhere with our responsive web application.'
    }
  ];

  const testimonials = [
    {
      quote: "NetFolio transformed how I manage my finances. The AI categorization saves me hours every month!",
      author: "Sarah Johnson",
      role: "Small Business Owner"
    },
    {
      quote: "The insights I get from NetFolio help me make better financial decisions. Highly recommended!",
      author: "Michael Chen",
      role: "Software Engineer"
    },
    {
      quote: "Finally, a finance app that actually understands my spending patterns. The analytics are amazing!",
      author: "Emma Rodriguez",
      role: "Marketing Manager"
    }
  ];

  return (
    <>
      <Head>
        <title>NetFolio - Smart Personal Finance Management</title>
        <meta name="description" content="Transform your financial management with AI-powered transaction categorization, smart analytics, and real-time insights." />
        <meta name="keywords" content="personal finance, budgeting, expense tracking, financial analytics, AI categorization" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                NetFolio
              </h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Button
                variant="secondary"
                onClick={() => setShowAuth(true)}
                className="px-6"
              >
                Sign In
              </Button>
              <Button
                onClick={() => setShowAuth(true)}
                className="bg-blue-600 hover:bg-blue-700 px-6"
              >
                Get Started
              </Button>
            </motion.div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Smart Personal Finance
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block">
                  Made Simple
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Transform your financial management with AI-powered transaction categorization, 
                smart analytics, and real-time insights that help you make better money decisions.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
                <Button
                  onClick={() => setShowAuth(true)}
                  className="bg-blue-600 hover:bg-blue-700 px-8 py-4 text-lg"
                >
                  Start Your Journey
                </Button>
                <Button
                  variant="secondary"
                  className="px-8 py-4 text-lg border-2 border-blue-200 hover:border-blue-300"
                >
                  Watch Demo
                </Button>
              </div>
            </motion.div>

            {/* Hero Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-3 gap-8 max-w-md mx-auto"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">99%</div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">5 min</div>
                <div className="text-sm text-gray-600">Setup Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <div className="text-sm text-gray-600">Access</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-20 bg-white rounded-t-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Master Your Finances
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to simplify your financial life and help you achieve your goals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loved by Thousands of Users
            </h2>
            <p className="text-xl text-gray-600">
              See what our community has to say about NetFolio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-white p-8 rounded-2xl shadow-lg"
              >
                <div className="text-2xl text-blue-600 mb-4">"</div>
                <p className="text-gray-700 mb-6 italic">
                  {testimonial.quote}
                </p>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center text-white"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Take Control of Your Finances?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of users who have transformed their financial lives with NetFolio.
            </p>
            <Button
              onClick={() => setShowAuth(true)}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
            >
              Get Started Free
            </Button>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-12 text-center text-gray-600">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <span className="font-semibold">NetFolio</span>
          </div>
          <p>&copy; 2025 NetFolio. All rights reserved.</p>
        </footer>

        {/* Auth Modal */}
        {showAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full relative"
            >
              <button
                onClick={() => setShowAuth(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <Auth />
            </motion.div>
          </motion.div>
        )}
      </div>
    </>
  );
};

export default LandingPage;
