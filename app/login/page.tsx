"use client";
import {useEffect,useRef,useState} from 'react';
import {Heart} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {authRequest} from '../auth-ui';
import {invitationReturn} from '../invites';

export default function Login(){
 const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const inFlight=useRef(false);
 const [returnTo,setReturnTo]=useState('/');
 useEffect(()=>{setReturnTo(invitationReturn(window.location.hash))},[]);
 async function send(values:Record<string,FormDataEntryValue>){
  if(inFlight.current)return;
  inFlight.current=true;setBusy(true);setError('');
  try{await authRequest({...values,action:mode});window.location.assign(invitationReturn(window.location.hash))}
  catch(e:any){setError(e.message||'连接失败，请重试')}
  finally{inFlight.current=false;setBusy(false)}
 }
 return <main className="app auth-page">
  <header className="topbar"><a href="/" className="brand"><span className="brand-icon"><Heart/></span>主人的任务</a></header>
  <div className="setup"><div className="panel">
   <div className="setup-header"><img src="/mascot.webp" alt="你的任务伙伴"/><div><h1>欢迎回到小小的约定</h1><p className="muted">用各自的账号，加入同一个双人空间。</p></div></div>
   {returnTo!=='/'&&<p className="notice">你收到了一份任务邀请。登录或创建账号后，会自动加入空间并打开任务。</p>}
   <Tabs value={mode} onValueChange={v=>{setMode(v);setError('')}}><TabsList className="filter-tabs"><TabsTrigger value="login" disabled={busy}>登录</TabsTrigger><TabsTrigger value="register" disabled={busy}>创建账号</TabsTrigger></TabsList></Tabs>
   {error&&<p className="notice error" role="alert">{error}</p>}
   <form key={mode} className="form" onSubmit={e=>{e.preventDefault();send(Object.fromEntries(new FormData(e.currentTarget)))}}>
    {mode==='register'&&<label>昵称<input name="name" autoComplete="nickname" maxLength={24} placeholder="希望对方怎样称呼你"/></label>}
    <label>账户 ID<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={40} pattern="[A-Za-z0-9_.\-]{3,40}" placeholder="3–40 位字母、数字或 _.-"/></label>
    <label>密码<input name="password" type="password" autoComplete={mode==='register'?'new-password':'current-password'} minLength={10} maxLength={128} required placeholder="至少 10 位字符"/></label>
    <button className="button primary" disabled={busy}>{busy?'正在处理…':mode==='login'?'登录我们的空间':'创建账号'}</button>
    {mode==='register'&&<p className="field-note">请妥善保存账户 ID 和密码。注册后可创建空间或点击同伴分享的链接加入，两种任务身份可随时切换。</p>}
   </form>
  </div></div>
 </main>;
}
