import { Layout } from '@/components/layout/Layout';
import { UserSettings } from '@/components/UserSettings';
import { CategoryManager } from '@/components/CategoryManager';
import { Auth } from '@/components/Auth';
import { Card } from '@/components/Card';
import { supabase } from '@/utils/supabase';
import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const ProfilePage: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!user) {
    return <Auth />;
  }

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'categories', label: 'Categories', icon: '📂' },
  ];

  const getInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Modern Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-8"
          >
            <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
              {/* Profile Avatar Section */}
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-2xl transform hover:scale-105 transition-all duration-300">
                  {getInitials(user.email)}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 border-4 border-white rounded-full shadow-lg"></div>
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg animate-pulse"></div>
              </div>

              {/* Profile Info Section */}
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
                  Welcome back, {user.email.split('@')[0]}!
                </h1>
                <p className="text-gray-600 mb-4 text-lg">
                  Manage your financial profile and preferences
                </p>
                
                {/* User Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white text-lg">📧</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Email Address</p>
                        <p className="text-gray-900 font-semibold">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                        <span className="text-white text-lg">📅</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Member Since</p>
                        <p className="text-gray-900 font-semibold">{formatDate(user.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="flex flex-col items-center lg:items-end space-y-4">
                <div className="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 backdrop-blur-sm px-6 py-3 rounded-2xl">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 font-semibold">Active Status</span>
                </div>
                
                <div className="text-center lg:text-right">
                  <p className="text-gray-500 text-sm font-medium">Last Activity</p>
                  <p className="text-gray-700 font-semibold">Today, Just now</p>
                </div>
                
                <div className="flex space-x-3">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/30 text-center">
                    <p className="text-2xl font-bold text-blue-600">12</p>
                    <p className="text-xs text-gray-600">Statements</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/30 text-center">
                    <p className="text-2xl font-bold text-purple-600">8</p>
                    <p className="text-xs text-gray-600">Categories</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Modern Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
          >
            <div className="flex">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-3 px-8 py-6 text-lg font-semibold transition-all duration-300 relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 bg-gradient-to-r from-blue-50/80 to-indigo-50/80'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-2xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Modern Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
          >
            <div className="p-8">
              {activeTab === 'general' && <UserSettings />}
              {activeTab === 'categories' && <CategoryManager />}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default ProfilePage;
