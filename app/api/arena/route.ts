import type {PowerKind} from '../../../lib/casual-power';
import {submitWordForTurn,wordTurnId} from '../../../lib/word-submission';
import {sanitizeAvatar,earnedAvatar} from '../../../lib/avatar';
import {env} from 'cloudflare:workers';
import {powerKinds,useCasualPower,isAdministratorProfile,updateConnection,enablePlayStreak,playStreakSummary,requestRematch,advanceRematches,chooseLetter,advanceLetterChoice,recordMatchAnalytics,createMatch,loseHeart,play,normalize,roman,State,Player,Match,Room,tickBot,configurePrefixes,ensureProfile,settleRatings,standings,cleanName,nameTaken,resetLeaderboard,archiveMatches,findPublicProfile,createGroupMatch,forfeitPlayer,roomCode,recoveryHash,sameHash,leaderboardPage} from '../../../lib/game';
import {censorChat} from '../../../lib/chat-filter';
import words from '../../../data/words.json';
const dictionary=new Set<string>(words);configurePrefixes(words);
const botWords=['apple','elephant','tiger','rabbit','tree','eagle','earth','house','energy','yellow','water','river','rose','engine','east','time','echo','ocean','night','train','nest','table','ear','red','dog','green','north','heart','tea','air','rain','note','egg','game','exit','tax','xenon','new','west','ten','net','top','pen','nose','easy','yes','sun','nice','eat','test','turn','name','end','day','year','road','door','rest','team','moon','nine','eye','even','never','right','two','orange','enjoy','young','gold','queen','quick','king','kite','zoo','zebra','jump','joke','book','blue','cat','cup','fish','fox','up','use','van','voice','ice'].filter(w=>dictionary.has(w));
const mediumWords=Array.from(new Set([...botWords,...'animal answer autumn baby beach bird black boat bread brown butter cake camera chair cheese chicken child city class clean clock cloud coat coffee cold color cookie corn cow dance dark desk dinner dream drink duck family farm fast father fire floor flower food forest friend fruit garden girl glass grass great happy hat head help hill home horse hot hungry jacket juice lake land large leaf learn left leg lemon light lion list little lunch map milk money monkey morning mother mountain mouse mouth music neck news noise number nurse office old open paper park party pear pencil people piano picture pig pink pizza plant play pocket potato purple question quiet radio read rice ride ring rock room round school sea seed sheep shirt shoe shop short show sing sister sky sleep slow small smile snow soap sock song soup space spoon spring star stone stop story street strong sugar summer sweet swim tall teach tennis thing three tired toast today tomato town toy travel trip truck true uncle under warm watch week white wind window winter woman wood world write zero'.split(' ')])).filter(w=>dictionary.has(w)&&w.length<=8);
// Easy and Medium never silently borrow Hard's full dictionary.
const botVocabulary={easy:botWords.filter(w=>w.length<=6),normal:mediumWords,hard:words.filter(w=>w.length>=3&&w.length<=10)};
const headers={'Cache-Control':'no-store'};
// Refresh-only snapshots reuse the last heartbeat for up to one second. Due
// turns, reconnects, bot moves and rematches still run through the original CAS.
function canReadStatus(s:State,me:string,now:number){
 if(s.leaderboardReset!==1||!s.profiles?.[me]?.lastSeen||now-s.profiles[me].lastSeen!>=1000)return false;
 return !s.matches.some(m=>{
  if(m.winner!==null)return !m.historySaved||!!(m.rematch?.startAt&&!m.rematch.nextId&&now>=m.rematch.startAt);
  if((m.practice&&m.players.some(p=>p.id===me))||!m.connection||now>=m.deadline)return true;
  if(m.reconnect)return m.players[m.reconnect.player].id===me||now>=m.reconnect.until;
  const current=m.letterChoice?.chooser??m.turn,start=m.letterChoice?.startsAt??m.turnStartsAt??m.created;
  return !m.connection.used[current]&&m.players[current].id!=='bot'&&now>=Math.max(m.connection.seen[current],start)+4000;
 });
}
function finishPendingMatches(s:State,full=false){if(full||s.matches.some(m=>m.winner!==null&&!m.historySaved)){settleRatings(s);archiveMatches(s);}}
function arenaSnapshot(s:State,me:string,m:Match|undefined,room:Room|undefined,now:number,message:string,revision:number,compact=false,viewId?:string){
 const index=m?m.players.findIndex(p=>p.id===me):-1,queued=s.queue.find(p=>p.id===me);
 const partial=compact&&(m?.winner===null||!!queued||!!room&&!m);
 const publicPlayer=(p:Player)=>({admin:isAdministratorProfile(s,s.profiles?.[p.id]),publicId:s.profiles?.[p.id]?.publicId,agent:!!s.profiles?.[p.id]?.agent,name:p.name,rating:s.profiles?.[p.id]?.rating??1000,avatar:sanitizeAvatar(p.avatar)});
 return {...(partial?{}:{...standings(s,me),playStreak:playStreakSummary(s.profiles?.[me]),friendRequestCount:s.profiles?.[me]?.friendRequests?.length||0,history:s.profiles?.[me]?.history||[]}),partial,revision,friendRequestCount:s.profiles?.[me]?.friendRequests?.length||0,...(viewId!==undefined?{viewedProfile:findPublicProfile(s,viewId)}:{}),sessionId:me,hasProfile:!!s.profiles?.[me],recoveryEnabled:!!s.profiles?.[me]?.recovery,queuedAt:queued?.queuedAt,queuedMode:queued?.mode||'ranked',queuedCount:queued?.playerCount||2,room:room?{id:room.id,visibility:room.visibility==='public'?'public':'private',chatId:`room:${room.code}:${room.created}`,code:room.code,capacity:room.capacity,isHost:room.hostId===me,players:room.players.map(p=>({...publicPlayer(p),isHost:p.id===room.hostId})),inMatch:s.matches.some(x=>x.id===room!.matchId&&x.winner===null)}:null,match:m?{...m,wordReceipts:undefined,drafts:m.drafts?.map(censorChat),connection:undefined,botPlan:undefined,players:m.players.map(publicPlayer),you:index}:null,queued:!!queued,waiting:queued?s.queue.filter(q=>(q.mode||'ranked')===(queued.mode||'ranked')&&(q.playerCount||2)===(queued.playerCount||2)).length:0,message,now};
}
async function withTypingPreview(snapshot:ReturnType<typeof arenaSnapshot>){
 const match=snapshot.match;if(!match||match.winner!==null||match.letterChoice)return snapshot;
 const row=await env.DB!.prepare('SELECT data FROM arena WHERE id=?').bind(`typing:${match.id}`).first<{data:string}>();
 if(row){const preview=JSON.parse(row.data);if(preview.turnId===wordTurnId(match as unknown as Match)){match.drafts??=match.players.map(()=>'');match.drafts[match.turn]=censorChat(preview.draft);}}
 return snapshot;
}
export async function POST(req:Request){try{
 const input=await req.json() as {action:string,power?:PowerKind,compact?:boolean,actionId?:string,turnId?:string,visibility?:'private'|'public',enabled?:boolean,choiceId?:string,letter?:string,offset?:number,recoveryKey?:string,publicId?:string,mode?:'ranked'|'casual'|'agents',playerCount?:number,code?:string,name?:string,word?:string,difficulty?:'easy'|'normal'|'hard',draft?:string,matchId?:string,turnDeadline?:number,avatar?:unknown};
 const session=req.headers.get('X-Arena-Session');
 const cookieId=req.headers.get('cookie')?.match(/(?:^|; )arena_player=([a-f0-9-]+)/)?.[1];
 const validSession=(value:string|undefined|null)=>!!value&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
 const me=(validSession(cookieId)?cookieId:validSession(session)?session:null)||crypto.randomUUID();
 const replyHeaders={...headers,'Set-Cookie':`arena_player=${me}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`};
 const fail=(error:string,status=400)=>Response.json({error},{status,headers:replyHeaders});
 if(input.action==='room_create'&&input.visibility!==undefined&&!['private','public'].includes(input.visibility))return fail('Choose a valid room privacy setting.');
 if(input.action==='agent_register'||input.mode==='agents')return fail('Agent play is unavailable.',410);
 if(!['play_streak','rematch','rematch_cancel','choose_letter','use_power','status','queue','cancel','word','leave','practice','profile','view','room_create','room_join','room_leave','room_start','recover','recovery_set','leaderboard'].includes(input.action))return fail('Unknown action');
 const count=input.playerCount??2;
 if(['queue','room_create'].includes(input.action)&&(!Number.isInteger(count)||count<2||count>5))return fail('Choose between 2 and 5 players.');
 const db=env.DB!;
 if(input.action==='leaderboard'){
  if(input.offset!==undefined&&(!Number.isSafeInteger(input.offset)||input.offset<0))return fail('Invalid leaderboard position.');
  const row=await db.prepare("SELECT revision,data FROM arena WHERE id='lobby'").first<{revision:number,data:string}>();
  const state:State=row?JSON.parse(row.data):{queue:[],matches:[]};
  return Response.json(leaderboardPage(state,me,input.offset||0),{headers:replyHeaders});
 }

 // Ephemeral previews expire with old matches; clean them on entry, never on keystrokes.
 if(['queue','practice','room_start'].includes(input.action))await db.prepare("DELETE FROM arena WHERE id LIKE 'typing:%' AND json_extract(data,'$.at') < ?").bind(Date.now()-3600000).run();
 for(let attempt=0;attempt<12;attempt++){
  const row=await db.prepare("SELECT revision,data FROM arena WHERE id='lobby'").first<{revision:number,data:string}>();
  if(!row){await db.prepare("INSERT OR IGNORE INTO arena (id,revision,data) VALUES ('lobby',0,?)").bind(JSON.stringify({queue:[],matches:[]})).run();continue;}
  const s:State=JSON.parse(row.data),now=Date.now(),analyticsBefore=s.matches.map(m=>({id:m.id,winner:m.winner}));let message='';const submittedMatch=s.matches.find(m=>m.id===input.matchId),previousDeadline=submittedMatch?.deadline,previousTurn=submittedMatch?wordTurnId(submittedMatch):'';
  if(s.profiles?.[me]?.ban)return fail('This player profile has been banned by the administrator.',403);
  if(s.profiles?.[me]?.agent)return fail('Agent play is unavailable.',410);
  const compact=(input.action==='status'||input.action==='word')&&input.compact===true;
  if(input.action==='status'&&compact&&typeof input.draft!=='string'&&canReadStatus(s,me,now)){
   const match=s.matches.find(m=>m.winner===null&&m.players.some(p=>p.id===me))??s.matches.findLast(m=>m.players.some(p=>p.id===me));
   return Response.json(arenaSnapshot(s,me,match,s.rooms?.find(r=>r.players.some(p=>p.id===me)),now,'',row.revision,true),{headers:replyHeaders});
  }
  resetLeaderboard(s);finishPendingMatches(s,!compact);s.rooms??=[];if(s.profiles?.[me])s.profiles[me].lastSeen=now;
  s.queue=s.queue.filter(p=>!p.agent&&p.mode!=='agents');
  if(input.action==='recover'){
   if(s.matches.some(m=>m.winner===null&&m.players.some(p=>p.id===me))||s.rooms?.some(r=>r.players.some(p=>p.id===me)))return fail('Leave your current match and room before restoring a profile.',409);
   const key=typeof input.recoveryKey==='string'?input.recoveryKey:'';
   if(key.length<8||key.length>64)return fail('Enter your profile name and recovery key (8–64 characters).');
   const entry=Object.entries(s.profiles||{}).find(([,p])=>cleanName(p.name).toLowerCase()===cleanName(String(input.name||'')).toLowerCase());
   const target=entry?.[1];const attempts=target?.recoveryAttempts;
   if(attempts&&attempts.until>now&&attempts.count>=5)return fail('Too many attempts. Try again in 15 minutes.',429);
   const hash=await recoveryHash(key,target?.recovery?.salt||'missing-profile-recovery');
   const valid=!!target?.recovery&&sameHash(hash,target.recovery.hash);
   if(target){target.recoveryAttempts=valid?undefined:{count:attempts&&attempts.until>now?attempts.count+1:1,until:attempts&&attempts.until>now?attempts.until:now+900000};}
   if(valid&&target?.ban)return fail('This player profile has been banned by the administrator.',403);
   if(valid)s.queue=s.queue.filter(p=>p.id!==me);
   const result=await db.prepare("UPDATE arena SET data=?,revision=revision+1 WHERE id='lobby' AND revision=?").bind(JSON.stringify(s),row.revision).run();if(!result.meta.changes)continue;
   if(!valid)return fail('Profile name or recovery key is incorrect.',401);
   const restored=entry![0];return Response.json({...standings(s,restored),sessionId:restored,hasProfile:true,recoveryEnabled:true,history:target!.history||[],match:null,queued:false,waiting:0,now,message:'Profile restored. This browser will remember you.'},{headers:{...headers,'Set-Cookie':`arena_player=${restored}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`}});
  }
  if(input.action==='recovery_set'){
   const profile=s.profiles?.[me];if(!profile)return fail('Save your profile before setting a recovery key.');
   const key=typeof input.recoveryKey==='string'?input.recoveryKey:'';
   if(key.length<8||key.length>64||key.trim()!==key)return fail('Use 8–64 characters, without spaces at the beginning or end.');
   const salt=crypto.randomUUID();profile.recovery={salt,hash:await recoveryHash(key,salt)};profile.recoveryAttempts=undefined;message='Recovery key saved. Keep it somewhere safe.';
  }

  if(input.action==='play_streak'){const profile=s.profiles?.[me];if(!profile)return fail('Save your profile first.',401);if(typeof input.enabled!=='boolean')return fail('Choose whether to enable your play streak.');enablePlayStreak(profile,input.enabled);}
  const waitingBefore=s.queue.find(p=>p.id===me);if(waitingBefore)waitingBefore.seen=now;
  s.queue=s.queue.filter(p=>now-p.seen<12000);
  s.matches=s.matches.filter(m=>m.winner===null||now-m.created<3600000);
  for(const match of s.matches){if(match.winner!==null)continue;if(updateConnection(match,me,now))continue;if(match.letterChoice)advanceLetterChoice(match,now);else if(now>=match.deadline)loseHeart(match);tickBot(match,botVocabulary[match.difficulty||'normal'],now);}
  for(const room of s.rooms){room.id??=crypto.randomUUID();const member=room.players.find(p=>p.id===me);if(member)member.seen=now;const live=s.matches.some(m=>m.id===room.matchId&&m.winner===null);if(!live){room.players=room.players.filter(p=>now-p.seen<120000);if(!room.players.some(p=>p.id===room.hostId))room.hostId=room.players[0]?.id||'';}}
  s.rooms=s.rooms.filter(r=>r.players.length>0);
  let room=s.rooms.find(r=>r.players.some(p=>p.id===me));
  let m=s.matches.find(m=>m.players.some(p=>p.id===me)&&m.winner===null)??s.matches.findLast(m=>m.players.some(p=>p.id===me));
  if(input.action==='cancel')s.queue=s.queue.filter(p=>p.id!==me);
  if(input.action==='leave'&&m)forfeitPlayer(m,m.players.findIndex(p=>p.id===me));
  finishPendingMatches(s);
  const desiredName=cleanName(input.name??s.profiles?.[me]?.name??'');
  if(['queue','practice','room_create','room_join'].includes(input.action)&&s.profiles?.[me]?.roomJoinRequest?.state==='pending')s.profiles[me].roomJoinRequest!.state='closed';
  const registration=['profile','queue','practice','room_create','room_join'].includes(input.action);
  if(registration){if(!desiredName)return fail('Please choose a name with letters or numbers.');if(nameTaken(s,me,desiredName))return fail('That name is already taken. Please choose a different name.',409);}
  const p:Player={rating:s.profiles?.[me]?.rating??1000,id:me,mode:input.mode==='casual'?'casual':'ranked',playerCount:count,name:desiredName,seen:now,avatar:earnedAvatar(input.avatar??s.profiles?.[me]?.avatar,Math.max(s.profiles?.[me]?.peakRating||0,s.profiles?.[me]?.rating??1000))};
  if(input.action==='profile'){const profile=ensureProfile(s,p);profile.name=p.name;profile.avatar=p.avatar;const member=room?.players.find(x=>x.id===me);if(member){member.name=p.name;member.avatar=p.avatar;}}
  if(['queue','practice','room_create','room_join'].includes(input.action)&&m?.winner===null)return fail('Finish your current match before joining another.',409);
  if(['queue','practice'].includes(input.action)){
   if(room)return fail('Leave your custom room before joining a public queue.',409);
   s.queue=s.queue.filter(p=>p.id!==me);m=undefined;
   const profile=ensureProfile(s,p);profile.name=p.name;profile.avatar=p.avatar;
   if(input.action==='practice'){m=createMatch(p,{id:'bot',name:'Sparky · bot',seen:now,avatar:{color:'coral',shape:'bear',accessory:'none'}},true);m.difficulty=['easy','normal','hard'].includes(input.difficulty||'')?input.difficulty:'normal';s.matches.push(m);}
   else {const candidates=s.queue.filter(q=>(q.mode||'ranked')===p.mode&&(q.playerCount||2)===count);if(candidates.length>=count-1){const opponents:Player[]=[];while(opponents.length<count-1)opponents.push(candidates.splice(Math.floor(Math.random()*candidates.length),1)[0]);s.queue=s.queue.filter(q=>!opponents.some(o=>o.id===q.id));m=createGroupMatch([p,...opponents].map(p=>({...p,rating:s.profiles?.[p.id]?.rating??1000})));m.mode=p.mode;s.matches.push(m);}else s.queue.push({...p,queuedAt:now});}
  }
  if(input.action==='room_create'){
   if(room)return fail('You are already in a room. Leave it before creating another.',409);
   const profile=ensureProfile(s,p);profile.name=p.name;profile.avatar=p.avatar;
   s.queue=s.queue.filter(q=>q.id!==me);room={id:crypto.randomUUID(),visibility:input.visibility==='public'?'public':'private',code:roomCode(s),hostId:me,capacity:count,players:[p],created:now};s.rooms.push(room);m=undefined;
  }
  if(input.action==='room_join'){
   const code=String(input.code||'').trim().toUpperCase();if(!/^[A-Z0-9]{4}$/.test(code))return fail('Enter a 4-letter or number room code.');
   const target=s.rooms.find(r=>r.code===code);if(!target)return fail('Room not found. Check the code or ask your host for a new one.',404);
   if(room&&room.code!==code)return fail('Leave your current room before joining another.',409);
   if(!target.players.some(x=>x.id===me)){
    if(s.matches.some(x=>x.id===target.matchId&&x.winner===null))return fail('This room is in a match. Join after it finishes.',409);
    if(target.players.length>=target.capacity)return fail('This room is full.',409);
    target.players.push(p);
    if(target.players.length>=target.capacity)for(const profile of Object.values(s.profiles||{}))if(target.id&&profile.roomJoinRequest?.roomId===target.id&&profile.roomJoinRequest.state==='pending')profile.roomJoinRequest.state='closed';
   }
   const profile=ensureProfile(s,p);profile.name=p.name;profile.avatar=p.avatar;
   s.queue=s.queue.filter(q=>q.id!==me);room=target;m=undefined;
  }
  if(input.action==='room_start'){
   if(!room||room.hostId!==me)return fail('Only the room host can start the match.',403);
   if(s.matches.some(x=>x.id===room!.matchId&&x.winner===null))return fail('The room match is already running.',409);
   if(room.players.length!==room.capacity)return fail(`Waiting for ${room.capacity-room.players.length} more player(s).`,409);
   if(room.players.some(p=>s.matches.some(x=>x.winner===null&&x.players.some(q=>q.id===p.id))))return fail('A room member is still in another match.',409);
   for(const profile of Object.values(s.profiles||{}))if(room.id&&profile.roomJoinRequest?.roomId===room.id&&profile.roomJoinRequest.state==='pending')profile.roomJoinRequest.state='closed';
   m=createGroupMatch(room.players,false,'casual',true);if(room.players.some(p=>p.agent))return fail('This room contains a retired agent. Create a new room to play.',409);m.mode='casual';m.custom=true;s.matches.push(m);room.matchId=m.id;
  }
  if(input.action==='room_leave'&&room){if(m?.winner===null)forfeitPlayer(m,m.players.findIndex(p=>p.id===me));room.players=room.players.filter(p=>p.id!==me);if(room.hostId===me)room.hostId=room.players[0]?.id||'';s.rooms=s.rooms.filter(r=>r.players.length);room=undefined;}
  if(input.action==='choose_letter'&&m){message=input.matchId===m.id?chooseLetter(m,m.players.findIndex(p=>p.id===me),String(input.choiceId||''),String(input.letter||'')):'This match has ended.';}
  if(input.action==='status'&&m&&!m.letterChoice&&m.winner===null&&m.id===input.matchId&&m.deadline===input.turnDeadline&&m.players[m.turn].id===me&&typeof input.draft==='string'){m.drafts??=m.players.map(()=>'');m.drafts[m.turn]=censorChat(input.draft.slice(0,60));}
  if(input.action==='use_power'){
   message=m&&input.matchId===m.id&&input.turnId===wordTurnId(m)&&input.power&&powerKinds.includes(input.power)
    ?useCasualPower(m,m.players.findIndex(p=>p.id===me),input.power,input.turnId)
    :'That power-up cannot be used on this turn.';
  }
  if(input.action==='word')message=submitWordForTurn(m,me,input,w=>dictionary.has(w),m&&previousTurn===wordTurnId(m)?previousDeadline:undefined);
  if(m){const member=m.players.find(p=>p.id===me);if(member)member.seen=now;}
  if(['rematch','rematch_cancel'].includes(input.action))message=m&&m.id===input.matchId?requestRematch(s,m,me,input.action==='rematch_cancel',now):'This match is no longer available.';
  advanceRematches(s,now);m=s.matches.find(x=>x.winner===null&&x.players.some(p=>p.id===me))||m;
  finishPendingMatches(s);
  recordMatchAnalytics(s,analyticsBefore,now);
  if(!compact)for(const profile of Object.values(s.profiles||{})){profile.peakRating=Math.max(profile.peakRating||0,profile.rating);profile.publicId??=crypto.randomUUID();}
  const result=await db.prepare("UPDATE arena SET data=?,revision=revision+1 WHERE id='lobby' AND revision=?").bind(JSON.stringify(s),row.revision).run();if(!result.meta.changes)continue;
  const snapshot=arenaSnapshot(s,me,m,room,now,message,row.revision+1,compact,input.action==='view'?input.publicId||'':undefined);
  return Response.json(compact?snapshot:await withTypingPreview(snapshot),{headers:replyHeaders});
 }
 return fail('Arena is busy. Please retry.',503);
}catch{return Response.json({error:'Could not reach the arena. Please try again.'},{status:503,headers});}}
