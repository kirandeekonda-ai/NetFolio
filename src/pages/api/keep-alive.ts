import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Perform a simple readonly operation on categories table
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, type')
      .limit(1);

    if (error) {
      console.error('Keep-alive DB error:', error);
      return res.status(500).json({ 
        status: 'error', 
        error: 'Database operation failed',
        timestamp: new Date().toISOString() 
      });
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Keep alive successful',
      database_active: true,
      categories_queried: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Keep-alive error:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}
