"use client";
import {useState} from 'react';
import {LogOut,UserRound} from 'lucide-react';
import {toast} from 'sonner';

export async function authRequest(payload:Record<string,unknown>){
 const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const d:any=await r.json();if(!r.ok)throw new Error(d.error||'操作失败，请重试');return d;
}
export function LogoutButton(){
 const [busy,setBusy]=useState(false);
 return <button className="button logout-button" disabled={busy} onClick={async()=>{
  setBusy(true);try{await authRequest({action:'logout'});window.location.assign('/login')}
  catch(e:any){toast.error(e.message);setBusy(false)}
 }}><LogOut size={16}/>{busy?'正在退出…':'退出登录'}</button>;
}
export function AccountPanel({user}:{user:{username:string}}){
 return <section className="panel account-panel"><h2><UserRound size={19}/>我的账号</h2>
  <p className="muted">账户 ID：{user.username}</p>
  <p className="muted">使用账户 ID 和密码登录，请妥善保存。</p>
 </section>;
}
