import { NextApiResponse } from 'next';

interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

interface TokenCount {
  count: number;
  resetTime: number;
}

export default function rateLimit(options: RateLimitOptions) {
  const tokenCache = new Map<string, TokenCount>();

  return {
    check: async (res: NextApiResponse, limit: number, token: string) => {
      const tokenCount = tokenCache.get(token) || { count: 0, resetTime: 0 };
      
      if (tokenCount.resetTime < Date.now()) {
        tokenCount.count = 0;
        tokenCount.resetTime = Date.now() + options.interval;
      }

      tokenCount.count += 1;

      const totalHits = tokenCount.count;
      const timeUntilReset = Math.round((tokenCount.resetTime - Date.now()) / 1000) || 1;

      tokenCache.set(token, tokenCount);

      if (totalHits >= limit) {
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - totalHits));
        res.setHeader('X-RateLimit-Reset', tokenCount.resetTime.toString());
        throw { status: 429, error: 'Rate limit exceeded' };
      }

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - totalHits));
      res.setHeader('X-RateLimit-Reset', tokenCount.resetTime.toString());
    },
  };
}
