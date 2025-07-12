
import { createClient } from '@supabase/supabase-js';
import { createPagesServerClient, createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side Supabase client (for backwards compatibility)
export const supabase = createPagesBrowserClient();

// Server-side Supabase client with user session (for API routes)
export function createSupabaseServerClient(req: NextApiRequest, res: NextApiResponse) {
  return createPagesServerClient({ req, res });
}

// Service role client for admin operations (like deleting users)
export function createSupabaseServiceRoleClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}
