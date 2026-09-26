import { NextResponse } from 'next/server';
import {database} from '@/db/store';
import {createSession,hashPassword,verifyPassword,signOut,sameOrigin,tokenHash} from '@/app/auth';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'请求来源无效'},{status:403});
 try{
  if(Number(req.headers.get('content-length'))>8192)return NextResponse.json({error:'输入内容过长'},{status:413});
  const raw=await req.text();if(raw.length>8192)return NextResponse.json({error:'输入内容过长'},{status:413});
  const b=JSON.parse(raw);if(b.action==='logout'){await signOut();return NextResponse.json({ok:true});}
  if(!['login','register'].includes(b.action))return NextResponse.json({error:'操作无效'},{status:400});
  const username=String(b.username||'').trim().toLowerCase(),password=String(b.password||'');
  if(!/^[a-z0-9_.-]{3,40}$/.test(username)||password.length<10||password.length>128)return NextResponse.json({error:'用户名使用 3–40 位字母、数字或 _.-，密码使用 10–128 位字符。'},{status:400});
  const ip=req.headers.get('x-vercel-forwarded-for')?.split(',')[0]||req.headers.get('x-forwarded-for')?.split(',')[0]||'local';
  for(const [key,limit] of [[tokenHash('user:'+username),12],[tokenHash('ip:'+ip),40]] as const){
   const result=await database().query("INSERT INTO auth_attempts(key,count,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires_at<now() THEN 1 ELSE auth_attempts.count+1 END,expires_at=CASE WHEN auth_attempts.expires_at<now() THEN now()+interval '15 minutes' ELSE auth_attempts.expires_at END RETURNING count",[key]);
   if(result.rows[0].count>limit)return NextResponse.json({error:'尝试次数较多，请 15 分钟后再试。'},{status:429});
  }
  let userId:string;
  if(b.action==='register'){
   userId=crypto.randomUUID();const hashed=await hashPassword(password);const name=String(b.name||username).trim().slice(0,24)||username;
   await database().query('INSERT INTO users(id,username,password_hash,display_name) VALUES($1,$2,$3,$4)',[userId,username,hashed,name]);
  }else{
   const {rows}=await database().query('SELECT id,password_hash FROM users WHERE username=$1',[username]);const user=rows[0];
   const dummy='00000000000000000000000000000000:'+ '0'.repeat(128);
   const valid=await verifyPassword(password,user?.password_hash||dummy);
   if(!user||!valid)return NextResponse.json({error:'用户名或密码不正确'},{status:401});userId=user.id;
  }
  await createSession(userId);return NextResponse.json({ok:true});
 }catch(e:any){console.error('auth failed',e.code||e.name);return NextResponse.json({error:e.code==='23505'?'这个用户名已被使用，请换一个。':'暂时无法登录，请稍后重试。'},{status:e.code==='23505'?409:503});}
}
