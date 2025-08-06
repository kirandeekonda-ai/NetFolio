import { useEffect, useRef } from 'react';

interface UseKeepAliveOptions {
  url?: string;
  enabled?: boolean;
  interval?: number; // in milliseconds, default 5 minutes
}

export const useKeepAlive = (options: UseKeepAliveOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { url, enabled = false, interval = 5 * 60 * 1000 } = options; // 5 minutes default

  const pingUrl = async (targetUrl: string) => {
    try {
      console.log(`[KeepAlive] Pinging: ${targetUrl}`);
      const response = await fetch(targetUrl, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        // Only try to parse JSON if the response is actually JSON
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            console.log(`[KeepAlive] Success:`, data);
          } catch (jsonError) {
            console.warn(`[KeepAlive] Response received but not valid JSON:`, jsonError);
          }
        } else {
          // For non-JSON responses (like HTML pages), just log success
          console.log(`[KeepAlive] Success: Received ${contentType || 'unknown'} response`);
        }
      } else {
        console.warn(`[KeepAlive] Failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('[KeepAlive] Error:', error);
    }
  };

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start new interval if enabled and URL is provided
    if (enabled && url) {
      console.log(`[KeepAlive] Starting keep-alive for ${url} every ${interval / 1000} seconds`);
      
      // Ping immediately on start
      pingUrl(url);
      
      // Set up recurring pings
      intervalRef.current = setInterval(() => {
        pingUrl(url);
      }, interval);
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        console.log('[KeepAlive] Cleaning up interval');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [url, enabled, interval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};
