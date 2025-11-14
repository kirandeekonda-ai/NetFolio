import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export function Auth() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [countdown, setCountdown] = useState(180); // 3 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (!showOtpInput || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setMessage('Your code has expired. Please request a new one.');
          setMessageType('error');
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showOtpInput, countdown]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus OTP input when shown
  useEffect(() => {
    if (showOtpInput && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [showOtpInput]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    setMessage('Sending verification code to your email...');
    setMessageType('info');
    
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email: emailValue,
        options: {
          shouldCreateUser: true,
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
        setMessage('✅ Code sent! Check your email.');
        setMessageType('success');
        setShowOtpInput(true);
        setCountdown(180); // Reset countdown to 3 minutes
        setCanResend(false);
        setResendCooldown(60); // 60 second cooldown before allowing resend
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
      setMessageType('error');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setMessage('Please enter the 6-digit code');
      setMessageType('error');
      return;
    }
    
    setIsLoading(true);
    setMessage('Verifying code...');
    setMessageType('info');
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'email',
      });
      
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('expired')) {
          errorMessage = 'This code has expired. Please request a new one.';
          setCanResend(true);
        } else if (error.message.includes('invalid') || error.message.includes('Token')) {
          errorMessage = 'Invalid code. Please check and try again.';
        }
        
        setMessage(errorMessage);
        setMessageType('error');
        setOtp(''); // Clear the OTP input
      } else {
        setMessage('✅ Successfully signed in! Redirecting...');
        setMessageType('success');
        // Session is automatically set by Supabase, router will handle redirect
      }
    } catch (error) {
      setMessage('Verification failed. Please try again.');
      setMessageType('error');
      console.error('OTP verification error:', error);
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || resendCooldown > 0) return;
    
    setIsLoading(true);
    setMessage('Sending new code...');
    setMessageType('info');
    
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        }
      });
      
      if (error) {
        setMessage(error.message.includes('rate') 
          ? 'Please wait before requesting another code.' 
          : 'Failed to resend code. Please try again.');
        setMessageType('error');
      } else {
        setMessage('✅ New code sent! Check your email.');
        setMessageType('success');
        setOtp('');
        setCountdown(180);
        setCanResend(false);
        setResendCooldown(60);
      }
    } catch (error) {
      setMessage('Failed to resend code. Please try again.');
      setMessageType('error');
      console.error('Resend error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  const handleBackToEmail = () => {
    setShowOtpInput(false);
    setOtp('');
    setMessage('');
    setCountdown(180);
    setCanResend(false);
    setResendCooldown(0);
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
    <div className="w-full p-8">
      <AnimatePresence mode="wait">
        {!showOtpInput ? (
          // Email Input Screen
          <motion.div
            key="email-screen"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">N</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in to NetFolio</h2>
              <p className="text-gray-600">Enter your email to receive a verification code</p>
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
                    <span>Send Code</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </>
                )}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                We'll send you a 6-digit code to sign in securely
              </p>
            </div>
          </motion.div>
        ) : (
          // OTP Input Screen
          <motion.div
            key="otp-screen"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <button
                onClick={handleBackToEmail}
                className="absolute top-8 left-8 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">N</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Enter Verification Code</h2>
              <p className="text-gray-600">
                We sent a code to <span className="font-medium text-gray-900">{email}</span>
              </p>
            </div>
            
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  6-Digit Code
                </label>
                <input
                  ref={otpInputRef}
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={handleOtpChange}
                  className="w-full border border-gray-300 px-4 py-3 rounded-lg text-center text-2xl font-semibold tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  maxLength={6}
                  required
                  disabled={isLoading}
                />
              </div>
              
              {/* Countdown Timer */}
              {countdown > 0 && (
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-600">
                    Code expires in <span className="font-semibold text-gray-900">{formatTime(countdown)}</span>
                  </span>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isLoading || otp.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
            
            {/* Resend Code Link */}
            <div className="mt-4 text-center">
              {resendCooldown > 0 ? (
                <p className="text-xs text-gray-500">
                  Resend code in <span className="font-semibold">{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResendCode}
                  disabled={!canResend || isLoading}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Didn't receive a code? Resend
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
    </div>
  );
}
