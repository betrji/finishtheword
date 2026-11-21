import {env} from 'cloudflare:workers';
import type {State} from '../../../lib/game';
import {changeFriend,friendsSnapshot,liveGames,spectatorMatch} from '../../../lib/social';
const headers={'Cache-Control':'private, no-store'};
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'Same-origin requests only.'},{status:403,headers});
 const input=await req.json() as {action?:string,targetId?:string,matchId?:string};
 const action=input.action||'read',mutates=['request','accept','decline','cancel','remove','block','unblock'].includes(action);
 if(!mutates&&!['read','watch'].includes(action))return Response.json({error:'Unknown action.'},{status:400,headers});
 const cookie=req.headers.get('cookie')?.match(/(?:^|; )arena_player=([a-f0-9-]+)/)?.[1],token=req.headers.get('X-Arena-Session');
 const valid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
 const me=valid(cookie)?cookie!:valid(token)?token!:'';
 for(let attempt=0;attempt<12;attempt++){
  const row=await env.DB!.prepare("SELECT revision,data FROM arena WHERE id='lobby'").first<{revision:number,data:string}>();
  const state:State=row?JSON.parse(row.data):{queue:[],matches:[]};
  if(action==='watch'){
   const match=typeof input.matchId==='string'?spectatorMatch(state,input.matchId):null;
   if(match&&match.winner===null&&!match.letterChoice){const row=await env.DB!.prepare('SELECT data FROM arena WHERE id=?').bind(`typing:${match.id}`).first<{data:string}>();if(row){const preview=JSON.parse(row.data);if(preview.turnId===`${match.id}:${match.turn}:${match.turnStartsAt}:`)match.drafts[match.turn]=preview.draft;}}
   return Response.json(match?{match,now:Date.now()}:{error:'This game is no longer available to watch.'},{status:match?200:404,headers});
  }
  if(mutates){
   if(state.profiles?.[me]?.ban)return Response.json({error:'This player profile has been banned by the administrator.'},{status:403,headers});
   if(!state.profiles?.[me]?.publicId||state.profiles[me].agent)return Response.json({error:'Save your player profile first.'},{status:401,headers});
   if(typeof input.targetId!=='string'||input.targetId.length>100)return Response.json({error:'Choose a player.'},{status:400,headers});
   const error=changeFriend(state,me,input.targetId,action);if(error)return Response.json({error},{status:400,headers});
   if(!row)return Response.json({error:'Please try again.'},{status:503,headers});
   const result=await env.DB!.prepare("UPDATE arena SET data=?,revision=revision+1 WHERE id='lobby' AND revision=?").bind(JSON.stringify(state),row.revision).run();if(!result.meta.changes)continue;
  }
  return Response.json({...friendsSnapshot(state,me),games:liveGames(state),now:Date.now()},{headers});
 }
 return Response.json({error:'Community is busy. Please retry.'},{status:503,headers});
}catch{return Response.json({error:'Could not load community. Please retry.'},{status:503,headers});}}
