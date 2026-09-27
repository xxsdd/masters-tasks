import { Pool, type PoolClient } from 'pg';
const globalDb = globalThis as unknown as { taskPool?: Pool };
export function database() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('DATABASE_NOT_CONFIGURED');
  return globalDb.taskPool ??= new Pool({ connectionString, max: 4, idleTimeoutMillis: 20000, connectionTimeoutMillis: 10000 });
}
export async function roomFor(userId: string, client?: PoolClient, lock = false) {
  const db = client || database();
  const result = await db.query('SELECT r.*,m.mode FROM rooms r JOIN members m ON r.id=m.room_id WHERE m.user_id=$1' + (lock ? ' FOR UPDATE OF r' : ''), [userId]);
  return result.rows[0] || null;
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database().connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
