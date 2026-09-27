"use client";
import {useEffect,useRef,useState} from 'react';
import {Heart} from 'lucide-react';
import {authRequest} from '../auth-ui';

export default function Join(){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const started=useRef(false);
 function login(){window.location.replace('/login#'+new URLSearchParams({next:'/join'+window.location.hash}).toString())}
 async function open(){
  setError('');setBusy(true);
  const params=new URLSearchParams(window.location.hash.slice(1));
  const code=params.get('invite'),taskId=params.get('task'),inviteBoard=params.get('board')||'state';
  if(!/^[a-f0-9]{32}$/.test(code||'')||!['state','reverse_state'].includes(inviteBoard)||(taskId&&!/^[a-f0-9-]{36}$/i.test(taskId))){setError('邀请链接不完整，请让对方重新分享。');setBusy(false);return}
  try{
   const r=await fetch('/api/space',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'joinRoom',code,taskId,inviteBoard})});
   if(r.status===401){login();return}
   const d:any=await r.json();if(!r.ok)throw new Error(d.error||'暂时无法打开邀请');
   window.location.replace(d.taskId?'/?task='+encodeURIComponent(d.taskId):d.taskUnavailable?'/?notice=task-unavailable':'/');
  }catch(e:any){setError(e.message||'连接中断，请重试');setBusy(false)}
 }
 useEffect(()=>{if(started.current)return;started.current=true;void open()},[]);
 return <main className="app auth-page"><header className="topbar"><a className="brand" href="/"><span className="brand-icon"><Heart/></span>主人的任务</a></header>
  <div className="setup"><section className="panel form"><div className="setup-header"><img src="/mascot.webp" alt="你的小伙伴"/><div><h1>{error?'暂时无法打开邀请':'正在打开小伙伴的任务'}</h1><p className="muted">登录后会自动进入，不用再复制邀请码。</p></div></div>
   {error?<><p className="notice error" role="alert">{error}</p><button className="button primary" disabled={busy} onClick={open}>重新打开</button><button className="button" disabled={busy} onClick={async()=>{setBusy(true);try{await authRequest({action:'logout'});login()}catch(e:any){setError(e.message);setBusy(false)}}}>换个账号登录</button><a className="link-button" href="/">回到我的任务</a></>:<p role="status" className="muted">正在连接空间…</p>}
  </section></div>
 </main>;
}
