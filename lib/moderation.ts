import {isAdministratorProfile,forfeitPlayer,settleRatings,archiveMatches,type State} from './game';
import {censorChat} from './chat-filter';

export type ModerationAction='delete_message'|'ban'|'unban'|'claim_badge'|'resolve_report'|'reopen_report';
export type ModerationEntry={at:number,by:string,action:ModerationAction,targetId:string,reason?:string};

// Call only after verified owner authorization. Public IDs identify targets;
// private session/recovery credentials are never included in the admin response.
export function moderate(state:State,action:ModerationAction,targetId:string,ownerId:string,reason='',now=Date.now()){
 const profile=Object.values(state.profiles||{}).find(p=>p.publicId===targetId);
 if(action==='resolve_report'||action==='reopen_report'){
  const report=state.feedback?.find(r=>r.id===targetId);if(!report)return 'Report not found.';
  if(action==='resolve_report'){if(report.resolvedAt)return '';report.resolvedAt=now;}
  else {if(!report.resolvedAt)return '';delete report.resolvedAt;}
 }else if(action==='delete_message'){
  const messages=state.boards?.lobby||[];
  if(!messages.some(m=>m.id===targetId))return ''; // Safe retry of a deletion.
  state.boards!.lobby=messages.filter(m=>m.id!==targetId);
 }else{
  if(!profile||profile.agent)return 'Player not found.';
  if(action==='claim_badge'){
   if(!ownerId||profile.ban||profile.name.trim().toLowerCase()!=='vecaid')return 'Only the saved vecaid profile can be the administrator.';
   const link=state.administrator;
   if(link&&(link.publicId!==profile.publicId||link.ownerUserId!==ownerId))return 'The administrator is already linked to a different profile or account.';
   const unchanged=!!link&&!Object.values(state.profiles||{}).some(p=>p.admin!==undefined);
   state.administrator={publicId:profile.publicId!,ownerUserId:ownerId};
   for(const p of Object.values(state.profiles||{}))delete p.admin;
   if(unchanged)return '';
  }else if(action==='ban'){
   if(isAdministratorProfile(state,profile))return 'The administrator profile cannot be banned.';
   if(!reason.trim()||reason.length>200)return 'Add a reason of 1–200 characters.';
   if(profile.ban)return '';
   profile.ban={at:now,by:ownerId,reason:reason.trim()};
   const session=Object.entries(state.profiles||{}).find(([,p])=>p===profile)![0];
   state.queue=state.queue.filter(p=>p.id!==session);
   for(const match of state.matches){
    const index=match.players.findIndex(p=>p.id===session);if(index<0)continue;
    if(match.drafts)match.drafts[index]='';
    if(match.rematch){match.rematch.ready=match.rematch.ready.filter(i=>i!==index);delete match.rematch.startAt;}
    forfeitPlayer(match,index);
   }
   for(const room of state.rooms||[]){room.players=room.players.filter(p=>p.id!==session);if(room.hostId===session)room.hostId=room.players[0]?.id||'';}
   state.rooms=state.rooms?.filter(r=>r.players.length);
   settleRatings(state);archiveMatches(state);
  }else if(action==='unban'){
   if(!profile.ban)return '';
   delete profile.ban;
  }
 }
 state.moderationLog=[...(state.moderationLog||[]),{at:now,by:ownerId,action,targetId,...(reason?{reason:reason.trim()}: {})}].slice(-200);
 return '';
}

export function moderationSnapshot(state:State,query='',now=Date.now()){
 const profiles=Object.values(state.profiles||{}).filter(p=>p.publicId&&!p.agent);
 const q=query.trim().toLocaleLowerCase();
 const players=profiles.filter(p=>!q||p.name.toLocaleLowerCase().includes(q)||p.publicId===q).sort((a,b)=>Number(!!b.ban)-Number(!!a.ban)||(b.lastSeen||0)-(a.lastSeen||0));
 const adminIds=new Set(profiles.filter(p=>isAdministratorProfile(state,p)).map(p=>p.publicId));
 return {
  overview:{profiles:profiles.length,online:profiles.filter(p=>!p.ban&&now-(p.lastSeen||0)<20000).length,queued:state.queue.filter(p=>now-p.seen<12000).length,matches:state.matches.filter(m=>m.winner===null).length,banned:profiles.filter(p=>p.ban).length,openReports:(state.feedback||[]).filter(r=>!r.resolvedAt&&now-r.at<30*86400000).length},
  players:players.slice(0,50).map(p=>({publicId:p.publicId!,name:censorChat(p.name),admin:isAdministratorProfile(state,p),banned:!!p.ban,reason:p.ban?.reason})),total:players.length,
  messages:(state.boards?.lobby||[]).filter(m=>!m.agent&&now-m.at<86400000).slice(-100).map(m=>({...m,name:censorChat(m.name),text:censorChat(m.text),admin:adminIds.has(m.publicId)})),
  log:(state.moderationLog||[]).slice(-30).reverse().map(({by,...entry})=>entry)
 };
}
