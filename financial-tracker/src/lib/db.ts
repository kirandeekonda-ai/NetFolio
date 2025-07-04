
import { Pool } from 'pg';

let pool: Pool;

export const getDb = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
};
