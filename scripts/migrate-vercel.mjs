import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;
if(!url)throw new Error('Set DATABASE_URL before running the migration.');
const pool=new Pool({connectionString:url,max:1});const client=await pool.connect();
try{await client.query('BEGIN');await client.query(await readFile(new URL('../db/vercel-schema.sql',import.meta.url),'utf8'));await client.query('COMMIT');console.log('PostgreSQL schema ready.');}catch(e){await client.query('ROLLBACK');throw e}finally{client.release();await pool.end()}
