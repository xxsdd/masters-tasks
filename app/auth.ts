import { cookies } from 'next/headers';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { database } from '@/db/store';
const scrypt=promisify(scryptCallback);
export const SESSION_COOKIE=process.env.NODE_ENV==='production'?'__Host-task-session':'task-session';
export const tokenHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64) as Buffer;return `${salt}:${hash.toString('hex')}`;}
export async function verifyPassword(password:string,stored:string){const [salt,hex]=stored.split(':');const key=await scrypt(password,salt,64) as Buffer;const expected=Buffer.from(hex,'hex');return expected.length===key.length&&timingSafeEqual(key,expected);}
export async function getUser(){const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token||!/^[0-9a-f]{64}$/.test(token))return null;const {rows}=await database().query('SELECT u.id,u.username,u.display_name,u.email,u.email_verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[tokenHash(token)]);const u=rows[0];return u?{userId:u.id,displayName:u.display_name,username:u.username,email:u.email as string|null,emailVerified:!!u.email_verified_at}:null;}
export async function createSession(userId:string){const token=randomBytes(32).toString('hex');await database().query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",[tokenHash(token),userId]);const jar=await cookies();jar.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*86400});}
export async function signOut(){const jar=await cookies(),token=jar.get(SESSION_COOKIE)?.value;if(token)await database().query('DELETE FROM sessions WHERE token_hash=$1',[tokenHash(token)]);jar.set(SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});}
export function sameOrigin(req:Request){const url=new URL(req.url);const host=req.headers.get('host')||url.host;const protocol=process.env.VERCEL?'https:':url.protocol;return req.headers.get('origin')===`${protocol}//${host}`;}
