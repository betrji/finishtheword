import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const arena = sqliteTable('arena', {id: text('id').primaryKey(), revision:integer('revision').notNull().default(0), data:text('data').notNull()});

export const analyticsVisitors=sqliteTable('analytics_visitors',{id:text('id').primaryKey(),firstSeen:integer('first_seen').notNull(),lastSeen:integer('last_seen').notNull()},t=>[index('analytics_visitors_last_seen').on(t.lastSeen)]);
export const analyticsPageviews=sqliteTable('analytics_pageviews',{id:text('id').primaryKey(),visitorId:text('visitor_id').notNull(),at:integer('at').notNull(),path:text('path').notNull(),source:text('source').notNull(),device:text('device').notNull(),returning:integer('returning').notNull()},t=>[index('analytics_pageviews_at').on(t.at),index('analytics_pageviews_visitor_at').on(t.visitorId,t.at)]);
export const analyticsEvents=sqliteTable('analytics_events',{id:text('id').primaryKey(),visitorId:text('visitor_id').notNull(),at:integer('at').notNull(),event:text('event').notNull()},t=>[index('analytics_events_at').on(t.at),index('analytics_events_visitor_at').on(t.visitorId,t.at)]);
