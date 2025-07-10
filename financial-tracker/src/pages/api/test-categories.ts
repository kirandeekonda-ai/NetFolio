import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Create some default categories for testing
    const defaultCategories = [
      { name: 'Groceries', type: 'essential', color: '#10B981', user_id: user.id },
      { name: 'Transportation', type: 'essential', color: '#3B82F6', user_id: user.id },
      { name: 'Entertainment', type: 'lifestyle', color: '#8B5CF6', user_id: user.id },
      { name: 'Dining Out', type: 'lifestyle', color: '#F59E0B', user_id: user.id },
      { name: 'Utilities', type: 'essential', color: '#EF4444', user_id: user.id },
      { name: 'Healthcare', type: 'essential', color: '#06B6D4', user_id: user.id },
      { name: 'Shopping', type: 'lifestyle', color: '#EC4899', user_id: user.id },
      { name: 'Salary', type: 'financial', color: '#22C55E', user_id: user.id },
      { name: 'Investment', type: 'financial', color: '#14B8A6', user_id: user.id },
      { name: 'Insurance', type: 'essential', color: '#F97316', user_id: user.id }
    ];

    console.log(`🧪 TEST CATEGORIES - Creating ${defaultCategories.length} test categories for user:`, user.id);

    // First, check if user already has categories
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    if (existingCategories && existingCategories.length > 0) {
      return res.status(200).json({ 
        message: 'User already has categories', 
        count: existingCategories.length,
        categories: existingCategories 
      });
    }

    // Insert the categories
    const { data, error } = await supabase
      .from('categories')
      .insert(defaultCategories)
      .select();

    if (error) {
      console.error('❌ Error creating test categories:', error);
      return res.status(500).json({ error: 'Failed to create categories', details: error });
    }

    console.log(`✅ TEST CATEGORIES - Successfully created ${data?.length} categories`);

    return res.status(200).json({ 
      message: 'Test categories created successfully', 
      count: data?.length,
      categories: data 
    });

  } catch (error) {
    console.error('❌ Error in test categories API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
