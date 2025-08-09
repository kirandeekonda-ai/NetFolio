import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface BalanceProtectionConfig {
  enabled: boolean;
  type: 'pin' | 'password' | null;
}

interface UseBalanceProtectionReturn {
  isProtected: boolean;
  isUnlocked: boolean;
  protectionType: 'pin' | 'password' | null;
  isLoading: boolean;
  error: string | null;
  unlock: () => void;
  lock: () => void;
  checkProtectionStatus: () => Promise<void>;
}

export const useBalanceProtection = (): UseBalanceProtectionReturn => {
  const [config, setConfig] = useState<BalanceProtectionConfig>({
    enabled: false,
    type: null,
  });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useSupabaseClient();

  const checkProtectionStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: preferences, error: prefsError } = await supabase
        .from('user_preferences')
        .select('balance_protection_enabled, balance_protection_type')
        .single();

      if (prefsError) {
        console.error('Error fetching balance protection status:', prefsError);
        
        // If no preferences record exists, user doesn't have protection enabled
        if (prefsError.code === 'PGRST116') {
          setConfig({
            enabled: false,
            type: null,
          });
          setIsUnlocked(true); // If no protection, everything is unlocked
          return;
        }
        
        setError('Failed to load protection settings');
        return;
      }

      setConfig({
        enabled: preferences?.balance_protection_enabled || false,
        type: preferences?.balance_protection_type || null,
      });

      // If protection is disabled, auto-unlock
      if (!preferences?.balance_protection_enabled) {
        setIsUnlocked(true);
      }
    } catch (err) {
      console.error('Balance protection check error:', err);
      setError('Failed to check protection status');
    } finally {
      setIsLoading(false);
    }
  };

  const unlock = () => {
    setIsUnlocked(true);
    setError(null);
  };

  const lock = () => {
    setIsUnlocked(false);
    setError(null);
  };

  // Auto-lock after 5 minutes of inactivity
  useEffect(() => {
    if (!config.enabled || !isUnlocked) return;

    const timeout = setTimeout(() => {
      lock();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearTimeout(timeout);
  }, [isUnlocked, config.enabled]);

  // Check protection status on mount
  useEffect(() => {
    checkProtectionStatus();
  }, []);

  return {
    isProtected: config.enabled,
    isUnlocked,
    protectionType: config.type,
    isLoading,
    error,
    unlock,
    lock,
    checkProtectionStatus,
  };
};
