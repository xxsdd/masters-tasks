import {getUser,sameOrigin} from '@/app/auth';
import {database,roomFor} from '@/db/store';
import {put,get,del} from '@vercel/blob';
import {boardFor} from '@/app/boards';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){try{
 if(!sameOrigin(req))return new Response('Forbidden',{status:403});const u=await getUser();if(!u)return Response.json({error:'请先登录'},{status:401});
 const room=await roomFor(u.userId);if(!room||boardFor(room,u.userId).role!=='partner')return Response.json({error:'请切换到接任务身份后上传凭证'},{status:403});
 if(Number(req.headers.get('content-length'))>4300000)return Response.json({error:'文件不能超过 4MB'},{status:413});
 const form=await req.formData(),file=form.get('file');if(!(file instanceof File)||file.size>4*1024*1024||file.size===0)return Response.json({error:'请选择 4MB 以内的文件'},{status:400});
 const type=file.type;if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(type))return Response.json({error:'支持 JPG、PNG、WebP 和 PDF 文件'},{status:400});
 const count=await database().query("SELECT count(*)::int AS n FROM uploads WHERE user_id=$1 AND created>now()-interval '24 hours'",[u.userId]);if(count.rows[0].n>=30)return Response.json({error:'今日上传较多，请明天再试'},{status:429});
 const id=crypto.randomUUID(),name=file.name.slice(0,120);const blob=await put(`evidence/${room.id}/${id}`,file,{access:'private',contentType:type,addRandomSuffix:false});
 try{await database().query('INSERT INTO uploads(id,room_id,user_id,name,type,blob_url) VALUES($1,$2,$3,$4,$5,$6)',[id,room.id,u.userId,name,type,blob.url]);}catch(e){await del(blob.url);throw e}
 return Response.json({id,name,type});
}catch(e:any){console.error('upload',e.code||e.name);return Response.json({error:'上传失败，请稍后重试'},{status:503})}}
export async function GET(req:Request){try{
 const u=await getUser();if(!u)return new Response('Unauthorized',{status:401});const room=await roomFor(u.userId);if(!room)return new Response('Forbidden',{status:403});const id=new URL(req.url).searchParams.get('id');
 const {rows}=await database().query('SELECT name,type,blob_url FROM uploads WHERE id=$1 AND room_id=$2',[id,room.id]);const f=rows[0];if(!f)return new Response('Not found',{status:404});
 const object=await get(f.blob_url,{access:'private'});if(!object||object.statusCode!==200)return new Response('Not found',{status:404});
 return new Response(object.stream,{headers:{'Content-Type':f.type,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
}catch(e:any){console.error('file read',e.code||e.name);return new Response('文件暂时不可用',{status:503})}}
