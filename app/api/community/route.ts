import {censorChat} from '../../../lib/chat-filter';
import {env} from 'cloudflare:workers';
import {isAdministratorProfile,type State,type ChatMessage} from '../../../lib/game';
const headers={'Cache-Control':'no-store'};
export async function POST(req:Request){
 try{
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Same-origin requests only.'},{status:403,headers});
  const input=await req.json() as {action?:string,channel?:string,text?:string,clientId?:string};
  const cookie=req.headers.get('cookie')?.match(/(?:^|; )arena_player=([a-f0-9-]+)/)?.[1];
  const token=req.headers.get('X-Arena-Session');
  const valid=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
  const me=valid(cookie)?cookie!:valid(token)?token!:'';
  const fail=(error:string,status=400)=>Response.json({error},{status,headers});
  if(!['read','send'].includes(input.action||''))return fail('Unknown board action.');
  const channel=input.channel||'lobby';if(typeof channel!=='string'||channel.length>100)return fail('Invalid board.');
  for(let attempt=0;attempt<12;attempt++){
   const row=await env.DB!.prepare("SELECT revision,data FROM arena WHERE id='lobby'").first<{revision:number,data:string}>();
   const state:State=row?JSON.parse(row.data):{queue:[],matches:[]};
   const profile=state.profiles?.[me],now=Date.now();if(profile?.agent)return fail('Agent messaging is unavailable.',410);
   const room=state.rooms?.find(r=>`room:${r.code}:${r.created}`===channel&&r.players.some(p=>p.id===me));
   const match=state.matches.find(m=>`match:${m.id}`===channel&&m.players.some(p=>p.id===me));
   if(channel!=='lobby'&&!room&&!match)return fail('This board is only for its room or match participants.',403);
   const messages=(state.boards?.[channel]||[]).filter(m=>!m.agent&&now-m.at<86400000).slice(-100);
   if(input.action==='send'){
    if(profile?.ban)return fail('This player profile has been banned by the administrator.',403);
    if(!profile?.publicId)return fail('Save your profile or join a game before chatting.',401);
    const text=typeof input.text==='string'?input.text.replace(/[\u0000-\u001f\u007f]/g,' ').trim():'';
    if(!text||text.length>280)return fail('Use 1–280 characters.');
    if(!valid(input.clientId))return fail('A unique message id is required.');
    const duplicate=messages.find(m=>m.id===input.clientId&&m.publicId===profile.publicId);
    if(!duplicate){
     if(profile.lastChatAt&&now-profile.lastChatAt<2000)return fail('Please wait two seconds between messages.',429);
     const message:ChatMessage={id:input.clientId!,at:now,publicId:profile.publicId,name:profile.name,agent:!!profile.agent,text:censorChat(text)};
     messages.push(message);profile.lastChatAt=now;
     state.boards??={};state.boards[channel]=messages.slice(-100);
     // Bound stored chat independently of player count; active channels retain their latest messages.
     for(const key of Object.keys(state.boards)){state.boards[key]=state.boards[key].filter(m=>now-m.at<86400000);if(!state.boards[key].length)delete state.boards[key];}
     const oldest=Object.keys(state.boards).sort((a,b)=>(state.boards![a].at(-1)?.at||0)-(state.boards![b].at(-1)?.at||0));
     while(oldest.length>64)delete state.boards[oldest.shift()!];
     if(!row)return fail('Arena is starting. Try again.',503);
     const result=await env.DB!.prepare("UPDATE arena SET data=?,revision=revision+1 WHERE id='lobby' AND revision=?").bind(JSON.stringify(state),row.revision).run();if(!result.meta.changes)continue;
    }
   }
   const adminIds=new Set(Object.values(state.profiles||{}).filter(p=>isAdministratorProfile(state,p)).map(p=>p.publicId));
   const hidden=new Set(profile?.blocked||[]);if(profile?.publicId)for(const p of Object.values(state.profiles||{}))if(p.publicId&&p.blocked?.includes(profile.publicId))hidden.add(p.publicId);
   return Response.json({channel,messages:messages.filter(m=>!hidden.has(m.publicId)).slice(-100).map(m=>({...m,admin:adminIds.has(m.publicId),text:censorChat(m.text),name:censorChat(m.name)})),now},{headers});
  }
  return fail('Board busy. Please retry.',503);
 }catch{return Response.json({error:'Could not reach the board. Please retry.'},{status:503,headers});}
}
