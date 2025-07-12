import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase';
import { LLMProvider, LLMProviderCreate, LLMProviderUpdate } from '@/types/llm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createSupabaseServerClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(supabase, user.id, res);
      case 'POST':
        return await handlePost(supabase, user.id, req.body, res);
      case 'PUT':
        return await handlePut(supabase, user.id, req.query.id as string, req.body, res);
      case 'DELETE':
        return await handleDelete(supabase, user.id, req.query.id as string, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('LLM providers API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(supabase: any, userId: string, res: NextApiResponse) {
  const { data: providers, error } = await supabase
    .from('llm_providers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ providers });
}

async function handlePost(supabase: any, userId: string, body: LLMProviderCreate, res: NextApiResponse) {
  // Validate required fields
  if (!body.name || !body.provider_type) {
    return res.status(400).json({ 
      error: 'Missing required fields: name, provider_type' 
    });
  }

  // If this is the first provider for the user, make it default
  const { data: existingProviders } = await supabase
    .from('llm_providers')
    .select('id')
    .eq('user_id', userId);

  const isFirstProvider = !existingProviders || existingProviders.length === 0;

  const providerData = {
    ...body,
    user_id: userId,
    is_active: body.is_active ?? true,
    is_default: body.is_default ?? isFirstProvider
  };

  const { data: provider, error } = await supabase
    .from('llm_providers')
    .insert([providerData])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ provider });
}

async function handlePut(supabase: any, userId: string, providerId: string, body: LLMProviderUpdate, res: NextApiResponse) {
  if (!providerId) {
    return res.status(400).json({ error: 'Provider ID is required' });
  }

  const { data: provider, error } = await supabase
    .from('llm_providers')
    .update(body)
    .eq('id', providerId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  return res.status(200).json({ provider });
}

async function handleDelete(supabase: any, userId: string, providerId: string, res: NextApiResponse) {
  if (!providerId) {
    return res.status(400).json({ error: 'Provider ID is required' });
  }

  // Check if this is the only active provider
  const { data: activeProviders } = await supabase
    .from('llm_providers')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (activeProviders && activeProviders.length === 1 && activeProviders[0].id === providerId) {
    return res.status(400).json({ 
      error: 'Cannot delete the only active LLM provider. Add another provider first.' 
    });
  }

  const { error } = await supabase
    .from('llm_providers')
    .delete()
    .eq('id', providerId)
    .eq('user_id', userId);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ message: 'Provider deleted successfully' });
}
