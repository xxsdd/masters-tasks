import {createHmac, randomInt} from 'node:crypto';
import {database} from '@/db/store';
import {tokenHash} from './auth';

export const emailReady=()=>!!(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM);
export class AuthError extends Error {constructor(message:string,public status=400){super(message)}}
export function cleanEmail(value:unknown){
  const email=String(value||'').trim().toLowerCase();
  if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw new AuthError('请输入有效的邮箱地址');
  return email;
}
export const maskEmail=(email:string)=>{const [name,domain]=email.split('@');return name.slice(0,2)+'***@'+domain};
export function codeHash(id:string,code:string){
  const key=process.env.EMAIL_CODE_SECRET||process.env.RESEND_API_KEY;
  if(!key)throw new AuthError('邮箱服务尚未启用',503);
  return createHmac('sha256',key).update(id+':'+code).digest('hex');
}
export async function limit(key:string,max:number,seconds=900){
  const {rows}=await database().query(`INSERT INTO auth_attempts(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second')
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires_at<now() THEN 1 ELSE auth_attempts.count+1 END,
    expires_at=CASE WHEN auth_attempts.expires_at<now() THEN now()+$2*interval '1 second' ELSE auth_attempts.expires_at END RETURNING count`,[tokenHash(key),seconds]);
  if(rows[0].count>max)throw new AuthError(seconds===60?'请等待 60 秒后再发送验证码':'尝试次数较多，请 15 分钟后再试',429);
}
export async function sendChallenge(purpose:string,email:string,userId:string|null,payload:Record<string,string>={}){
  if(!emailReady())throw new AuthError('邮箱服务尚未启用，请稍后再试',503);
  await limit('email-minute:'+email,1,60);
  await limit('email-total:'+email,8);
  const id=crypto.randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0');
  await database().query('DELETE FROM email_challenges WHERE expires_at<now()');
  await database().query("INSERT INTO email_challenges(id,purpose,user_id,email,code_hash,payload,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '10 minutes')",[id,purpose,userId,email,codeHash(id,code),JSON.stringify(payload)]);
  const title=purpose==='reset'?'重设密码':purpose==='login'?'登录验证':purpose==='bind'?'绑定邮箱':'注册验证';
  try{
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':id},
      body:JSON.stringify({from:process.env.EMAIL_FROM,to:[email],subject:`主人的任务 · ${title}`,
        text:`你正在进行${title}。验证码：${code}，10 分钟内有效，只能使用一次。请勿将验证码告知他人。如果不是你本人操作，请忽略这封邮件。`}),
      signal:AbortSignal.timeout(12000)
    });
    if(!response.ok)throw new Error('MAIL_DELIVERY_FAILED');
  }catch{
    await database().query('DELETE FROM email_challenges WHERE id=$1',[id]);
    throw new AuthError('验证码发送失败，请稍后再试或联系网站管理员',503);
  }
  return {challengeId:id,email:maskEmail(email),message:'验证码已发送，10 分钟内有效'};
}
