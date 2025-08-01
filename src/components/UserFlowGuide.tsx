import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface UserState {
  hasAccounts: boolean;
  hasTransactions: boolean;
  hasUncategorized: boolean;
  transactionCount: number;
  uncategorizedCount: number;
}

interface GuideCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: {
    text: string;
    href: string;
  };
  condition: (state: UserState) => boolean;
  priority: number;
}

const DISMISSED_GUIDES_KEY = 'netfolio_dismissed_guides';

export const UserFlowGuide: React.FC = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [userState, setUserState] = useState<UserState | null>(null);
  const [dismissedGuides, setDismissedGuides] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dismissed guides from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_GUIDES_KEY);
    if (dismissed) {
      setDismissedGuides(JSON.parse(dismissed));
    }
  }, []);

  // Fetch user state
  useEffect(() => {
    const fetchUserState = async () => {
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has bank accounts
        const { data: accounts } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('user_id', session.user.id);

        // For now, mock transaction data since we don't have a transactions table
        // In a real app, this would query the transactions table
        const mockUserState: UserState = {
          hasAccounts: (accounts?.length || 0) > 0,
          hasTransactions: false, // Will be updated when transactions table exists
          hasUncategorized: false,
          transactionCount: 0,
          uncategorizedCount: 0
        };

        setUserState(mockUserState);
      } catch (error) {
        console.error('Error fetching user state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserState();
  }, [session, supabase]);

  const dismissGuide = (guideId: string) => {
    const newDismissed = [...dismissedGuides, guideId];
    setDismissedGuides(newDismissed);
    localStorage.setItem(DISMISSED_GUIDES_KEY, JSON.stringify(newDismissed));
  };

  // Define guidance cards
  const guideCards: GuideCard[] = [
    {
      id: 'no_accounts',
      title: 'Add Your First Bank Account',
      description: 'Start tracking your finances by adding your primary bank account with starting balance.',
      icon: '🏦',
      action: {
        text: 'Add Account',
        href: '/bank-accounts'
      },
      condition: (state) => !state.hasAccounts,
      priority: 1
    },
    {
      id: 'no_transactions',
      title: 'Upload Your First Statement',
      description: 'Import your bank statements to automatically extract and categorize transactions.',
      icon: '📄',
      action: {
        text: 'Upload Statement',
        href: '/statements'
      },
      condition: (state) => state.hasAccounts && !state.hasTransactions,
      priority: 2
    },
    {
      id: 'uncategorized_transactions',
      title: 'Categorize Your Transactions',
      description: `You have ${userState?.uncategorizedCount || 0} uncategorized transactions. Organize them to get better insights.`,
      icon: '🏷️',
      action: {
        text: 'Categorize Now',
        href: '/categorize'
      },
      condition: (state) => state.hasUncategorized && state.uncategorizedCount > 5,
      priority: 3
    },
    {
      id: 'explore_analytics',
      title: 'Explore Your Financial Insights',
      description: 'Now that you have categorized transactions, explore detailed analytics and spending trends.',
      icon: '📊',
      action: {
        text: 'View Analytics',
        href: '/dashboard'
      },
      condition: (state) => state.hasTransactions && !state.hasUncategorized && state.transactionCount > 10,
      priority: 4
    }
  ];

  if (isLoading || !userState || !session?.user) {
    return null;
  }

  // Find the highest priority guide that should be shown
  const activeGuide = guideCards
    .filter(guide => 
      guide.condition(userState) && 
      !dismissedGuides.includes(guide.id)
    )
    .sort((a, b) => a.priority - b.priority)[0];

  if (!activeGuide) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full -mr-10 -mt-10 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="text-3xl">{activeGuide.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    {activeGuide.title}
                  </h3>
                  <p className="text-blue-800 mb-4">
                    {activeGuide.description}
                  </p>
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => router.push(activeGuide.action.href)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
                    >
                      {activeGuide.action.text}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => dismissGuide(activeGuide.id)}
                      className="text-blue-700 hover:text-blue-800 px-3 py-2 text-sm"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => dismissGuide(activeGuide.id)}
                className="text-blue-400 hover:text-blue-600 transition-colors ml-4"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
