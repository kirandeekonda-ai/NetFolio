import { FC, ReactNode, useState, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from '@supabase/auth-helpers-react';
import { UserFlowGuide } from '@/components/UserFlowGuide';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/landing', label: 'Home', icon: '🏠' },
  { href: '/bank-accounts', label: 'Bank Accounts', icon: '🏦' },
  { href: '/statements', label: 'Statements', icon: '📄' },
  { href: '/categorize', label: 'Categorize', icon: '🏷️' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/finance', label: 'Portfolio', icon: '📈' },
  { href: '/payments', label: 'Payments', icon: '📅' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export const Layout: FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const session = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      if (!session?.user?.id) return;
      try {
        const today = new Date();
        const monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const { paymentService } = await import('@/services/PaymentService');
        const data = await paymentService.fetchDashboardData(session.user.id, monthYear);
        const count = data.filter(i => i.status !== 'paid' && i.status !== 'skipped').length;
        setPendingCount(count);
      } catch (e) {
        console.error(e);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('payments_updated', updateCount);
      updateCount();
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('payments_updated', updateCount);
    }
  }, [session?.user?.id]);


  // Don't show navigation for unauthenticated users
  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-light-gray">
        <Head>
          <title>NetFolio</title>
          <meta name="description" content="Personal finance tracker" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main className="min-h-screen">
          <div className="container mx-auto p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated layout with navigation
  return (
    <div className="min-h-screen bg-neutral-light-gray">
      <Head>
        <title>NetFolio</title>
        <meta name="description" content="Personal finance tracker" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white shadow-card p-6">
        <div className="w-full">
          <h1 className="text-2xl font-bold text-primary mb-8">NetFolio</h1>
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center space-x-3 px-4 py-2 rounded-button
                    transition-colors duration-200
                    ${router.pathname === item.href
                      ? 'bg-primary text-white'
                      : 'text-neutral-dark-charcoal hover:bg-neutral-light-gray'
                    }
                  `}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.label === 'Payments' && pendingCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-card z-50">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-primary">NetFolio</h1>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-neutral-100"
            >
              <ul className="p-4 space-y-2">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center space-x-3 px-4 py-2 rounded-button
                        transition-colors duration-200
                        ${router.pathname === item.href
                          ? 'bg-primary text-white'
                          : 'text-neutral-dark-charcoal hover:bg-neutral-light-gray'
                        }
                      `}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="md:pl-64 min-h-screen">
        <div className="container mx-auto p-6 pt-20 md:pt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Show UserFlowGuide only on main pages, not onboarding/quick-start */}
            {!router.pathname.includes('/onboarding') &&
              !router.pathname.includes('/quick-start') &&
              !router.pathname.includes('/auth') && (
                <UserFlowGuide />
              )}
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
