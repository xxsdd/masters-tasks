"use client";
import {useEffect,useState} from 'react';
import {LogOut,Mail} from 'lucide-react';
import {toast} from 'sonner';

export async function authRequest(payload:Record<string,unknown>){
 const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const d:any=await r.json();if(!r.ok)throw new Error(d.error||'操作失败，请重试');return d;
}
export function useEmailAvailability(){
 const [ready,setReady]=useState<boolean|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/auth',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json()}).then((d:any)=>{if(active)setReady(!!d.emailReady)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[]);
 return {ready,error};
}
export function LogoutButton(){const [busy,setBusy]=useState(false);return <button className="button logout-button" disabled={busy} onClick={async()=>{setBusy(true);try{await authRequest({action:'logout'});window.location.assign('/login')}catch(e:any){toast.error(e.message);setBusy(false)}}}><LogOut size={16}/>{busy?'正在退出…':'退出登录'}</button>}
export type Challenge={challengeId:string;email:string;message:string};
export function VerificationForm({challenge,busy,reset,onVerify,onResend,onBack}:{challenge:Challenge;busy:boolean;reset?:boolean;onVerify:(values:Record<string,FormDataEntryValue>)=>void;onResend:()=>void;onBack:()=>void}){
 const [seconds,setSeconds]=useState(60);
 useEffect(()=>{setSeconds(60);const t=setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000);return()=>clearInterval(t)},[challenge.challengeId]);
 return <form className="form" onSubmit={e=>{e.preventDefault();onVerify(Object.fromEntries(new FormData(e.currentTarget)))}}>
  <div className="notice" role="status"><strong>{challenge.email}</strong><p>{challenge.message}</p><p>验证码有效期为 10 分钟，请留意垃圾邮件文件夹。</p></div>
  <label>邮箱验证码<input className="otp-input" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="6 位数字" autoFocus/></label>
  {reset&&<><label>新密码<input name="newPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} placeholder="至少 10 位字符"/></label><p className="field-note">重设后，所有设备上的旧登录会失效。</p></>}
  <button className="button primary" disabled={busy}>{busy?'正在验证…':reset?'验证并重设密码':'确认验证码'}</button>
  <div className="auth-links"><button type="button" className="link-button" disabled={busy||seconds>0} onClick={onResend}>{seconds>0?`${seconds} 秒后可重新发送`:'重新发送验证码'}</button><button type="button" className="link-button" disabled={busy} onClick={onBack}>返回修改</button></div>
 </form>;
}
export function AccountPanel({user,onSaved}:{user:{username:string;email:string|null;emailVerified:boolean};onSaved:()=>void}){
 const {ready,error:loadError}=useEmailAvailability();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[challenge,setChallenge]=useState<Challenge|null>(null),[values,setValues]=useState<Record<string,FormDataEntryValue>>({});
 async function send(v:Record<string,FormDataEntryValue>){setBusy(true);setError('');try{setValues(v);setChallenge(await authRequest({action:'bindEmail',...v}))}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 return <section className="panel account-panel"><h2><Mail size={19}/>账号与邮箱</h2><p className="muted">当前账号：{user.username}</p>
  {user.emailVerified?<div className="notice"><strong>{user.email}</strong><p>邮箱已验证。下次登录需输入邮件验证码，忘记密码时也可用此邮箱找回。</p></div>:<>
   <p className="muted">绑定并验证邮箱后，可用于登录验证和找回密码。</p>
   {loadError?<p className="notice error">无法读取邮箱服务状态，请刷新页面重试。</p>:ready===false?<p className="notice">邮箱服务正在准备中。启用后可在这里绑定邮箱，目前仍使用用户名和密码登录。</p>:ready===null?<p className="muted">正在读取邮箱服务状态…</p>:challenge?<VerificationForm challenge={challenge} busy={busy} onResend={()=>send(values)} onBack={()=>{setChallenge(null);setValues({});setError('')}} onVerify={async v=>{setBusy(true);setError('');try{await authRequest({action:'verify',challengeId:challenge.challengeId,...v});setValues({});setChallenge(null);toast.success('邮箱已绑定');onSaved()}catch(e:any){setError(e.message)}finally{setBusy(false)}}}/>:<form className="form" onSubmit={e=>{e.preventDefault();send(Object.fromEntries(new FormData(e.currentTarget)))}}>
    <label>绑定邮箱<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="你能正常收信的邮箱"/></label>
    <label>当前密码<input name="password" type="password" autoComplete="current-password" minLength={10} maxLength={128} required placeholder="输入当前密码以确认是本人操作"/></label>
    <button className="button primary" disabled={busy}>{busy?'正在发送…':'发送绑定验证码'}</button>
   </form>}
  </>}
  {error&&<p className="notice error" role="alert">{error}</p>}
 </section>;
}
