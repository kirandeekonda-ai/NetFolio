
import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/db';
import { Category } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const { rows } = await db.query<Category>('SELECT * FROM categories WHERE user_id IS NULL OR user_id = $1', [req.query.userId]);
        res.status(200).json(rows);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
      }
      break;
    case 'POST':
      try {
        const { name, type, color, userId } = req.body;
        const { rows } = await db.query<Category>(
          'INSERT INTO categories (name, type, color, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
          [name, type, color, userId]
        );
        res.status(201).json(rows[0]);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create category' });
      }
      break;
    case 'PUT':
      try {
        const { id, name, type, color } = req.body;
        const { rows } = await db.query<Category>(
          'UPDATE categories SET name = $1, type = $2, color = $3 WHERE id = $4 RETURNING *',
          [name, type, color, id]
        );
        res.status(200).json(rows[0]);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update category' });
      }
      break;
    case 'DELETE':
      try {
        const { id } = req.body;
        await db.query('DELETE FROM categories WHERE id = $1', [id]);
        res.status(204).end();
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
      }
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
