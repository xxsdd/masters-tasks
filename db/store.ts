import { env } from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('数据库暂时不可用');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('文件存储暂时不可用');return env.BUCKET;}
export async function roomFor(userId:string){return database().prepare('SELECT r.* FROM rooms r JOIN members m ON r.id=m.room_id WHERE m.user_id=?').bind(userId).first<any>();}
