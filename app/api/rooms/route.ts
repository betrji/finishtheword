import {env} from 'cloudflare:workers';
import type {State} from '../../../lib/game';
import {changeRoom,roomDirectory,roomSession,type RoomAction} from '../../../lib/room-directory';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const json=(body:unknown,status=200,extra={})=>Response.json(body,{status,headers:{...headers,...extra}});
export async function GET(req:Request){
 try{
  const row=await env.DB!.prepare("SELECT data FROM arena WHERE id='lobby'").first<{data:string}>();
  return json(roomDirectory(row?JSON.parse(row.data):{queue:[],matches:[]},roomSession(req.headers)));
 }catch{return json({error:'Could not load open rooms. Please retry.'},503)}
}
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Same-origin requests only.'},403);
 const me=roomSession(req.headers);if(!me)return json({error:'Save your player name first.'},401);
 try{
  const raw=await req.text();if(raw.length>1024)return json({error:'Request too large.'},413);
  const input=JSON.parse(raw) as RoomAction;
  if(!input||!['request','cancel','privacy','accept','decline'].includes(input.action||''))return json({error:'Unknown room action.'},400);
  for(let retry=0;retry<12;retry++){
   const row=await env.DB!.prepare("SELECT revision,data FROM arena WHERE id='lobby'").first<{revision:number,data:string}>();
   if(!row)return json({error:'Save your player name first.'},401);
   const state:State=JSON.parse(row.data),result=changeRoom(state,me,input);
   if(result.error)return json({error:result.error,...(result.retryAfter?{retryAfter:result.retryAfter}: {})},result.status,result.retryAfter?{'Retry-After':String(result.retryAfter)}:{});
   const updated=await env.DB!.prepare("UPDATE arena SET data=?,revision=revision+1 WHERE id='lobby' AND revision=?").bind(JSON.stringify(state),row.revision).run();
   if(!updated.meta.changes)continue;
   return json(roomDirectory(state,me));
  }
  return json({error:'The room is busy. Please retry.'},503);
 }catch{return json({error:'Could not update the room. Please retry.'},503)}
}
