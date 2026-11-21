import {dailyChainReport} from '../../../lib/daily-analytics';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {isAnalyticsOwner} from '../../../lib/analytics-access';
import type {State} from '../../../lib/game';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
const day=86400000,uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export async function POST(req:Request){
  const origin=new URL(req.url).origin;
  if(req.headers.get('origin')!==origin)return json({error:'Same-origin requests only.'},403);
  if(req.headers.get('DNT')==='1'||req.headers.get('Sec-GPC')==='1'||/bot|spider|crawler|headless/i.test(req.headers.get('user-agent')||''))return new Response(null,{status:204,headers});
  if(!req.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
  try{
    if(Number(req.headers.get('content-length')||0)>2048)return json({error:'Request too large.'},413);
    const body=await req.text();if(body.length>2048)return json({error:'Request too large.'},413);
    let p;try{p=JSON.parse(body)}catch{return json({error:'Invalid JSON.'},400)}
    if(p?.event!==undefined){
      if(!['invite_open','invite_join','result_share','invite_share','invite_copy','invite_code_copy'].includes(p.event)||!uuid.test(String(p.id))||!uuid.test(String(p.visitor))||Object.keys(p).some(k=>!['id','visitor','event'].includes(k)))return json({error:'Invalid product event.'},400);
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('ftw-traffic-v1:'+p.visitor)),visitor=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join(''),now=Date.now(),db=env.DB!;
      await db.batch([
        db.prepare('INSERT OR IGNORE INTO analytics_events (id,visitor_id,at,event) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM analytics_events WHERE visitor_id=? AND at>=?)<100').bind(p.id,visitor,now,p.event,visitor,Math.floor(now/day)*day),
        db.prepare('DELETE FROM analytics_events WHERE at<?').bind(now-90*day)
      ]);return new Response(null,{status:204,headers});
    }
    if(!p||!uuid.test(String(p.id))||!uuid.test(String(p.visitor))||!['/','/arena','/how-to-play','/daily'].includes(p.path)||!['mobile','desktop'].includes(p.device)||typeof p.referrer!=='string'||p.referrer.length>1200)return json({error:'Invalid event.'},400);
    let source='Direct / unknown';
    try{const ref=new URL(p.referrer);if(['http:','https:'].includes(ref.protocol))source=ref.origin===origin?'Internal':ref.hostname.toLowerCase().slice(0,253)}catch{}
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('ftw-traffic-v1:'+p.visitor));
    const visitor=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join(''),now=Date.now(),db=env.DB!;
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO analytics_pageviews (id,visitor_id,at,path,source,device,"returning")
        SELECT ?,?,?,?,?,?,CASE WHEN COALESCE((SELECT first_seen FROM analytics_visitors WHERE id=?),?)<? THEN 1 ELSE 0 END
        WHERE NOT EXISTS (SELECT 1 FROM analytics_visitors WHERE id=? AND last_seen>?)
        AND (SELECT COUNT(*) FROM analytics_pageviews WHERE visitor_id=? AND at>=?)<100`).bind(p.id,visitor,now,p.path,source,p.device,visitor,now,now-1800000,visitor,now-2000,visitor,Math.floor(now/day)*day),
      db.prepare(`INSERT INTO analytics_visitors (id,first_seen,last_seen) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM analytics_pageviews WHERE id=? AND visitor_id=? AND at=?)
        ON CONFLICT(id) DO UPDATE SET last_seen=MAX(last_seen,excluded.last_seen)`).bind(visitor,now,now,p.id,visitor,now),
      db.prepare('DELETE FROM analytics_pageviews WHERE at<?').bind(now-90*day),
      db.prepare('DELETE FROM analytics_visitors WHERE last_seen<?').bind(now-365*day)
    ]);
    return new Response(null,{status:204,headers});
  }catch{return json({error:'Analytics unavailable.'},503)}
}
export async function GET(req:Request){
  const user=await getChatGPTUser();
  if(!user)return json({error:'Sign in to view analytics.'},401);
  if(!isAnalyticsOwner(user,(env as unknown as Record<string,unknown>).FTW_ANALYTICS_OWNER_EMAIL))return json({error:'Owner access only.'},403);
  const days=Number(new URL(req.url).searchParams.get('days')||7);
  if(![7,30,90].includes(days))return json({error:'Choose 7, 30 or 90 days.'},400);
  try{
    const now=Date.now(),start=Math.floor(now/day)*day-(days-1)*day,db=env.DB!;
    const result=await db.batch<Record<string,unknown>>([
      db.prepare('SELECT COUNT(*) AS views,COUNT(DISTINCT visitor_id) AS visitors,COUNT(DISTINCT CASE WHEN "returning"=1 THEN visitor_id END) AS "returning" FROM analytics_pageviews WHERE at>=?').bind(start),
      db.prepare("SELECT strftime('%Y-%m-%d',at/1000,'unixepoch') AS date,COUNT(*) AS views,COUNT(DISTINCT visitor_id) AS visitors FROM analytics_pageviews WHERE at>=? GROUP BY date ORDER BY date").bind(start),
      db.prepare('SELECT source AS label,COUNT(*) AS count FROM analytics_pageviews WHERE at>=? GROUP BY source ORDER BY count DESC LIMIT 10').bind(start),
      db.prepare('SELECT device AS label,COUNT(*) AS count FROM analytics_pageviews WHERE at>=? GROUP BY device ORDER BY count DESC').bind(start),
      db.prepare('SELECT path AS label,COUNT(*) AS count FROM analytics_pageviews WHERE at>=? GROUP BY path ORDER BY count DESC').bind(start),
      db.prepare("SELECT data FROM arena WHERE id='lobby'"),
      db.prepare('SELECT event,COUNT(*) AS count,COUNT(DISTINCT visitor_id) AS visitors FROM analytics_events WHERE at>=? GROUP BY event').bind(start)
    ]);
    const state:State=result[5].results[0]?JSON.parse(String(result[5].results[0].data)):{matches:[],queue:[]};
    const daily=Array.from({length:days},(_,i)=>{const date=new Date(start+i*day).toISOString().slice(0,10),traffic=result[1].results.find(r=>r.date===date);return {date,ccuPeak:state.analytics?.ccu?.peaks[date]??null,views:Number(traffic?.views||0),visitors:Number(traffic?.visitors||0),started:state.analytics?.days[date]?.started||0,completed:state.analytics?.days[date]?.completed||0}});
    const growth=Object.entries(state.analytics?.growthDays||{}).filter(([date])=>date>=new Date(start).toISOString().slice(0,10)).reduce((sum,[,d])=>({firstCompletions:sum.firstCompletions+d.firstCompletions,rematches:sum.rematches+d.rematches,waitMs:sum.waitMs+d.waitMs,waitPlayers:sum.waitPlayers+d.waitPlayers}),{firstCompletions:0,rematches:0,waitMs:0,waitPlayers:0});
    return json({dailyChain:dailyChainReport(state.dailyChainAnalytics,days,now),ccu:{current:Object.values(state.profiles||{}).filter(p=>!p.agent&&p.lastSeen!==undefined&&now-p.lastSeen>=0&&now-p.lastSeen<60000).length,since:state.analytics?.ccu?.since||null,samples:(state.analytics?.ccu?.samples||[]).filter(p=>p.at>=now-86400000)},growth,events:result[6].results,days,updatedAt:now,totals:{...result[0].results[0],started:daily.reduce((n,d)=>n+d.started,0),completed:daily.reduce((n,d)=>n+d.completed,0)},daily,sources:result[2].results,devices:result[3].results,pages:result[4].results,profiles:Object.values(state.profiles||{}).filter(p=>!p.agent).length,matchTrackingSince:state.analytics?.since||null});
  }catch{return json({error:'Could not load analytics. Please retry.'},503)}
}
