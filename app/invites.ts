export function invitationPath(code:string,board:string,taskId?:string){
 const params=new URLSearchParams({invite:code,board});
 if(taskId)params.set('task',taskId);
 return '/join#'+params.toString();
}

// Only an internal invitation may be used as the post-login destination.
export function invitationReturn(hash:string){
 const next=new URLSearchParams(hash.replace(/^#/, '')).get('next');
 if(!next?.startsWith('/join#'))return '/';
 const params=new URLSearchParams(next.slice('/join#'.length));
 if(!/^[a-f0-9]{32}$/.test(params.get('invite')||''))return '/';
 const board=params.get('board')||'state',task=params.get('task')||undefined;
 if(!['state','reverse_state'].includes(board))return '/';
 if(task&&!/^[a-f0-9-]{36}$/i.test(task))return '/';
 return invitationPath(params.get('invite')!,board,task);
}
