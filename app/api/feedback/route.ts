import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {isAnalyticsOwner} from '../../../lib/analytics-access';
import {adminSession,hasAdminAccess} from '../../../lib/admin-access';
import {submitFeedback} from '../../../lib/feedback';
import type {State} from '../../../lib/game';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
export async function POST(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Same-origin requests only.'},403);
 const me=req.headers.get('cookie')?.match(/(?:^|; )arena_player=([a-f0-9-]+)/)?.[1]||req.headers.get('X-Arena-Session')||'';
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(me))return json({error:'Save your profile first.'},401);
 try{const text=await req.text();if(text.length>2048)return json({error:'Report is too long.'},413);const input=JSON.parse(text);
  for(let retry=0;retry<12;retry++){
   const row=await env.DB!.prepare("SELECT revision,data FROM arena WHERE id='lobby'").first<{revision:number,data:string}>();if(!row)return json({error:'Save your profile first.'},401);
   const state:State=JSON.parse(row.data),error=submitFeedback(state,me,input);if(error)return json({error},400);
   const result=await env.DB!.prepare("UPDATE arena SET data=?,revision=revision+1 WHERE id='lobby' AND revision=?").bind(JSON.stringify(state),row.revision).run();if(!result.meta.changes)continue;
   return json({message:'Thanks. Your report was saved for the game owner to review.'});
  }return json({error:'Please retry your report.'},503);
 }catch{return json({error:'Could not save your report. Try again.'},503)}
}
export async function GET(req:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in to review feedback.'},401);
 if(!isAnalyticsOwner(user,(env as unknown as Record<string,unknown>).FTW_ANALYTICS_OWNER_EMAIL))return json({error:'Owner access only.'},403);
 try{const row=await env.DB!.prepare("SELECT data FROM arena WHERE id='lobby'").first<{data:string}>();const state:State=row?JSON.parse(row.data):{queue:[],matches:[]};if(!hasAdminAccess(state,adminSession(req.headers),user,(env as unknown as Record<string,unknown>).FTW_ANALYTICS_OWNER_EMAIL))return json({error:'Use your saved vecaid profile to review reports.'},403);return json({reports:(state.feedback||[]).filter(r=>Date.now()-r.at<30*86400000).slice(-100).reverse()});}catch{return json({error:'Could not load feedback.'},503)}
}
