import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase';
import { LLMProvider } from '@/types/llm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get the user's default active LLM provider
    const { data: provider, error } = await supabase
      .from('llm_providers')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_default', true)
      .single();

    if (error) {
      // If no default provider, try to get any active provider
      const { data: anyProvider, error: anyError } = await supabase
        .from('llm_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (anyError || !anyProvider) {
        return res.status(404).json({ 
          error: 'No active LLM provider found. Please configure an LLM provider in your profile settings.' 
        });
      }

      return res.status(200).json({ provider: anyProvider });
    }

    return res.status(200).json({ provider });
  } catch (error) {
    console.error('Error fetching default LLM provider:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
