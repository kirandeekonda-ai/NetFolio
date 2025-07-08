import { FC, ReactNode, useState } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from '@supabase/auth-helpers-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/landing', label: 'Home', icon: '🏠' },
  { href: '/upload', label: 'Upload', icon: '📤' },
  { href: '/categorize', label: 'Categorize', icon: '🏷️' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export const Layout: FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const session = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
