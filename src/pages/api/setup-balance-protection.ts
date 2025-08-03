import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { enabled, type, value } = req.body;

    // Validate input
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled must be a boolean' });
    }

    if (enabled) {
      if (!type || !value) {
        return res.status(400).json({ error: 'Type and value are required when enabling protection' });
      }

      if (type !== 'pin' && type !== 'password') {
        return res.status(400).json({ error: 'Type must be either "pin" or "password"' });
      }

      // Validate PIN format
      if (type === 'pin' && !/^\d{4,6}$/.test(value)) {
        return res.status(400).json({ error: 'PIN must be 4-6 digits' });
      }

      // Validate password strength
      if (type === 'password' && value.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
    }

    const supabase = createServerSupabaseClient({ req, res });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let updateData: any = {
      balance_protection_enabled: enabled,
    };

    if (enabled) {
      // Hash the PIN/password
      const saltRounds = 12;
      const hashedValue = await bcrypt.hash(value, saltRounds);

      updateData = {
        ...updateData,
        balance_protection_type: type,
        balance_protection_hash: hashedValue,
      };
    } else {
      // Clear the protection data when disabling
      updateData = {
        ...updateData,
        balance_protection_type: null,
        balance_protection_hash: null,
      };
    }

    // Update user preferences
    const { error: updateError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        ...updateData
      });

    if (updateError) {
      console.error('Error updating balance protection:', updateError);
      return res.status(500).json({ error: 'Failed to update balance protection' });
    }

    return res.status(200).json({ 
      success: true, 
      message: enabled 
        ? 'Balance protection has been enabled' 
        : 'Balance protection has been disabled' 
    });

  } catch (error) {
    console.error('Balance protection setup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
