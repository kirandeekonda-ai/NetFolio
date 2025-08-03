import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const supabase = createSupabaseServerClient(req, res);
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get stats in parallel
    const [statementsResult, accountsResult, categoriesResult, userPreferencesResult] = await Promise.all([
      // Statements count
      supabase
        .from('bank_statements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      
      // Accounts count
      supabase
        .from('bank_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      
      // Categories from categories table
      supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      
      // Categories from user_preferences (alternative source)
      supabase
        .from('user_preferences')
        .select('categories')
        .eq('user_id', user.id)
        .single()
    ]);

    // Calculate categories count from both sources
    let categoriesCount = 0;
    
    // Check if user_preferences has categories (this seems to be the primary source)
    if (userPreferencesResult.data?.categories && Array.isArray(userPreferencesResult.data.categories)) {
      categoriesCount = userPreferencesResult.data.categories.length;
    } else if (categoriesResult.count !== null) {
      // Fallback to categories table
      categoriesCount = categoriesResult.count;
    }

    const stats = {
      statementsCount: statementsResult.count || 0,
      accountsCount: accountsResult.count || 0,
      categoriesCount: categoriesCount,
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
}
