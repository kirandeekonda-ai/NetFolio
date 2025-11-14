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
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

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
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'AI-Powered Categorization',
      description: 'Automatically categorize your transactions using advanced AI technology that learns your spending patterns.'
    },
    {
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Smart Analytics',
      description: 'Get detailed insights into your spending habits with interactive charts and personalized financial reports.'
    },
    {
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Easy Statement Upload',
      description: 'Simply upload your bank statements and let our AI extract and organize all your transactions instantly.'
    },
    {
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Bank-Level Security',
      description: 'Your financial data is protected with enterprise-grade encryption and security measures.'
    },
    {
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      title: 'Smart Data Masking',
      description: 'Your sensitive information is automatically masked and anonymized before AI processing, ensuring maximum privacy protection.'
    },
    {
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Multi-Device Access',
      description: 'Access your financial dashboard from anywhere with our responsive web application.'
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
      
      <style jsx>{`
        @keyframes currencyScroll1 {
          0%, 30% { opacity: 1; transform: translateY(0px); }
          33%, 100% { opacity: 0; transform: translateY(-20px); }
        }
        
        @keyframes currencyScroll2 {
          0%, 30% { opacity: 0; transform: translateY(20px); }
          33%, 63% { opacity: 1; transform: translateY(0px); }
          66%, 100% { opacity: 0; transform: translateY(-20px); }
        }
        
        @keyframes currencyScroll3 {
          0%, 63% { opacity: 0; transform: translateY(20px); }
          66%, 96% { opacity: 1; transform: translateY(0px); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        
        @keyframes currencyTextScroll {
          0%, 30% { opacity: 1; transform: translateY(0px); }
          33%, 63% { opacity: 0; transform: translateY(-10px); }
          66%, 96% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0px); }
        }
        
        /* All currency animations synchronized */
        .currency-scroll span:nth-child(1),
        .currency-scroll-small span:nth-child(1),
        .currency-scroll-tiny span:nth-child(1) {
          animation: currencyScroll1 9s infinite;
        }
        
        .currency-scroll span:nth-child(2),
        .currency-scroll-small span:nth-child(2),
        .currency-scroll-tiny span:nth-child(2) {
          animation: currencyScroll2 9s infinite;
        }
        
        .currency-scroll span:nth-child(3),
        .currency-scroll-small span:nth-child(3),
        .currency-scroll-tiny span:nth-child(3) {
          animation: currencyScroll3 9s infinite;
        }
        
        /* Currency text animations synchronized */
        .currency-text span:nth-child(1) {
          animation: currencyTextScroll 9s infinite;
          animation-delay: 0s;
        }
        .currency-text span:nth-child(2) {
          animation: currencyTextScroll 9s infinite;
          animation-delay: 3s;
        }
        .currency-text span:nth-child(3) {
          animation: currencyTextScroll 9s infinite;
          animation-delay: 6s;
        }
        
        .currency-scroll,
        .currency-scroll-small,
        .currency-scroll-tiny {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1em;
          height: 1em;
          vertical-align: baseline;
        }
        
        .currency-scroll span,
        .currency-scroll-small span,
        .currency-scroll-tiny span {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        
        .currency-text {
          position: relative;
          display: inline-block;
          width: 3.2em;
          height: 1.5em;
          vertical-align: baseline;
          overflow: hidden;
        }
        
        .currency-text span {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          animation: currencyTextScroll 9s infinite;
        }
        
        .currency-text span:nth-child(1) {
          animation-delay: 0s;
        }
        .currency-text span:nth-child(2) {
          animation-delay: 3s;
        }
        .currency-text span:nth-child(3) {
          animation-delay: 6s;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Navigation */}
        <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="container mx-auto px-6 py-4">
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
                onClick={() => {
                  setAuthMode('signin');
                  setShowAuth(true);
                }}
                className="px-6 text-sm font-medium text-gray-700 hover:text-blue-600 bg-transparent hover:bg-blue-50 border-gray-200"
              >
                Sign In
              </Button>
            </motion.div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-cyan-600/20 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Content */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <div className="inline-flex items-center justify-center p-2 bg-blue-50 rounded-full mb-6">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    ✨ New
                  </span>
                  <span className="text-blue-700 px-3 py-1 text-sm font-medium">
                    AI-Powered Financial Insights
                  </span>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 bg-clip-text text-transparent">
                    Stop Wondering Where
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Your Money Goes
                  </span>
                </h1>
                
                <p className="text-xl text-gray-600 leading-relaxed">
                  See exactly where every penny goes with AI that automatically categorizes your spending. 
                  No more spreadsheets, no more guessing—just crystal-clear insights in 2 minutes.
                </p>

                {/* Trust Badges */}
                <div className="flex flex-wrap items-center gap-6 py-4">
                  <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 font-medium text-sm">Bank-Level Security</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-blue-700 font-medium text-sm">Privacy First</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-full">
                    <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-purple-700 font-medium text-sm">Free Forever</span>
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="space-y-4">
                  <Button
                    onClick={() => {
                      setAuthMode('signup');
                      setShowAuth(true);
                    }}
                    className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <span className="flex items-center">
                      Start Free Analysis Now
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </Button>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>No credit card required</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>2-minute setup</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Hero Visual */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                {/* Main Dashboard Preview */}
                <div className="relative bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center text-white">
                      <div>
                        <p className="text-sm opacity-90">Total Balance</p>
                        <div className="text-2xl font-bold flex items-baseline">
                          <div className="inline-flex items-center justify-center w-5 h-5 mr-2 self-center">
                            <div className="currency-scroll">
                              <span className="inline-block">$</span>
                              <span className="inline-block">₹</span>
                              <span className="inline-block">€</span>
                            </div>
                          </div>
                          <span>12,847.32</span>
                        </div>
                      </div>
                      <div className="text-green-300 text-right">
                        <div className="flex items-baseline">
                          <div className="inline-flex items-center justify-center w-3 h-3 mr-1 self-center">
                            <div className="currency-scroll-small">
                              <span className="inline-block text-xs">$</span>
                              <span className="inline-block text-xs">₹</span>
                              <span className="inline-block text-xs">€</span>
                            </div>
                          </div>
                          <p className="text-sm">1,245 this month</p>
                        </div>
                        <p className="text-xs opacity-75">↗ +12.8%</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Category Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Groceries</span>
                      </div>
                      <div className="flex items-baseline text-gray-600">
                        <div className="inline-flex items-center justify-center w-3 h-3 mr-1 self-center">
                          <div className="currency-scroll-tiny">
                            <span className="inline-block text-xs">$</span>
                            <span className="inline-block text-xs">₹</span>
                            <span className="inline-block text-xs">€</span>
                          </div>
                        </div>
                        <span>485.32</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">Entertainment</span>
                      </div>
                      <div className="flex items-baseline text-gray-600">
                        <div className="inline-flex items-center justify-center w-3 h-3 mr-1 self-center">
                          <div className="currency-scroll-tiny">
                            <span className="inline-block text-xs">$</span>
                            <span className="inline-block text-xs">₹</span>
                            <span className="inline-block text-xs">€</span>
                          </div>
                        </div>
                        <span>234.56</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="font-medium">Transportation</span>
                      </div>
                      <div className="flex items-baseline text-gray-600">
                        <div className="inline-flex items-center justify-center w-3 h-3 mr-1 self-center">
                          <div className="currency-scroll-tiny">
                            <span className="inline-block text-xs">$</span>
                            <span className="inline-block text-xs">₹</span>
                            <span className="inline-block text-xs">€</span>
                          </div>
                        </div>
                        <span>178.90</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating AI Badge */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
                  <span className="text-sm font-semibold">🤖 AI Powered</span>
                </div>

                {/* Background decoration */}
                <div className="absolute -z-10 top-8 left-8 w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl"></div>
              </motion.div>
            </div>

            {/* Social Proof Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="flex flex-wrap justify-center gap-12 mt-16 p-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg max-w-4xl mx-auto"
            >
              {/* Statements Analyzed - Blurred with Coming Soon */}
              <div className="text-center relative">
                <div className="relative">
                  <div className="text-3xl font-bold text-blue-600 blur-sm select-none">10,000+</div>
                  <div className="text-sm text-gray-600 blur-sm select-none">Statements Analyzed</div>
                  
                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 1.2 }}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
                    >
                      <motion.span
                        animate={{ 
                          opacity: [1, 0.7, 1],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        🚀 Coming Soon
                      </motion.span>
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">99.2%</div>
                <div className="text-sm text-gray-600">Categorization Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">2 min</div>
                <div className="text-sm text-gray-600">Average Setup Time</div>
              </div>
              
              {/* Finances Organized - Blurred with Coming Soon */}
              <div className="text-center relative">
                <div className="relative">
                  <div className="text-3xl font-bold text-blue-600 flex items-baseline justify-center blur-sm select-none">
                    <div className="inline-flex items-center justify-center w-5 h-5 mr-1 self-center">
                      <div className="currency-scroll-small">
                        <span className="inline-block">$</span>
                        <span className="inline-block">₹</span>
                        <span className="inline-block">€</span>
                      </div>
                    </div>
                    <span>2.5M+</span>
                  </div>
                  <div className="text-sm text-gray-600 blur-sm select-none">Finances Organized</div>
                  
                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 1.4 }}
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
                    >
                      <motion.span
                        animate={{ 
                          opacity: [1, 0.7, 1],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.5
                        }}
                      >
                        💰 Coming Soon
                      </motion.span>
                    </motion.div>
                  </div>
                </div>
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg hover:bg-white hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
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
        <section className="container mx-auto px-6 py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Financial Enthusiasts
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what users are saying about their NetFolio experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 relative"
            >
              {/* Blurred Content */}
              <div className="blur-sm select-none">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 mb-6 italic">
                  "NetFolio transformed how I understand my spending. The AI categorization is spot-on, 
                  and I finally have clarity on where my money goes each month."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-gray-900">Sarah Chen</div>
                    <div className="text-sm text-gray-600">Financial Analyst</div>
                  </div>
                </div>
              </div>
              
              {/* Coming Soon Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.5 }}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
                >
                  <motion.span
                    animate={{ 
                      opacity: [1, 0.7, 1],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    💬 Real Reviews Coming Soon
                  </motion.span>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 relative"
            >
              {/* Blurred Content */}
              <div className="blur-sm select-none">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 mb-6 italic">
                  "Privacy was my biggest concern, but NetFolio's data masking approach gave me confidence. 
                  Setup took literally 2 minutes, and the insights are incredible."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                    M
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-gray-900">Marcus Johnson</div>
                    <div className="text-sm text-gray-600">Software Engineer</div>
                  </div>
                </div>
              </div>
              
              {/* Coming Soon Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.7 }}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
                >
                  <motion.span
                    animate={{ 
                      opacity: [1, 0.7, 1],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.3
                    }}
                  >
                    🔒 Beta Feedback Coming
                  </motion.span>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 relative"
            >
              {/* Blurred Content */}
              <div className="blur-sm select-none">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 mb-6 italic">
                  "As a freelancer with irregular income, NetFolio helps me track my finances 
                  without the complexity of traditional tools. Game changer!"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                    A
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-gray-900">Alex Rivera</div>
                    <div className="text-sm text-gray-600">Freelance Designer</div>
                  </div>
                </div>
              </div>
              
              {/* Coming Soon Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.9 }}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
                >
                  <motion.span
                    animate={{ 
                      opacity: [1, 0.7, 1],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.6
                    }}
                  >
                    ⭐ User Stories Soon
                  </motion.span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-36 -translate-y-36"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48"></div>
              <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 p-12 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mb-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
                  Ready to Take Control of
                  <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                    Your Financial Life?
                  </span>
                </h2>
                <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
                  Join thousands who've discovered where their money really goes. 
                  <span className="font-semibold text-white"> Your financial clarity is just 2 minutes away.</span>
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col items-center gap-6"
              >
                <Button
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuth(true);
                  }}
                  variant="secondary"
                  className="group relative !bg-white !text-blue-600 hover:!bg-blue-50 hover:!text-blue-700 !border-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <span className="flex items-center">
                    Start Free Analysis Now
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </Button>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white/90 text-sm">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>No credit card</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>No ads</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Privacy first</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Self-hosted</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center text-white/70 text-xs">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Your data stays with you • No personal data sharing • Setup in 2 minutes
                </div>
              </motion.div>
            </div>
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
              className="bg-white rounded-2xl max-w-lg w-full relative"
            >
              <button
                onClick={() => setShowAuth(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
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
