import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const rooms=sqliteTable('rooms',{id:text('id').primaryKey(),owner:text('owner').notNull(),partner:text('partner'),code:text('code').notNull().unique(),state:text('state').notNull(),version:integer('version').notNull().default(0)});
export const members=sqliteTable('members',{userId:text('user_id').primaryKey(),roomId:text('room_id').notNull().references(()=>rooms.id)},t=>[index('members_room').on(t.roomId)]);
export const uploads=sqliteTable('uploads',{id:text('id').primaryKey(),roomId:text('room_id').notNull().references(()=>rooms.id),userId:text('user_id').notNull(),name:text('name').notNull(),type:text('type').notNull(),created:text('created').notNull()});
export const operations=sqliteTable('operations',{id:text('id').primaryKey(),roomId:text('room_id').notNull().references(()=>rooms.id),userId:text('user_id').notNull(),result:text('result').notNull()});
