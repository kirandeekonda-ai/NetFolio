import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import bcrypt from 'bcryptjs';
import rateLimit from '../../utils/rateLimit';

// Rate limiter: 5 attempts per 15 minutes per IP
const limiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500, // Limit by IP
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Apply rate limiting - use a combination of IP and user agent for better tracking
    const clientId = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'anonymous';
    await limiter.check(res, 5, clientId.toString());

    const { value, type } = req.body;

    if (!value || !type) {
      return res.status(400).json({ error: 'Value and type are required' });
    }

    if (type !== 'pin' && type !== 'password') {
      return res.status(400).json({ error: 'Invalid protection type' });
    }

    // Validate PIN format
    if (type === 'pin' && !/^\d{4,6}$/.test(value)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    const supabase = createServerSupabaseClient({ req, res });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's balance protection settings
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('balance_protection_enabled, balance_protection_type, balance_protection_hash')
      .eq('user_id', user.id)
      .single();

    if (prefsError) {
      console.error('Error fetching user preferences:', prefsError);
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }

    if (!preferences?.balance_protection_enabled || !preferences?.balance_protection_hash) {
      return res.status(400).json({ error: 'Balance protection not configured' });
    }

    if (preferences.balance_protection_type !== type) {
      return res.status(400).json({ error: 'Incorrect protection type' });
    }

    // Verify the PIN/password
    const isValid = await bcrypt.compare(value, preferences.balance_protection_hash);

    return res.status(200).json({ valid: isValid });

  } catch (error) {
    console.error('Balance protection verification error:', error);
    
    // Check if it's a rate limit error
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
