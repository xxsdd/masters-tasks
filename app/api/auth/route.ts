import {database} from '@/db/store';
import {createSession,hashPassword,verifyPassword,signOut,sameOrigin,tokenHash} from '@/app/auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const dummy='00000000000000000000000000000000:'+'0'.repeat(128);
class AuthError extends Error {constructor(message:string,public status=400){super(message)}}

async function limit(key:string,max:number){
 const {rows}=await database().query(`INSERT INTO auth_attempts(key,count,expires_at) VALUES($1,1,now()+interval '15 minutes')
  ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires_at<now() THEN 1 ELSE auth_attempts.count+1 END,
  expires_at=CASE WHEN auth_attempts.expires_at<now() THEN now()+interval '15 minutes' ELSE auth_attempts.expires_at END RETURNING count`,[tokenHash(key)]);
 if(rows[0].count>max)throw new AuthError('尝试次数较多，请 15 分钟后再试',429);
}

export async function POST(req:Request){
 if(!sameOrigin(req))return reply({error:'请求来源无效'},403);
 try{
  if(Number(req.headers.get('content-length'))>8192)throw new AuthError('输入内容过长',413);
  const raw=await req.text();if(raw.length>8192)throw new AuthError('输入内容过长',413);
  let b;try{b=JSON.parse(raw)}catch{throw new AuthError('请求格式不正确')}
  if(!b||typeof b!=='object'||Array.isArray(b))throw new AuthError('请求格式不正确');
  if(b.action==='logout'){await signOut();return reply({ok:true})}
  if(!['login','register'].includes(b.action))throw new AuthError('操作无效');

  const ip=req.headers.get('x-vercel-forwarded-for')?.split(',')[0]||req.headers.get('x-forwarded-for')?.split(',')[0]||'local';
  await limit('auth-ip:'+ip,60);
  const username=String(b.username||'').trim().toLowerCase(),password=String(b.password||'');
  if(!/^[a-z0-9_.-]{3,40}$/.test(username))throw new AuthError('账户 ID 使用 3–40 位字母、数字或 _.-');
  if(password.length<10||password.length>128)throw new AuthError('密码需要 10–128 位字符');
  await limit('auth-user:'+username,12);

  let userId:string;
  if(b.action==='register'){
   userId=crypto.randomUUID();
   const name=String(b.name||username).trim().slice(0,24)||username;
   await database().query('INSERT INTO users(id,username,password_hash,display_name) VALUES($1,$2,$3,$4)',[userId,username,await hashPassword(password),name]);
  }else{
   const {rows}=await database().query('SELECT id,password_hash FROM users WHERE username=$1',[username]);const user=rows[0];
   const valid=await verifyPassword(password,user?.password_hash||dummy);
   if(!user||!valid)throw new AuthError('账户 ID 或密码不正确',401);
   userId=user.id;
  }
  await createSession(userId);
  return reply({ok:true});
 }catch(e:any){
  console.error('auth failed',e.code||e.name);
  return reply({error:e instanceof AuthError?e.message:e.code==='23505'?'这个账户 ID 已被使用，请更换或登录原有账号。':'操作暂时失败，请稍后重试。'},e instanceof AuthError?e.status:e.code==='23505'?409:503);
 }
}
