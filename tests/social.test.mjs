import {withChatFilter} from './route-fixtures.mjs';
import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const url=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText).toString('base64');
const gameURL=url(fs.readFileSync('lib/game.ts','utf8')),game=await import(gameURL);
const socialURL=url(withChatFilter(fs.readFileSync('lib/social.ts','utf8')).replace("from './game'","from '"+gameURL+"'")),social=await import(socialURL);
const ids=Array.from({length:4},()=>crypto.randomUUID());
const players=ids.map((id,i)=>({id,name:'Player '+i,seen:Date.now()}));
const state={queue:[],matches:[],profiles:{}};
players.forEach((p,i)=>{state.profiles[p.id]={name:p.name,publicId:'public-'+i,rating:1000,wins:0,losses:0,lastSeen:Date.now(),recovery:{salt:'private-salt',hash:'private-hash'}}});
function match(mode='ranked',custom=false,practice=false){const m=game.createGroupMatch(players.slice(0,2),practice,mode,custom);m.botPlan={word:'secret-target',start:0,step:0,deadline:0};m.drafts=['apple',''];state.matches.push(m);return m;}
const publicGame=match(),casual=match('casual'),privateGame=match('casual',true),practice=match('casual',false,true),agents=match('agents');
assert.deepEqual(social.liveGames(state).map(m=>m.id),[casual.id,publicGame.id]);
for(const m of [privateGame,practice,agents])assert.equal(social.spectatorMatch(state,m.id),null);
publicGame.streaks=[{current:3,best:5},{current:0,best:1}];const view=social.spectatorMatch(state,publicGame.id);assert.deepEqual(view.streaks,publicGame.streaks);assert(view);assert.equal(view.drafts[0],'apple');for(const secret of [...ids,'private-hash','private-salt','secret-target'])assert(!JSON.stringify(view).includes(secret));
const a=ids[0],b=ids[1],c=ids[2],pa='public-0',pb='public-1',pc='public-2';
assert(social.changeFriend(state,'',pb,'request').includes('profile'));
assert(social.changeFriend(state,a,pa,'request').includes('own'));
assert.equal(social.changeFriend(state,a,pb,'request'),'');assert.equal(social.changeFriend(state,a,pb,'request'),'');assert.equal(state.profiles[b].friendRequests.length,1);
assert(social.changeFriend(state,c,pa,'accept').includes('no longer'));
assert.equal(social.friendsSnapshot(state,c).incoming.length,0);assert.equal(social.friendsSnapshot(state,c).outgoing.length,0);
assert.equal(social.friendsSnapshot(state,a).outgoing[0].publicId,pb);
assert.equal(social.friendsSnapshot(state,b).incoming[0].publicId,pa);
assert.equal(social.changeFriend(state,b,pa,'accept'),'');assert.equal(social.changeFriend(state,b,pa,'accept'),'');
assert.deepEqual(state.profiles[a].friends,[pb]);assert.deepEqual(state.profiles[b].friends,[pa]);
assert.equal(social.friendsSnapshot(state,a).friends[0].online,true);assert(social.friendsSnapshot(state,a).friends[0].watchId);
publicGame.winner=0;casual.winner=0;assert(!social.friendsSnapshot(state,a).friends[0].watchId);
state.profiles[b].lastSeen=Date.now()-21000;assert.equal(social.friendsSnapshot(state,a).friends[0].online,false);
assert.equal(social.changeFriend(state,a,pb,'remove'),'');assert.equal(state.profiles[b].friends.length,0);
assert.equal(social.changeFriend(state,a,pc,'request',Date.now()+15000),'');assert.equal(social.changeFriend(state,c,pa,'decline'),'');assert.equal(state.profiles[c].friendRequests.length,0);
assert.equal(social.changeFriend(state,a,pc,'request',Date.now()+30000),'');assert.equal(social.changeFriend(state,a,pc,'cancel'),'');assert.equal(state.profiles[c].friendRequests.length,0);
const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE arena(id TEXT PRIMARY KEY,revision INTEGER,data TEXT)');db.prepare("INSERT INTO arena VALUES('lobby',0,?)").run(JSON.stringify(state));
globalThis.__socialDB={
 prepare(sql){
  return {
   async first(){return db.prepare(sql).get()},
   bind(...args){return {
    async first(){return db.prepare(sql).get(...args)},
    async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}
   }}
  }
 }
};

const source=fs.readFileSync('app/api/social/route.ts','utf8').replace("import {env} from 'cloudflare:workers';","const env={DB:globalThis.__socialDB};").replace("from '../../../lib/social'","from '"+socialURL+"'");
const {POST}=await import(url(source));
const call=(id,action,extra={},origin='https://test')=>POST(new Request('https://test/api/social',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(id?{'X-Arena-Session':id}:{})},body:JSON.stringify({action,...extra})}));
assert.equal((await call('', 'request',{targetId:pb})).status,401);
assert.equal((await call(a,'request',{targetId:pb},'https://evil.test')).status,403);
assert.equal((await call(a,'watch',{matchId:privateGame.id})).status,404);
assert.equal((await call(a,'watch',{matchId:practice.id})).status,404);
const watched=await call('', 'watch',{matchId:publicGame.id});assert.equal(watched.status,200);assert.equal(watched.headers.get('cache-control'),'private, no-store');
const before=db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data;
for(const action of ['word','leave','choose_letter'])assert.equal((await call(c,action,{matchId:publicGame.id})).status,400);
assert.equal(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data,before);
const send=await call(b,'request',{targetId:pa});assert.equal(send.status,200);
const accepted=await Promise.all([call(a,'accept',{targetId:pb}),call(a,'accept',{targetId:pb})]);assert(accepted.every(r=>r.status===200));
const final=JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data);assert.deepEqual(final.profiles[a].friends,[pb]);assert.deepEqual(final.profiles[b].friends,[pa]);
const outsider=await (await call(c,'read')).json();assert.equal(outsider.friends.length,0);assert.equal(outsider.incoming.length,0);
const own=await (await call(a,'read')).json();assert.equal(own.friends.length,1);for(const secret of [...ids,'private-hash','private-salt'])assert(!JSON.stringify(own).includes(secret));
console.log('PASS: request/accept/decline/cancel/remove, idempotency and concurrent acceptance, private lists and friend presence, private/practice/agent game exclusion, safe spectator fields, read-only enforcement, authentication and origin checks.');

// Recovery gates apply to adding/accepting, while cleanup remains available.
const gated=structuredClone(state);gated.profiles[a].friends=[];gated.profiles[b].friends=[];gated.profiles[a].friendRequests=[];gated.profiles[b].friendRequests=[];
const keyA=gated.profiles[a].recovery,keyB=gated.profiles[b].recovery;
delete gated.profiles[a].recovery;
assert.equal(social.friendsSnapshot(gated,a).canAddFriends,false);
assert(social.changeFriend(gated,a,pb,'request').includes('recovery key'));
assert.deepEqual(gated.profiles[b].friendRequests,[]);
gated.profiles[a].friendRequests=[pb];assert(social.changeFriend(gated,a,pb,'accept').includes('recovery key'));assert.deepEqual(gated.profiles[a].friends,[]);
assert.equal(social.changeFriend(gated,a,pb,'decline'),'');
gated.profiles[a].recovery=keyA;delete gated.profiles[b].recovery;gated.profiles[a].friendRequests=[pb];assert(social.changeFriend(gated,a,pb,'accept').includes('This player'));
gated.profiles[b].recovery=keyB;assert.equal(social.changeFriend(gated,a,pb,'accept'),'');
delete gated.profiles[a].recovery;assert.equal(social.changeFriend(gated,a,pb,'remove'),'');
gated.profiles[b].friendRequests=[pa];assert.equal(social.changeFriend(gated,a,pb,'cancel'),'');
assert.equal(social.friendsSnapshot(gated,'').canAddFriends,false);

// Real room lifecycle: public profile IDs work before, during and after private matches.
const avatarURL=url(fs.readFileSync('lib/avatar.ts','utf8'));
const arenaSource=withChatFilter(fs.readFileSync('app/api/arena/route.ts','utf8')).replace("import {env} from 'cloudflare:workers';","const env={DB:globalThis.__socialDB};").replace("from '../../../lib/avatar'","from '"+avatarURL+"'").replace("from '../../../lib/game'","from '"+gameURL+"'").replace("import words from '../../../data/words.json';","const words=['apple','elephant','tree','tiger','rabbit'];");
const {POST:arenaPOST}=await import(url(arenaSource));
const arena=async(id,action,extra={})=>{const r=await arenaPOST(new Request('https://test/api/arena',{method:'POST',headers:{'Content-Type':'application/json','X-Arena-Session':id},body:JSON.stringify({action,...extra})}));assert.equal(r.status,200);return r.json()};
const host=crypto.randomUUID(),guest=crypto.randomUUID();
const room=await arena(host,'room_create',{name:'Private host',playerCount:2});
const joined=await arena(guest,'room_join',{name:'Private guest',code:room.room.code});
const hostId=room.profile.publicId,guestId=joined.profile.publicId;assert(hostId&&guestId);assert(joined.room.players.every(p=>p.publicId));
assert.equal((await arena(host,'view',{publicId:guestId})).viewedProfile.publicId,guestId);
let blocked=await call(host,'request',{targetId:guestId});assert.equal(blocked.status,400);assert((await blocked.json()).error.includes('recovery key'));
await arena(host,'recovery_set',{recoveryKey:'host-secret-123'});
assert.equal((await call(host,'request',{targetId:guestId})).status,200);
blocked=await call(guest,'accept',{targetId:hostId});assert.equal(blocked.status,400);assert((await blocked.json()).error.includes('recovery key'));
const gameStarted=await arena(host,'room_start');assert(gameStarted.match.custom);assert(gameStarted.match.players.every(p=>p.publicId));
await arena(guest,'recovery_set',{recoveryKey:'guest-secret-456'});
assert.equal((await call(guest,'accept',{targetId:hostId})).status,200);
let privateFriends=await (await call(host,'read')).json();assert(privateFriends.canAddFriends);assert(privateFriends.friends.some(p=>p.publicId===guestId));assert(!privateFriends.games.some(m=>m.id===gameStarted.match.id));assert(!privateFriends.friends.find(p=>p.publicId===guestId).watchId);
assert.equal((await call(host,'watch',{matchId:gameStarted.match.id})).status,404);
await call(host,'remove',{targetId:guestId});await arena(host,'leave');
const afterRoom=await (await call(host,'read')).json();assert(afterRoom.recent.some(p=>p.publicId===guestId));
assert.equal((await call(guest,'request',{targetId:hostId})).status,200);assert.equal((await call(host,'accept',{targetId:guestId})).status,200);
privateFriends=await (await call(guest,'read')).json();assert(privateFriends.friends.some(p=>p.publicId===hostId));
for(const secret of [host,guest,'host-secret-123','guest-secret-456','hash','salt'])assert(!JSON.stringify(privateFriends).includes(secret));
console.log('PASS: server recovery requirement on send/accept, both profiles protected before acceptance, cleanup without key, private-room profile access, requests before/during/after custom matches, custom recent opponents, and private match visibility.');

// A full group can add one another immediately, with bounded sustained sends.
const burstNow=Date.now(),burstIds=Array.from({length:13},()=>crypto.randomUUID()),sender=burstIds[0],burst={queue:[],matches:[],profiles:{}};
for(const [i,id] of burstIds.entries())burst.profiles[id]={publicId:'burst-'+i,name:'Burst '+i,rating:1000,wins:0,losses:0,recovery:{salt:'salt',hash:'hash'}};
for(let i=1;i<=10;i++)assert.equal(social.changeFriend(burst,sender,'burst-'+i,'request',burstNow),'');
assert.equal(burst.profiles[sender].friendRequestTimes.length,10);
for(let i=0;i<5;i++)assert.equal(social.changeFriend(burst,sender,'burst-1','request',burstNow+1),'');
assert.equal(burst.profiles[sender].friendRequestTimes.length,10);assert.equal(burst.profiles[burstIds[1]].friendRequests.length,1);
assert(social.changeFriend(burst,sender,'burst-11','request',burstNow+100).includes('60 seconds'));assert(!burst.profiles[burstIds[11]].friendRequests.includes('burst-0'));
assert.equal(social.changeFriend(burst,sender,'burst-1','cancel',burstNow+100),'');assert(social.changeFriend(burst,sender,'burst-1','request',burstNow+100).includes('10 friend requests'));
assert.equal(social.changeFriend(burst,sender,'burst-11','request',burstNow+60000),'');assert.deepEqual(burst.profiles[sender].friendRequestTimes,[burstNow+60000]);assert(!JSON.stringify(game.publicProfile(burst.profiles[sender])).includes('friendRequestTimes'));
// Preserve the pending-request cap separately from the rolling minute limit.
const pendingFull=structuredClone(burst);for(let i=20;i<40;i++)pendingFull.profiles['pending-'+i]={name:'Pending '+i,publicId:'pending-'+i,rating:1000,wins:0,losses:0,friendRequests:['burst-0']};assert(social.changeFriend(pendingFull,sender,'burst-12','request',burstNow+120000).includes('pending requests'));
// The real CAS endpoint must allow a burst but never exceed the cap under contention.
const apiBurst=structuredClone(burst);for(const p of Object.values(apiBurst.profiles)){delete p.friendRequestTimes;delete p.friendRequests;}db.prepare("UPDATE arena SET data=?,revision=revision+1 WHERE id='lobby'").run(JSON.stringify(apiBurst));
const parallel=await Promise.all(Array.from({length:11},(_,i)=>call(sender,'request',{targetId:'burst-'+(i+1)})));assert.equal(parallel.filter(r=>r.status===200).length,10);assert.equal(parallel.filter(r=>r.status===400).length,1);assert((await parallel.find(r=>r.status===400).json()).error.includes('10 friend requests'));
const burstSaved=JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data);assert.equal(burstSaved.profiles[sender].friendRequestTimes.length,10);assert.equal(Object.values(burstSaved.profiles).filter(p=>p.friendRequests?.includes('burst-0')).length,10);
console.log('PASS: 10 immediate distinct requests, duplicate retries cost nothing, cancel/resend cannot reset the cap, exact 60-second recovery, pending cap preserved, private timestamps, and concurrent API enforcement.');
