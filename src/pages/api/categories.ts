
import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase';
import { Category } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient(req, res);
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .or(`user_id.is.null,user_id.eq.${req.query.userId}`);
        
        if (error) throw error;
        res.status(200).json(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
      }
      break;
    case 'POST':
      try {
        const { name, type, color, userId } = req.body;
        const { data, error } = await supabase
          .from('categories')
          .insert([{ name, type, color, user_id: userId }])
          .select()
          .single();
        
        if (error) throw error;
        res.status(201).json(data);
      } catch (error) {
        console.error('Failed to create category:', error);
        res.status(500).json({ error: 'Failed to create category' });
      }
      break;
    case 'PUT':
      try {
        const { id, name, type, color } = req.body;
        const { data, error } = await supabase
          .from('categories')
          .update({ name, type, color })
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        res.status(200).json(data);
      } catch (error) {
        console.error('Failed to update category:', error);
        res.status(500).json({ error: 'Failed to update category' });
      }
      break;
    case 'DELETE':
      try {
        const { id } = req.body;
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        res.status(204).end();
      } catch (error) {
        console.error('Failed to delete category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
      }
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
