import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {isAnalyticsOwner} from '../../../lib/analytics-access';
import {adminSession,canLinkAdministrator,hasAdminAccess} from '../../../lib/admin-access';
import {moderate,moderationSnapshot,type ModerationAction} from '../../../lib/moderation';
import type {State} from '../../../lib/game';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
export async function POST(req:Request){
 const fail=(error:string,status=400)=>Response.json({error},{status,headers});
 try{
  const user=await getChatGPTUser();
  const ownerEmail=(env as unknown as Record<string,unknown>).FTW_ANALYTICS_OWNER_EMAIL;
  if(!user)return fail('Sign in with the owner account.',401);
  if(!isAnalyticsOwner(user,ownerEmail))return fail('Owner access only.',403);
  // Privileged writes always require the browser's same-origin header.
  if(req.headers.get('origin')!==new URL(req.url).origin)return fail('Same-origin requests only.',403);
  const raw=await req.text();if(raw.length>2048)return fail('Request too large.',413);
  const input=JSON.parse(raw) as {action:string,targetId?:string,reason?:string,query?:string};
  if(!['read','delete_message','ban','unban','claim_badge','resolve_report','reopen_report'].includes(input.action))return fail('Unknown moderation action.');
  const query=typeof input.query==='string'?input.query.slice(0,80):'';
  for(let retry=0;retry<12;retry++){
   const row=await env.DB!.prepare("SELECT revision,data FROM arena WHERE id='lobby'").first<{revision:number,data:string}>();
   const state:State=row?JSON.parse(row.data):{queue:[],matches:[]};
   const session=adminSession(req.headers);
   const allowed=input.action==='claim_badge'?canLinkAdministrator(state,session,user,ownerEmail):hasAdminAccess(state,session,user,ownerEmail);
   if(!allowed)return fail('Admin tools are only available to the owner using the saved vecaid profile.',403);
   if(input.action!=='read'){
    if(!row)return fail('Save your player profile first.',409);
    let target=input.targetId;
    if(input.action==='claim_badge'){
     target=state.profiles?.[session]?.publicId;
    }
    if(typeof target!=='string'||!target||target.length>100)return fail('Choose a saved player profile.');
    const error=moderate(state,input.action as ModerationAction,target,user.userId,typeof input.reason==='string'?input.reason:'');
    if(error)return fail(error);
    const updated=await env.DB!.prepare("UPDATE arena SET data=?,revision=revision+1 WHERE id='lobby' AND revision=?").bind(JSON.stringify(state),row.revision).run();
    if(!updated.meta.changes)continue;
   }
   return Response.json({...moderationSnapshot(state,query),adminProfileId:state.administrator!.publicId},{headers});
  }
  return fail('The arena is busy. Please retry.',503);
 }catch{return fail('Could not load moderation. Please retry.',503)}
}
