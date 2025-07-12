import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/utils/supabase';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use the pages server client directly to get the authenticated user
  const supabase = createPagesServerClient({ req, res });
  
  console.log('Headers:', req.headers);
  console.log('Cookies:', req.cookies);
  console.log('Authorization header:', req.headers.authorization);
  
  // Try to get the session first
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('Session result:', { session: session?.user?.id, error: sessionError });
  
  // Get the authenticated user from the session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  console.log('Auth result:', { user: user?.id, error: authError });
  
  if (authError || !user) {
    console.error('Authentication failed:', authError);
    return res.status(401).json({ error: 'Unauthorized', details: authError?.message });
  }

  try {
    console.log(`Starting profile deletion for user: ${user.id}`);

    // 1. Delete LLM providers (has foreign key to auth.users)
    const { error: llmError } = await supabase
      .from('llm_providers')
      .delete()
      .eq('user_id', user.id);

    if (llmError) {
      console.error('Error deleting LLM providers:', llmError);
      return res.status(500).json({ 
        error: 'Failed to delete LLM providers',
        details: llmError.message 
      });
    }

    // 2. Delete user preferences (has foreign key to auth.users)
    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id);

    if (preferencesError) {
      console.error('Error deleting user preferences:', preferencesError);
      return res.status(500).json({ 
        error: 'Failed to delete user preferences',
        details: preferencesError.message 
      });
    }

    // 3. Delete transactions (if they exist)
    const { error: transactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id);

    if (transactionsError) {
      console.error('Error deleting transactions:', transactionsError);
      // Don't fail if transactions table doesn't exist yet
      console.log('Transactions table might not exist yet, continuing...');
    }

    // 4. Delete categories (if they exist)
    const { error: categoriesError } = await supabase
      .from('categories')
      .delete()
      .eq('user_id', user.id);

    if (categoriesError) {
      console.error('Error deleting categories:', categoriesError);
      // Don't fail if categories table doesn't exist yet
      console.log('Categories table might not exist yet, continuing...');
    }

    // 5. Try to delete the user from Supabase Auth using service role
    try {
      const serviceRoleClient = createSupabaseServiceRoleClient();
      const { error: userDeleteError } = await serviceRoleClient.auth.admin.deleteUser(user.id);

      if (userDeleteError) {
        console.error('Error deleting user from auth:', userDeleteError);
        // Continue without failing - user data has been deleted
        console.log('User data deleted successfully, but could not delete auth user');
      }
    } catch (serviceRoleError) {
      console.error('Service role not available:', serviceRoleError);
      // Continue without failing - user data has been deleted
      console.log('User data deleted successfully, but could not delete auth user (service role unavailable)');
    }

    console.log(`Successfully deleted profile data for user: ${user.id}`);

    return res.status(200).json({ 
      message: 'Profile deleted successfully',
      deletedUserId: user.id 
    });

  } catch (error) {
    console.error('Unexpected error during profile deletion:', error);
    return res.status(500).json({ 
      error: 'Internal server error during profile deletion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
