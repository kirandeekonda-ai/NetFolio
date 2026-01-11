import { Layout } from '@/components/layout/Layout';
import { UserSettings } from '@/components/UserSettings';
import { CategoryManager } from '@/components/CategoryManager';
import { Auth } from '@/components/Auth';
import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from '@supabase/auth-helpers-react';

const ProfilePage: NextPage = () => {
  const session = useSession();
  const [activeTab, setActiveTab] = useState('general');
  const [statsData, setStatsData] = useState({
    statementsCount: 0,
    categoriesCount: 0,
    accountsCount: 0,
    loading: true,
    lastUpdated: null as Date | null
  });

  // Fetch user stats using API endpoint
  const fetchUserStats = async () => {
    if (!session?.user?.id) {
      setStatsData(prev => ({ ...prev, loading: false, lastUpdated: new Date() }));
      return;
    }

    try {
      setStatsData(prev => ({ ...prev, loading: true }));

      const response = await fetch('/api/user/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const stats = await response.json();

      setStatsData({
        statementsCount: stats.statementsCount,
        categoriesCount: stats.categoriesCount,
        accountsCount: stats.accountsCount,
        loading: false,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setStatsData(prev => ({ ...prev, loading: false, lastUpdated: new Date() }));
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, [session?.user?.id]);

  if (!session?.user) {
    return <Auth />;
  }

  const tabs = [
    { id: 'general', label: 'General Settings', icon: '⚙️' },
    { id: 'categories', label: 'Categories', icon: '📂' },
  ];

  const getInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-6 md:px-4 md:py-8">

          {/* Clean Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 md:mb-8"
          >
            <div className="p-4 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
                <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 text-center md:text-left">
                  {/* Clean Avatar */}
                  <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-white text-xl font-semibold">
                      {getInitials(session.user.email || '')}
                    </span>
                  </div>

                  {/* User Info */}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                      {session.user.email?.split('@')[0]}
                    </h1>
                    <p className="text-gray-600 text-sm mb-3">
                      {session.user.email}
                    </p>
                    <div className="flex items-center justify-center md:justify-start space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Active</span>
                      </div>
                      {statsData.lastUpdated && (
                        <span>Updated {statsData.lastUpdated.toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Clean Stats */}
                <div className="flex items-center space-x-4 md:space-x-8 w-full md:w-auto justify-between md:justify-end px-4 md:px-0">
                  <div className="text-center">
                    <div className="text-lg md:text-2xl font-bold text-gray-900">
                      {statsData.loading ? '...' : statsData.accountsCount}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide">Accounts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg md:text-2xl font-bold text-gray-900">
                      {statsData.loading ? '...' : statsData.statementsCount}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide">Statements</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg md:text-2xl font-bold text-gray-900">
                      {statsData.loading ? '...' : statsData.categoriesCount}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide">Categories</div>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={fetchUserStats}
                    disabled={statsData.loading}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    title="Refresh data"
                  >
                    <svg className={`w-4 h-4 ${statsData.loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Simple Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 md:mb-8 overflow-x-auto"
          >
            <div className="flex border-b border-gray-100 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors duration-200 relative ${activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Clean Content Area */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200"
          >
            <div className="p-4 md:p-8">
              {activeTab === 'general' && <UserSettings />}
              {activeTab === 'categories' && <CategoryManager />}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
