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

const COLLAPSED_KEY = 'netfolio_sidebar_collapsed';

export const Layout: FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const session = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Restore sidebar preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY);
      if (stored !== null) setIsCollapsed(stored === 'true');
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  };

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

  const sidebarWidth = isCollapsed ? 'w-[68px]' : 'w-64';
  const mainPadding = isCollapsed ? 'md:pl-[68px]' : 'md:pl-64';

  return (
    <div className="min-h-screen bg-neutral-light-gray">
      <Head>
        <title>NetFolio</title>
        <meta name="description" content="Personal finance tracker" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Desktop Sidebar */}
      <motion.nav
        animate={{ width: isCollapsed ? 68 : 256 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex fixed left-0 top-0 h-screen bg-white shadow-card flex-col overflow-hidden z-40"
        style={{ minWidth: isCollapsed ? 68 : 256 }}
      >
        {/* Logo */}
        <div className={`flex items-center px-4 py-6 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          {isCollapsed ? (
            <span className="text-2xl font-extrabold text-primary select-none">N</span>
          ) : (
            <h1 className="text-2xl font-bold text-primary whitespace-nowrap">NetFolio</h1>
          )}
        </div>

        {/* Nav items */}
        <ul className="flex-1 space-y-1 px-2 overflow-hidden">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href ||
              (item.href !== '/landing' && router.pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`
                    flex items-center rounded-button transition-colors duration-200 group relative
                    ${isCollapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-4 py-2'}
                    ${isActive
                      ? 'bg-primary text-white'
                      : 'text-neutral-dark-charcoal hover:bg-neutral-light-gray'
                    }
                  `}
                >
                  <span className="text-lg flex-shrink-0">{item.icon}</span>

                  {/* Label — hidden when collapsed */}
                  {!isCollapsed && (
                    <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                  )}

                  {/* Payments badge */}
                  {item.label === 'Payments' && pendingCount > 0 && (
                    <span className={`bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0 ${isCollapsed ? 'absolute top-1.5 right-1.5' : 'ml-auto'}`}>
                      {pendingCount}
                    </span>
                  )}

                  {/* Tooltip when collapsed */}
                  {isCollapsed && (
                    <span className="
                      absolute left-full ml-3 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded
                      opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50
                      transition-opacity duration-150
                    ">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Collapse toggle button */}
        <div className={`px-2 py-4 border-t border-gray-100 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`
              flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100
              rounded-lg transition-colors duration-200 font-medium
              ${isCollapsed ? 'p-2' : 'px-4 py-2 w-full'}
            `}
          >
            <motion.svg
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              className="w-4 h-4 flex-shrink-0"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </motion.svg>
            {!isCollapsed && <span className="whitespace-nowrap">Collapse</span>}
          </button>
        </div>
      </motion.nav>

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
                      {item.label === 'Payments' && pendingCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content — shifts with sidebar */}
      <motion.main
        animate={{ paddingLeft: isCollapsed ? 68 : 256 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:block min-h-screen"
      >
        <div className="mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {!router.pathname.includes('/onboarding') &&
              !router.pathname.includes('/quick-start') &&
              !router.pathname.includes('/auth') && (
                <UserFlowGuide />
              )}
            {children}
          </motion.div>
        </div>
      </motion.main>

      {/* Mobile main (no sidebar shift) */}
      <main className="md:hidden min-h-screen pt-16">
        <div className="container mx-auto p-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
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
