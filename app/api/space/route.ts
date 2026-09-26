import {getUser,sameOrigin} from '@/app/auth';
import {database,roomFor,transaction} from '@/db/store';
import {initialState,mutate} from '@/app/domain';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
class PublicError extends Error{}
export async function GET(){try{const user=await getUser();if(!user)return reply({user:null,room:null});const room=await roomFor(user.userId);return reply({user:{id:user.userId,name:user.displayName,email:user.email},room:room?{id:room.id,role:room.owner===user.userId?'owner':'partner',paired:!!room.partner,code:room.owner===user.userId?room.code:null,state:JSON.parse(room.state)}:null});}catch(e:any){console.error('space load',e.code||e.name);return reply({error:'暂时无法加载空间，请稍后重试'},503)}}
export async function POST(req:Request){
 if(!sameOrigin(req))return reply({error:'请求来源无效'},403);
 try{
  const user=await getUser();if(!user)return reply({error:'请先登录'},401);
  if(Number(req.headers.get('content-length'))>30000)return reply({error:'提交内容过长'},413);
  const raw=await req.text();if(raw.length>30000)return reply({error:'提交内容过长'},413);const b=JSON.parse(raw);
  const result=await transaction(async db=>{
   // Lock this user's membership changes, then lock the shared room. Every balance mutation is serialized.
   await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.userId]);
   let room=await roomFor(user.userId,db,true);
   if(b.action==='createRoom'){
    if(room)return {message:'你已经有一个双人空间'};
    const id=crypto.randomUUID(),code=crypto.randomUUID().replaceAll('-','');const s=initialState(String(b.ownerName||'主人').slice(0,24));s.partnerName=String(b.partnerName||'小伙伴').slice(0,24);
    await db.query('INSERT INTO rooms(id,owner,code,state) VALUES($1,$2,$3,$4)',[id,user.userId,code,JSON.stringify(s)]);
    await db.query('INSERT INTO members(user_id,room_id) VALUES($1,$2)',[user.userId,id]);return {message:'双人空间已创建'};
   }
   if(b.action==='joinRoom'){
    if(room)throw new PublicError('你已加入一个空间，不能重复加入');
    const code=String(b.code||'').trim();if(!/^[a-f0-9]{32}$/.test(code))throw new PublicError('邀请码格式不正确');
    const {rows}=await db.query('SELECT id,owner,partner FROM rooms WHERE code=$1 FOR UPDATE',[code]);const target=rows[0];
    if(!target||target.partner)throw new PublicError('邀请码无效，或这个空间已经配对');
    if(target.owner===user.userId)throw new PublicError('请让小伙伴用自己的账号加入');
    await db.query('UPDATE rooms SET partner=$1,version=version+1 WHERE id=$2',[user.userId,target.id]);
    await db.query('INSERT INTO members(user_id,room_id) VALUES($1,$2)',[user.userId,target.id]);return {message:'配对成功，欢迎来到我们的空间'};
   }
   if(!room)throw new PublicError('请先创建或加入空间');
   if(!/^[0-9a-f-]{36}$/i.test(b.requestId||''))throw new PublicError('请求编号无效，请刷新后重试');
   const {rows:existing}=await db.query('SELECT result FROM operations WHERE id=$1 AND room_id=$2 AND user_id=$3',[b.requestId,room.id,user.userId]);
   if(existing[0])return JSON.parse(existing[0].result);
   if(b.action==='submit'){
    b.files=Array.isArray(b.files)?b.files:[];if(b.files.length>3)throw new PublicError('最多上传三个文件');
    const safe=[];for(const f of b.files){const {rows}=await db.query('SELECT id,name,type FROM uploads WHERE id=$1 AND room_id=$2 AND user_id=$3',[String(f.id),room.id,user.userId]);if(!rows[0])throw new PublicError('凭证文件不存在或无权使用');safe.push(rows[0]);}b.files=safe;
   }
   let changed;try{changed=mutate(JSON.parse(room.state),room.owner===user.userId?'owner':'partner',b.action,b,undefined,()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296)}catch(e:any){throw new PublicError(e.message)}
   const serialized=JSON.stringify(changed.state);if(serialized.length>700000)throw new PublicError('空间记录已达到容量上限');
   await db.query('UPDATE rooms SET state=$1,version=version+1 WHERE id=$2',[serialized,room.id]);
   await db.query('INSERT INTO operations(id,room_id,user_id,result) VALUES($1,$2,$3,$4)',[b.requestId,room.id,user.userId,JSON.stringify(changed.result)]);
   return changed.result;
  });return reply(result);
 }catch(e:any){console.error('space mutation',e.code||e.name);return reply({error:e instanceof PublicError?e.message:'保存失败，请刷新确认结果后重试'},e instanceof PublicError?400:503)}
}
