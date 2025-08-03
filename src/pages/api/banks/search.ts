import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });

    // Get search term from query parameters
    const { q: searchTerm = '', limit = '10' } = req.query;
    const limitCount = parseInt(limit as string, 10) || 10;

    // Search banks using the database function
    const { data: banks, error } = await supabase
      .rpc('search_banks', {
        search_term: searchTerm as string,
        limit_count: limitCount
      });

    if (error) {
      console.error('Error searching banks:', error);
      return res.status(500).json({ error: 'Failed to search banks' });
    }

    return res.status(200).json({ banks: banks || [] });
  } catch (error) {
    console.error('Unexpected error in banks API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
