import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export function Auth() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailValue = email.trim();
    
    if (!emailValue) {
      setMessage('Please enter your email address');
      setMessageType('error');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setMessage('Please enter a valid email address');
      setMessageType('error');
      return;
    }
    
    setIsLoading(true);
    setMessage('Sending magic link to your email...');
    setMessageType('info');
    
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email: emailValue,
        options: {
          emailRedirectTo: `${window.location.origin}/landing`
        }
      });
      
      if (error) {
        // Provide user-friendly error messages
        let errorMessage = error.message;
        if (error.message.includes('rate')) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
        } else if (error.message.includes('invalid')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        setMessage(errorMessage);
        setMessageType('error');
      } else {
        setMessage('✅ Check your email for the login link!');
        setMessageType('success');
        // Optionally clear the email field on success
        // setEmail('');
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
      setMessageType('error');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageStyles = () => {
    switch (messageType) {
      case 'success':
        return 'text-green-600 bg-green-50 border border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border border-red-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border border-gray-200';
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to NetFolio</h2>
        <p className="text-gray-600 text-sm">Enter your email to receive a secure login link</p>
      </div>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading || !email.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Sending...</span>
            </>
          ) : (
            <>
              <span>Send Magic Link</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </>
          )}
        </button>
      </form>
      
      {message && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`mt-6 p-3 rounded-lg text-sm ${getMessageStyles()}`}
          >
            <div className="flex items-start space-x-2">
              {messageType === 'success' && (
                <motion.svg 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </motion.svg>
              )}
              {messageType === 'error' && (
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {messageType === 'info' && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent flex-shrink-0 mt-0.5"></div>
              )}
              <p className="flex-1">{message}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
      
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          We'll send you a secure link to sign in without a password
        </p>
      </div>
    </div>
  );
}
