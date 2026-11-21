import {censorChat} from './chat-filter';
import {isAdministratorProfile,publicProfile,type State,type Match} from './game';

export function isPublicMatch(m:Match){return !m.custom&&!m.practice&&m.mode!=='agents'&&!m.players.some(p=>p.agent||p.id==='bot');}
export function spectatorMatch(s:State,id:string){
 const m=s.matches.find(m=>m.id===id&&isPublicMatch(m));if(!m)return null;
 return {reconnect:m.reconnect,streaks:m.streaks?.map(s=>({current:s.current,best:s.best}))||m.players.map(()=>({current:0,best:0})),id:m.id,mode:m.mode||'ranked',players:m.players.map(p=>{const profile=s.profiles?.[p.id];return {admin:isAdministratorProfile(s,profile),publicId:profile?.publicId,name:p.name,rating:profile?.rating??1000,avatar:p.avatar}}),turn:m.turn,hearts:m.hearts,words:m.words,deadline:m.deadline,turnDuration:m.turnDuration||15000,turnStartsAt:m.turnStartsAt||0,completedTurns:m.completedTurns||0,prefix:m.prefix||m.letter,prefixKind:m.prefixKind,winner:m.winner,placements:m.placements,letterChoice:m.letterChoice,drafts:(m.drafts||[]).map(censorChat)};
}
export function liveGames(s:State){return s.matches.filter(m=>m.winner===null&&isPublicMatch(m)).slice(-50).reverse().map(m=>({id:m.id,mode:m.mode||'ranked',players:m.players.map(p=>({publicId:s.profiles?.[p.id]?.publicId,name:p.name})),words:m.words.length,alive:m.hearts.filter(h=>h>0).length}));}
export function friendsSnapshot(s:State,me:string,now=Date.now()){
 const own=s.profiles?.[me],profiles=Object.values(s.profiles||{}),byId=new Map(profiles.filter(p=>p.publicId&&!p.agent).map(p=>[p.publicId!,p]));
 const ids=own?.friends||[],incoming=own?.friendRequests||[];
 const person=(id:string,presence=false)=>{const p=byId.get(id);if(!p)return null;const online=now-(p.lastSeen||0)<20000,match=presence&&online?s.matches.find(m=>m.winner===null&&isPublicMatch(m)&&m.players.some(q=>s.profiles?.[q.id]?.publicId===id)):undefined;return {...publicProfile(p,s),...(presence?{online,watchId:match?.id}: {})}};
 const outgoing=profiles.filter(p=>own?.publicId&&p.friendRequests?.includes(own.publicId)).map(p=>p.publicId!).filter(Boolean);
 const recent=[...new Set((own?.history||[]).filter(h=>h.mode==='ranked'||h.mode==='casual'||h.mode==='custom').flatMap(h=>(h.opponents||[h.opponent]).map(p=>p.publicId).filter((id):id is string=>!!id)))].filter(id=>!ids.includes(id)&&!own?.blocked?.includes(id)&&!byId.get(id)?.blocked?.includes(own?.publicId||'')).slice(0,12);
 return {blocked:(own?.blocked||[]).map(id=>person(id)).filter(Boolean),canAddFriends:!!own?.recovery&&!own.agent,friends:ids.map(id=>person(id,true)).filter(Boolean),incoming:incoming.map(id=>person(id)).filter(Boolean),outgoing:outgoing.map(id=>person(id)).filter(Boolean),recent:recent.map(id=>person(id)).filter(Boolean)};
}
export function changeFriend(s:State,me:string,targetId:string,action:string,now=Date.now()){
 const own=s.profiles?.[me],target=Object.values(s.profiles||{}).find(p=>p.publicId===targetId&&!p.agent);
 if(!own?.publicId||own.agent)return 'Save your player profile first.';
 if(!target)return 'Player not found.';
 if((own.ban||target.ban)&&['request','accept'].includes(action))return 'Friend requests are unavailable for banned profiles.';
 if(target.publicId===own.publicId)return 'That is your own profile.';
 if((action==='request'||action==='accept')&&(own.blocked?.includes(targetId)||target.blocked?.includes(own.publicId)))return 'Friend requests are unavailable between these profiles.';
 if((action==='request'||action==='accept')&&!own.recovery)return 'Set a recovery key in Profile → Account before sending or accepting friend requests.';
 // Receiving a request is allowed, but both profiles must be recoverable before becoming friends.
 if(action==='accept'&&!target.recovery)return 'This player needs to set a recovery key before you can accept their request.';
 own.friends??=[];own.friendRequests??=[];target.friends??=[];target.friendRequests??=[];
 const self=own.publicId,other=target.publicId!;
 const clearRequests=()=>{own.friendRequests=own.friendRequests!.filter(id=>id!==other);target.friendRequests=target.friendRequests!.filter(id=>id!==self)};
 if(action==='block'){
  own.blocked??=[];if(!own.blocked.includes(other)){if(own.blocked.length>=500)return 'Your block list is full.';own.blocked.push(other);}
  own.friends=own.friends.filter(id=>id!==other);target.friends=target.friends.filter(id=>id!==self);clearRequests();return '';
 }
 if(action==='unblock'){own.blocked=(own.blocked||[]).filter(id=>id!==other);return '';}
 if(action==='request'){
  if(own.friends.includes(other)||target.friendRequests.includes(self))return '';
  if(own.friendRequests.includes(other))return 'This player already sent you a request. Accept it to become friends.';
  if(own.friends.length>=100||target.friends.length>=100)return 'This friends list is full.';
  const sent=Object.values(s.profiles||{}).filter(p=>p.friendRequests?.includes(self)).length;
  if(sent>=20||target.friendRequests.length>=20)return 'There are too many pending requests. Try again later.';
  // Permit adding several opponents at once; count only successful new requests.
  const recent=(own.friendRequestTimes||[]).filter(at=>now-at<60000);
  if(recent.length>=10)return `You’ve sent 10 friend requests this minute. Try again in ${Math.max(1,Math.ceil((recent[0]+60000-now)/1000))} seconds.`;
  target.friendRequests.push(self);own.friendRequestTimes=[...recent,now];return '';
 }
 if(action==='accept'){
  if(own.friends.includes(other)&&target.friends.includes(self))return '';
  if(!own.friendRequests.includes(other))return 'This friend request is no longer available.';
  if(own.friends.length>=100||target.friends.length>=100)return 'This friends list is full.';
  if(!own.friends.includes(other))own.friends.push(other);if(!target.friends.includes(self))target.friends.push(self);clearRequests();return '';
 }
 if(action==='decline'){own.friendRequests=own.friendRequests.filter(id=>id!==other);return '';}
 if(action==='cancel'){target.friendRequests=target.friendRequests.filter(id=>id!==self);return '';}
 if(action==='remove'){own.friends=own.friends.filter(id=>id!==other);target.friends=target.friends.filter(id=>id!==self);clearRequests();return '';}
 return 'Unknown friend action.';
}
