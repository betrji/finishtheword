import type {State,Room,RankedProfile} from './game';
import {censorChat} from './chat-filter';
import {earnedAvatar} from './avatar';

export type RoomJoinRequest={id:string,roomId:string,at:number,state:'pending'|'accepted'|'declined'|'closed'};
export const roomRequestCooldown=60000;
const requestLifetime=120000;
const uuid=(id:unknown)=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
export function roomSession(headers:Headers){
 const cookie=headers.get('cookie')?.match(/(?:^|;\s*)arena_player=([^;]*)/)?.[1],token=headers.get('X-Arena-Session');
 return uuid(cookie)?cookie!:uuid(token)?token!:'';
}
function open(s:State,r:Room,now:number){
 const host=r.players.find(p=>p.id===r.hostId),profile=s.profiles?.[r.hostId];
 return r.visibility==='public'&&!!r.id&&!!host&&!!profile&&!profile.ban&&!profile.agent&&now-host.seen<requestLifetime&&r.players.length<r.capacity&&!s.matches.some(m=>m.id===r.matchId&&m.winner===null);
}
function free(s:State,id:string,now:number){return !s.rooms?.some(r=>r.players.some(p=>p.id===id))&&!s.queue.some(p=>p.id===id&&now-p.seen<12000)&&!s.matches.some(m=>m.winner===null&&m.players.some(p=>p.id===id));}
function blocked(a:RankedProfile|undefined,b:RankedProfile|undefined){return !!((b?.publicId&&a?.blocked?.includes(b.publicId))||(a?.publicId&&b?.blocked?.includes(a.publicId)));}
function pending(s:State,id:string,r:Room,now:number){
 const p=s.profiles?.[id],q=p?.roomJoinRequest;
 return !!q&&q.roomId===r.id&&q.state==='pending'&&now-q.at<requestLifetime&&now-(p.lastSeen||0)<requestLifetime&&!p.ban&&!p.agent&&open(s,r,now)&&free(s,id,now)&&!blocked(p,s.profiles?.[r.hostId]);
}
export function roomDirectory(s:State,me:string,now=Date.now()){
 const profile=s.profiles?.[me],request=profile?.roomJoinRequest,membership=s.rooms?.find(r=>r.players.some(p=>p.id===me)),requested=s.rooms?.find(r=>r.id===request?.roomId);
 const rooms=(s.rooms||[]).filter(r=>open(s,r,now)&&!blocked(profile,s.profiles?.[r.hostId])).sort((a,b)=>b.created-a.created).slice(0,100).map(r=>({id:r.id!,host:censorChat(s.profiles![r.hostId].name),players:r.players.length,capacity:r.capacity,languages:['en','es','de'] as const}));
 const requests=membership?.hostId===me?Object.entries(s.profiles||{}).filter(([id])=>pending(s,id,membership,now)).map(([,p])=>({id:p.roomJoinRequest!.id,name:censorChat(p.name),at:p.roomJoinRequest!.at})).sort((a,b)=>a.at-b.at):[];
 return {rooms,requests,request:request?{id:request.id,roomId:request.roomId,state:requested&&pending(s,me,requested,now)?'pending':request.state==='accepted'&&membership?.id===request.roomId?'accepted':request.state==='declined'?'declined':request.state==='pending'&&now-request.at>=requestLifetime?'expired':'closed',expiresAt:request.at+requestLifetime}:null,retryAt:request?request.at+roomRequestCooldown:0,joinedRoomId:membership?.id||null,now};
}
export type RoomDirectoryData=ReturnType<typeof roomDirectory>;
export type RoomAction={action?:string,roomId?:string,requestId?:string,visibility?:'private'|'public'};
export function changeRoom(s:State,me:string,input:RoomAction,now=Date.now()):{error?:string,status?:number,retryAfter?:number}{
 const profile=s.profiles?.[me];
 const fail=(error:string,status=400)=>({error,status});
 if(!profile)return fail('Save your player name first.',401);
 if(profile.ban||profile.agent)return fail('This profile cannot join or manage rooms.',403);
 if(input.action==='request'){
  if(!uuid(input.roomId)||!uuid(input.requestId))return fail('Choose an open room.');
  const previous=profile.roomJoinRequest;
  if(previous&&previous.id===input.requestId&&previous.roomId===input.roomId)return {};
  const wait=(previous?.at??-roomRequestCooldown)+roomRequestCooldown-now;
  if(wait>0)return {error:'You can send one join request per minute.',status:429,retryAfter:Math.ceil(wait/1000)};
  const room=s.rooms?.find(r=>r.id===input.roomId);
  if(!room||!open(s,room,now))return fail('This room is no longer open. Choose another room.',409);
  if(blocked(profile,s.profiles?.[room.hostId]))return fail('You cannot request this room.',403);
  if(!free(s,me,now))return fail('Leave your current room, queue or match before requesting a room.',409);
  profile.roomJoinRequest={id:input.requestId!,roomId:room.id!,at:now,state:'pending'};profile.lastSeen=now;
  return {};
 }
 if(input.action==='cancel'){
  const q=profile.roomJoinRequest;if(q&&q.id===input.requestId&&q.state==='pending')q.state='closed';
  return {}; // Canceling never resets the cooldown.
 }
 if(!uuid(input.roomId))return fail('Choose your hosted room.');
 const room=s.rooms?.find(r=>r.id===input.roomId&&r.hostId===me);
 if(!room)return fail('Only this room’s host can manage it.',403);
 if(input.action==='privacy'){
  if(input.visibility!=='private'&&input.visibility!=='public')return fail('Choose Public or Private.');
  room.visibility=input.visibility;
  if(input.visibility==='private')for(const p of Object.values(s.profiles||{}))if(p.roomJoinRequest&&p.roomJoinRequest.roomId===room.id&&p.roomJoinRequest.state==='pending')p.roomJoinRequest.state='closed';
  return {};
 }
 if(input.action!=='accept'&&input.action!=='decline')return fail('Unknown room action.');
 const target=Object.entries(s.profiles||{}).find(([,p])=>p.roomJoinRequest&&p.roomJoinRequest.id===input.requestId&&p.roomJoinRequest.roomId===room.id);
 if(!target)return fail('This request has ended.',409);
 const [id,p]=target,q=p.roomJoinRequest!;
 if(input.action==='accept'&&q.state==='accepted'&&room.players.some(member=>member.id===id))return {};
 if(input.action==='decline'&&q.state==='declined')return {};
 if(!pending(s,id,room,now))return fail('This request or room is no longer available.',409);
 if(input.action==='decline'){q.state='declined';return {};}
 room.players.push({id,name:p.name,seen:now,rating:p.rating,mode:'casual',playerCount:room.capacity,avatar:earnedAvatar(p.avatar,Math.max(p.peakRating||0,p.rating))});
 q.state='accepted';
 if(room.players.length>=room.capacity)for(const p of Object.values(s.profiles||{}))if(p.roomJoinRequest&&p.roomJoinRequest.roomId===room.id&&p.roomJoinRequest.state==='pending')p.roomJoinRequest.state='closed';
 return {};
}
