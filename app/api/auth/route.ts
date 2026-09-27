import {database,transaction} from '@/db/store';
import {createSession,getUser,hashPassword,verifyPassword,signOut,sameOrigin,tokenHash} from '@/app/auth';
import {emailReady,cleanEmail,maskEmail,codeHash,sendChallenge,limit,AuthError} from '@/app/mail';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const dummy='00000000000000000000000000000000:'+ '0'.repeat(128);
function passwordValue(value:unknown){const p=String(value||'');if(p.length<10||p.length>128)throw new AuthError('密码需要 10–128 位字符');return p;}
export async function GET(){return reply({emailReady:emailReady()});}
export async function POST(req:Request){
 if(!sameOrigin(req))return reply({error:'请求来源无效'},403);
 try{
  const raw=await req.text();if(raw.length>8192)throw new AuthError('输入内容过长',413);
  const b=JSON.parse(raw);
  if(b.action==='logout'){await signOut();return reply({ok:true});}
  const ip=req.headers.get('x-vercel-forwarded-for')?.split(',')[0]||req.headers.get('x-forwarded-for')?.split(',')[0]||'local';
  await limit('auth-ip:'+ip,60);

  if(b.action==='verify'){
    if(!/^[a-f0-9-]{36}$/i.test(b.challengeId||'')||!/^\d{6}$/.test(b.code||''))throw new AuthError('请输入 6 位数字验证码');
    const session=await getUser();
    const newHash=b.newPassword?await hashPassword(passwordValue(b.newPassword)):null;
    // Returning errors commits failed-attempt counters; throwing would roll them back.
    const result=await transaction(async db=>{
      const {rows}=await db.query('SELECT * FROM email_challenges WHERE id=$1 FOR UPDATE',[b.challengeId]);
      const c=rows[0];
      if(!c||new Date(c.expires_at).getTime()<Date.now()||c.attempts>=6)return {error:'验证码已失效，请重新发送'};
      await db.query('UPDATE email_challenges SET attempts=attempts+1 WHERE id=$1',[c.id]);
      if(codeHash(c.id,b.code)!==c.code_hash)return {error:'验证码不正确，请重新输入'};
      let userId=c.user_id;
      if(c.purpose==='register'){
        userId=crypto.randomUUID();
        await db.query('INSERT INTO users(id,username,password_hash,display_name,email,email_verified_at) VALUES($1,$2,$3,$4,$5,now())',[userId,c.payload.username,c.payload.passwordHash,c.payload.name,c.email]);
      }else{
        const {rows:users}=await db.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[userId]);
        const user=users[0];
        if(!user)return {error:'账号不存在，请重新操作'};
        if(c.purpose==='bind'){
          if(session?.userId!==userId||c.payload.passwordStamp!==tokenHash(user.password_hash))return {error:'登录状态已改变，请重新登录后绑定'};
          if(user.email_verified_at)return {error:'邮箱已绑定，请刷新页面'};
          await db.query('UPDATE users SET email=$1,email_verified_at=now() WHERE id=$2',[c.email,userId]);
        }else if(c.purpose==='login'||c.purpose==='reset'){
          if(user.email!==c.email||!user.email_verified_at||c.payload.passwordStamp!==tokenHash(user.password_hash))return {error:'账号信息已改变，请重新操作'};
          if(c.purpose==='reset'){
            if(!newHash)return {error:'请填写至少 10 位的新密码'};
            await db.query('UPDATE users SET password_hash=$1 WHERE id=$2',[newHash,userId]);
            await db.query('DELETE FROM sessions WHERE user_id=$1',[userId]);
          }
        }else return {error:'验证请求无效'};
      }
      await db.query('DELETE FROM email_challenges WHERE id=$1 OR user_id=$2 OR (purpose=$3 AND email=$4)',[c.id,userId,c.purpose,c.email]);
      return {userId,purpose:c.purpose};
    });
    if(result.error)throw new AuthError(result.error);
    if(result.purpose==='login'||result.purpose==='register')await createSession(result.userId);
    return reply({ok:true,reset:result.purpose==='reset',message:result.purpose==='reset'?'密码已重设，请使用新密码登录':'邮箱验证成功'});
  }

  if(b.action==='forgot'){
    if(!emailReady())throw new AuthError('邮箱找回尚未启用，请等待网站接通发信服务',503);
    const email=cleanEmail(b.email);await limit('forgot:'+email,8);
    const {rows}=await database().query('SELECT id,password_hash FROM users WHERE email=$1 AND email_verified_at IS NOT NULL',[email]);
    let result={challengeId:crypto.randomUUID() as string,email:maskEmail(email)};
    if(rows[0])result=await sendChallenge('reset',email,rows[0].id,{passwordStamp:tokenHash(rows[0].password_hash)});
    return reply({...result,message:'如果此邮箱已验证并绑定账号，你会收到重设密码的验证码。'});
  }

  if(b.action==='bindEmail'){
    const user=await getUser();if(!user)throw new AuthError('请先登录',401);
    await limit('bind:'+user.userId,8);
    const email=cleanEmail(b.email),password=passwordValue(b.password);
    const {rows}=await database().query('SELECT password_hash,email_verified_at FROM users WHERE id=$1',[user.userId]);
    if(!await verifyPassword(password,rows[0].password_hash))throw new AuthError('当前密码不正确',401);
    if(rows[0].email_verified_at)throw new AuthError('邮箱已经验证，当前暂不支持更换绑定邮箱');
    return reply(await sendChallenge('bind',email,user.userId,{passwordStamp:tokenHash(rows[0].password_hash)}));
  }

  if(!['login','register'].includes(b.action))throw new AuthError('操作无效');
  const username=String(b.username||'').trim().toLowerCase(),password=passwordValue(b.password);
  if(!/^[a-z0-9_.-]{3,40}$/.test(username))throw new AuthError('用户名使用 3–40 位字母、数字或 _.-');
  await limit('auth-user:'+username,12);
  let userId:string;
  if(b.action==='register'){
    const hashed=await hashPassword(password),name=String(b.name||username).trim().slice(0,24)||username;
    if(emailReady())return reply(await sendChallenge('register',cleanEmail(b.email),null,{username,passwordHash:hashed,name}));
    userId=crypto.randomUUID();
    await database().query('INSERT INTO users(id,username,password_hash,display_name) VALUES($1,$2,$3,$4)',[userId,username,hashed,name]);
  }else{
    const {rows}=await database().query('SELECT id,password_hash,email,email_verified_at FROM users WHERE username=$1',[username]);const user=rows[0];
    const valid=await verifyPassword(password,user?.password_hash||dummy);
    if(!user||!valid)throw new AuthError('用户名或密码不正确',401);
    if(user.email_verified_at&&user.email)return reply(await sendChallenge('login',user.email,user.id,{passwordStamp:tokenHash(user.password_hash)}));
    userId=user.id;
  }
  await createSession(userId);return reply({ok:true});
 }catch(e:any){
  console.error('auth failed',e.code||e.name);
  return reply({error:e instanceof AuthError?e.message:e.code==='23505'?'用户名或邮箱已被使用，请登录原有账号。':'操作暂时失败，请稍后重试。'},e instanceof AuthError?e.status:e.code==='23505'?409:503);
 }
}
