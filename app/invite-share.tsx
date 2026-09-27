"use client";
import {useEffect,useState} from 'react';
import {Copy,Share2} from 'lucide-react';
import {invitationPath} from './invites';

export default function InviteShare({code,board,taskId}:{code:string;board:string;taskId?:string}){
 const [url,setUrl]=useState(''),[message,setMessage]=useState(''),[canShare,setCanShare]=useState(false);
 useEffect(()=>{setUrl(window.location.origin+invitationPath(code,board,taskId));setCanShare(typeof navigator.share==='function')},[code,board,taskId]);
 async function copy(){try{await navigator.clipboard.writeText(url);setMessage('链接已复制，粘贴发给小伙伴即可。')}catch{setMessage('请长按下方链接，选择复制后发送。')}}
 return <div className="form invite-share">
  <p className="muted">{taskId?'对方点开链接即可查看这个任务。':'把链接发给小伙伴，点开即可加入空间。'}首次使用需登录或注册，完成后会自动继续，无需填写邀请码。</p>
  <div className="actions">
   <button type="button" className="button primary" disabled={!url} onClick={copy}><Copy size={16}/>复制{taskId?'任务':'邀请'}链接</button>
   {canShare&&<button type="button" className="button" onClick={async()=>{try{await navigator.share({title:'主人的任务',text:taskId?'有一个任务等你，点开链接看看吧。':'来加入我们的双人任务空间吧。',url})}catch(e:any){if(e.name!=='AbortError')await copy()}}}><Share2 size={16}/>分享给同伴</button>}
  </div>
  <label>分享链接<input value={url} readOnly aria-label="分享链接" onFocus={e=>e.currentTarget.select()}/></label>
  {message&&<p className="field-note" role="status">{message}</p>}
  <p className="field-note">请只发给你的小伙伴。配对后，仅空间里的两个人能查看任务和凭证。</p>
 </div>;
}
