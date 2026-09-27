"use client";
import {useState} from 'react';
import {Heart} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {authRequest,useEmailAvailability,VerificationForm,type Challenge} from '../auth-ui';

export default function Login(){
 const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [challenge,setChallenge]=useState<Challenge|null>(null),[values,setValues]=useState<Record<string,FormDataEntryValue>>({});
 const {ready,error:loadError}=useEmailAvailability();
 function changeMode(v:string){setMode(v);setChallenge(null);setValues({});setError('');setMessage('')}
 async function send(v:Record<string,FormDataEntryValue>){
  setBusy(true);setError('');setMessage('');
  try{const d=await authRequest({...v,action:mode});if(d.challengeId){setValues(v);setChallenge(d)}else window.location.assign('/')}
  catch(e:any){setError(e.message||'连接失败，请重试')}finally{setBusy(false)}
 }
 async function verify(v:Record<string,FormDataEntryValue>){
  setBusy(true);setError('');
  try{const d=await authRequest({...v,action:'verify',challengeId:challenge?.challengeId});if(d.reset){changeMode('login');setMessage('密码已重设，请使用新密码登录。')}else window.location.assign('/')}
  catch(e:any){setError(e.message||'连接失败，请重试')}finally{setBusy(false)}
 }
 return <main className="app auth-page"><header className="topbar"><a href="/" className="brand"><span className="brand-icon"><Heart/></span>主人的任务</a></header>
 <div className="setup"><div className="panel"><div className="setup-header"><img src="/mascot.webp" alt="你的任务伙伴"/><div><h1>{mode==='forgot'?'把账号找回来':'欢迎回到小小的约定'}</h1><p className="muted">{mode==='forgot'?'用已经验证的邮箱重设密码。':'用各自的账号，加入同一个双人空间。'}</p></div></div>
 {!challenge&&mode!=='forgot'&&<Tabs value={mode} onValueChange={changeMode}><TabsList className="filter-tabs"><TabsTrigger value="login" disabled={busy}>登录</TabsTrigger><TabsTrigger value="register" disabled={busy}>创建账号</TabsTrigger></TabsList></Tabs>}
 {message&&<p className="notice" role="status">{message}</p>}
 {error&&<p className="notice error" role="alert">{error}</p>}
 {challenge?<VerificationForm challenge={challenge} busy={busy} reset={mode==='forgot'} onVerify={verify} onResend={()=>send(values)} onBack={()=>{setChallenge(null);setValues({});setError('')}}/>:
 <form key={mode} className="form" onSubmit={e=>{e.preventDefault();if(!busy)send(Object.fromEntries(new FormData(e.currentTarget)))}}>
  {mode==='register'&&<label>昵称<input name="name" autoComplete="nickname" maxLength={24} placeholder="希望对方怎样称呼你"/></label>}
  {mode!=='forgot'&&<>
   <label>用户名<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={40} pattern="[A-Za-z0-9_.\-]{3,40}" placeholder="字母、数字或 _.-"/></label>
   <label>密码<input name="password" type="password" autoComplete={mode==='register'?'new-password':'current-password'} minLength={10} maxLength={128} required placeholder="至少 10 位字符"/></label>
  </>}
  {(mode==='forgot'||mode==='register'&&ready)&&<label>{mode==='forgot'?'已绑定并验证的邮箱':'邮箱'}<input name="email" type="email" autoComplete="email" autoCapitalize="none" maxLength={254} required placeholder="you@example.com"/></label>}
  {mode==='forgot'&&<p className="field-note">必须是此前在账号中验证过的邮箱。未绑定邮箱的账号暂时不能通过邮件找回。</p>}
  {ready===false&&<p className="notice">{mode==='forgot'?'邮箱找回尚未启用，网站接通发信服务后即可使用。':'邮箱服务正在准备中，目前可使用用户名和密码登录。启用后请到「双人空间」绑定邮箱。'}</p>}
  {loadError&&<p className="notice error">邮箱服务状态加载失败。登录仍可尝试，创建账号请刷新后重试。</p>}
  <button className="button primary" disabled={busy||(mode==='forgot'&&ready!==true)||(mode==='register'&&ready===null)}>{busy?'正在处理…':mode==='forgot'?'发送找回验证码':mode==='login'?'登录我们的空间':ready?'发送注册验证码':'创建账号'}</button>
  <div className="auth-links">{mode==='login'?<button type="button" className="link-button" disabled={busy} onClick={()=>changeMode('forgot')}>忘记密码？</button>:<button type="button" className="link-button" disabled={busy} onClick={()=>changeMode('login')}>返回登录</button>}</div>
  {mode==='register'&&<p className="field-note">注册后可以创建空间或输入对方的邀请码。两种任务身份可随时切换。</p>}
 </form>}
 </div></div></main>;
}
