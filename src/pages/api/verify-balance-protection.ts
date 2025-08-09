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
  // Set JSON content type
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Apply rate limiting - use a combination of IP and user agent for better tracking
    const clientId = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'anonymous';
    
    try {
      await limiter.check(res, 5, clientId.toString());
    } catch (rateLimitError: any) {
      console.log('Rate limit error:', rateLimitError);
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }

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
      console.error('User authentication error:', userError);
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
      
      // If the record doesn't exist, create one with default values
      if (prefsError.code === 'PGRST116') {
        console.log('No user preferences found, creating default record');
        const { data: newPrefs, error: createError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            balance_protection_enabled: false,
            balance_protection_type: 'pin',
            balance_protection_hash: null
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating user preferences:', createError);
          return res.status(500).json({ error: 'Failed to create user preferences' });
        }
        
        return res.status(400).json({ error: 'Balance protection not configured' });
      }
      
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }

    if (!preferences?.balance_protection_enabled || !preferences?.balance_protection_hash) {
      return res.status(400).json({ error: 'Balance protection not configured' });
    }

    if (preferences.balance_protection_type !== type) {
      return res.status(400).json({ error: 'Incorrect protection type' });
    }

    // Verify the PIN/password
    let isValid = false;
    try {
      isValid = await bcrypt.compare(value, preferences.balance_protection_hash);
    } catch (bcryptError) {
      console.error('Bcrypt comparison error:', bcryptError);
      return res.status(500).json({ error: 'Password verification failed' });
    }

    return res.status(200).json({ valid: isValid });

  } catch (error: any) {
    console.error('Balance protection verification error:', error);
    
    // Always return valid JSON
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
