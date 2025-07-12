import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('=== AUTH TEST ENDPOINT ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Cookies:', req.cookies);

  // Create the supabase client
  const supabase = createPagesServerClient({ req, res });

  // Try to get the session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('Session result:', { 
    hasSession: !!session,
    userId: session?.user?.id,
    error: sessionError 
  });

  // Try to get the user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('User result:', { 
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    error: userError 
  });

  // Return the results
  return res.status(200).json({
    authenticated: !!user,
    user: user ? {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    } : null,
    session: session ? {
      access_token: session.access_token ? 'present' : 'missing',
      refresh_token: session.refresh_token ? 'present' : 'missing',
      expires_at: session.expires_at
    } : null,
    errors: {
      sessionError: sessionError?.message,
      userError: userError?.message
    }
  });
}
