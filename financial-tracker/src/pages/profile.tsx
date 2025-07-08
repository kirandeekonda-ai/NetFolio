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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {getInitials(user.email)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back!
                </h1>
                <p className="text-gray-600 mb-1">
                  <span className="font-medium">Email:</span> {user.email}
                </p>
                <p className="text-gray-500 text-sm">
                  <span className="font-medium">Member since:</span> {formatDate(user.created_at)}
                </p>
              </div>
              <div className="hidden md:flex flex-col items-end space-y-2">
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Active</span>
                </div>
                <p className="text-gray-500 text-sm">Last login: Today</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-0 overflow-hidden">
            <div className="flex border-b border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {activeTab === 'general' && <UserSettings />}
          {activeTab === 'categories' && <CategoryManager />}
        </motion.div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
