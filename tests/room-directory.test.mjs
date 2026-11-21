import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const require=createRequire(import.meta.url);
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
const {changeRoom,roomDirectory,roomSession}=require('../lib/room-directory.ts');
const ids=Array.from({length:8},()=>crypto.randomUUID()),[host,host2,privateHost,a,b,stranger]=ids,roomId=crypto.randomUUID(),roomId2=crypto.randomUUID(),now=Date.now();
function fixture(){return {leaderboardReset:1,queue:[],matches:[],profiles:Object.fromEntries(ids.map((id,i)=>[id,{publicId:crypto.randomUUID(),name:['Host','Other host','Private host','Guest','Second guest','Stranger'][i]||'Player '+i,rating:1000,wins:0,losses:0,lastSeen:now,recovery:{salt:'private-salt',hash:'private-recovery-hash'}}])),rooms:[{id:roomId,visibility:'public',code:'PUB1',hostId:host,capacity:2,players:[{id:host,name:'Host',seen:now}],created:now},{id:roomId2,visibility:'public',code:'PUB2',hostId:host2,capacity:2,players:[{id:host2,name:'Other host',seen:now}],created:now},{code:'HIDE',hostId:privateHost,capacity:2,players:[{id:privateHost,name:'Private host',seen:now}],created:now}]};}
const request=(roomId=roomId2)=>({action:'request',roomId,requestId:crypto.randomUUID()});
let s=fixture(),before=JSON.stringify(s),view=roomDirectory(s,'',now);
assert.equal(JSON.stringify(s),before,'Listing is read-only');assert.equal(view.rooms.length,2);assert.deepEqual(view.rooms[0].languages,['en','es','de']);assert.equal(view.requests.length,0);
for(const secret of [...ids,'HIDE','PUB1','private-recovery-hash','private-salt','Private host'])assert(!JSON.stringify(view).includes(secret),'No private room/code/session/credential disclosure: '+secret);
assert.equal(roomSession(new Headers({'X-Arena-Session':a})),a);assert.equal(roomSession(new Headers({cookie:'arena_player='+b,'X-Arena-Session':a})),b);
assert.equal(changeRoom(s,a,{action:'privacy',roomId,visibility:'private'},now).status,403);
const first=request(roomId);assert.deepEqual(changeRoom(s,a,first,now),{});assert.deepEqual(changeRoom(s,a,first,now+10),{},'Network retry is idempotent');
assert.equal(roomDirectory(s,host,now).requests.length,1);assert.equal(roomDirectory(s,stranger,now).requests.length,0);assert.equal(roomDirectory(s,a,now).request.state,'pending');
assert.equal(changeRoom(s,a,request(roomId2),now+59999).status,429);assert.equal(changeRoom(s,a,request(roomId2),now+59999).retryAfter,1);
assert.deepEqual(changeRoom(s,a,{action:'cancel',requestId:first.requestId},now+100),{});assert.equal(roomDirectory(s,host,now+100).requests.length,0);assert.equal(changeRoom(s,a,request(roomId2),now+100).status,429,'Cancel cannot reset cooldown');
const second=request(roomId2);assert.deepEqual(changeRoom(s,a,second,now+60000),{});assert.equal(roomDirectory(s,a,now+60000).retryAt,now+120000);
assert.equal(changeRoom(s,host,{action:'accept',roomId:roomId2,requestId:second.requestId},now+60001).status,403);
assert.deepEqual(changeRoom(s,host2,{action:'decline',roomId:roomId2,requestId:second.requestId},now+60001),{});assert.equal(changeRoom(s,a,request(),now+60002).status,429,'Decline cannot reset cooldown');
s=fixture();const join=request(roomId);changeRoom(s,a,join,now);changeRoom(s,b,request(roomId),now);
assert.deepEqual(changeRoom(s,host,{action:'accept',roomId,requestId:join.requestId},now+1),{});assert.equal(s.rooms[0].players.length,2);assert.equal(roomDirectory(s,a,now+1).request.state,'accepted');assert(!roomDirectory(s,stranger,now+1).rooms.some(r=>r.id===roomId),'Full room hidden');
assert.deepEqual(changeRoom(s,host,{action:'accept',roomId,requestId:join.requestId},now+2),{});assert.equal(s.rooms[0].players.length,2,'Approval retry cannot add a second seat');assert.equal(s.profiles[b].roomJoinRequest.state,'closed','Filling a room closes other requests permanently');
assert.equal(changeRoom(s,host,{action:'accept',roomId,requestId:s.profiles[b].roomJoinRequest.id},now+2).status,409);
s=fixture();const privateRequest=request(roomId);changeRoom(s,a,privateRequest,now);assert.deepEqual(changeRoom(s,host,{action:'privacy',roomId,visibility:'private'},now+1),{});assert.equal(s.profiles[a].roomJoinRequest.state,'closed');assert(!roomDirectory(s,a,now+1).rooms.some(r=>r.id===roomId));assert.equal(changeRoom(s,b,request(roomId),now+1).status,409);assert.equal(changeRoom(s,host,{action:'accept',roomId,requestId:privateRequest.requestId},now+2).status,409);
changeRoom(s,host,{action:'privacy',roomId,visibility:'public'},now+3);assert.equal(roomDirectory(s,host,now+3).requests.length,0,'Old requests never revive after a privacy toggle');
for(const setup of [state=>state.queue.push({id:a,name:'Guest',seen:now}),state=>state.matches.push({id:'live',players:[{id:a}],winner:null}),state=>state.rooms[2].players.push({id:a,name:'Guest',seen:now})]){s=fixture();setup(s);assert.equal(changeRoom(s,a,request(roomId),now).status,409);}
for(const setup of [state=>state.profiles[a].ban={at:now},state=>state.profiles[a].agent=true,state=>state.profiles[host].blocked=[state.profiles[a].publicId],state=>state.profiles[a].blocked=[state.profiles[host].publicId]]){s=fixture();setup(s);assert.equal(changeRoom(s,a,request(roomId),now).status,403);}
s=fixture();changeRoom(s,a,request(roomId),now);s.queue.push({id:a,name:'Guest',seen:now});assert.equal(changeRoom(s,host,{action:'accept',roomId,requestId:s.profiles[a].roomJoinRequest.id},now+1).status,409,'A new queue wins over an old request without forfeiting');
s=fixture();changeRoom(s,a,request(roomId),now);assert.equal(roomDirectory(s,host,now+120000).requests.length,0);assert.equal(roomDirectory(s,a,now+120000).request.state,'expired');assert.equal(roomDirectory(s,a,now+120000).rooms.length,0,'Abandoned hosts disappear');

const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('drizzle/0000_majestic_leader.sql','utf8'));
const binding={prepare(sql){return {bind(...args){return {async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}},async first(){return db.prepare(sql).get(...args)}}},async first(){return db.prepare(sql).get()}}}};
const originalLoad=Module._load;Module._load=function(id,...args){if(id==='cloudflare:workers')return {env:{DB:binding}};return originalLoad.call(this,id,...args)};
const {GET,POST}=require('../app/api/rooms/route.ts'),arena=require('../app/api/arena/route.ts').POST;Module._load=originalLoad;
const save=state=>db.prepare("INSERT INTO arena(id,revision,data) VALUES('lobby',0,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=arena.revision+1").run(JSON.stringify(state));
const stored=()=>JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data);
const send=(handler,id,input,origin='https://test')=>handler(new Request('https://test/api/rooms',{method:'POST',headers:{'Content-Type':'application/json',...(id?{'X-Arena-Session':id}:{}),...(origin?{origin}:{})},body:JSON.stringify(input)}));
save(fixture());assert.equal((await send(POST,a,request(roomId),'https://evil')).status,403);assert.equal((await send(POST,a,request(roomId),'')).status,403);assert.equal((await send(POST,'',request(roomId))).status,401);
const x=request(roomId),y=request(roomId);assert.equal((await send(POST,a,x)).status,200);let limited=await send(POST,a,request(roomId2));assert.equal(limited.status,429);assert(Number(limited.headers.get('retry-after'))>0);assert.equal((await send(POST,b,y)).status,200);
const approved=await Promise.all([x,y].map(q=>send(POST,host,{action:'accept',roomId,requestId:q.requestId})));assert.deepEqual(approved.map(r=>r.status).sort(),[200,409]);assert.equal(stored().rooms[0].players.length,2,'Concurrent approvals never overfill a room');
const admitted=stored().rooms[0].players[1].id;const status=await (await send(arena,admitted,{action:'status'})).json();assert.equal(status.room.code,'PUB1');assert.equal(status.room.visibility,'public');assert(status.room.chatId.startsWith('room:PUB1:'));
const started=await (await send(arena,host,{action:'room_start'})).json();assert.equal(started.match.custom,true);assert.equal(started.match.mode,'casual');assert.equal(started.match.ratingChanges,undefined);
assert.equal(stored().profiles[admitted===a?b:a].roomJoinRequest.state,'closed','Starting a match closes leftover requests');
let result=await GET(new Request('https://test/api/rooms'));assert.equal(result.headers.get('cache-control'),'private, no-store');assert(!(await result.json()).rooms.some(r=>r.id===roomId),'Live matches are not joinable');
save(fixture());result=await send(arena,a,{action:'room_create',name:'Guest',playerCount:3});let created=await result.json();assert.equal(created.room.visibility,'private');assert(created.room.id);assert(!(await (await GET(new Request('https://test/api/rooms'))).json()).rooms.some(r=>r.id===created.room.id));
assert.equal((await send(arena,b,{action:'room_join',code:created.room.code,name:'Second guest'})).status,200,'Private code invites still work');
await send(POST,a,{action:'privacy',roomId:created.room.id,visibility:'public'});assert((await (await GET(new Request('https://test/api/rooms'))).json()).rooms.some(r=>r.id===created.room.id));
save(fixture());await send(POST,a,request(roomId));await send(arena,b,{action:'room_join',code:'PUB1',name:'Second guest'});assert.equal(stored().profiles[a].roomJoinRequest.state,'closed','A direct invite filling the final seat closes pending requests');
save(fixture());result=await send(arena,a,{action:'room_create',name:'Guest',playerCount:5,visibility:'public'});created=await result.json();assert.equal(created.room.visibility,'public');assert.equal(created.room.capacity,5);
const oldRoom=await (await send(arena,privateHost,{action:'status'})).json();assert(oldRoom.room.id);assert.equal(oldRoom.room.visibility,'private','Existing rooms stay private');
console.log('PASS: private defaults/legacy migration, public-only read-only directory, no invitation/session/credential leaks, host-only controls, persisted global 60-second cooldown, retry/cancel/decline rules, request expiry, bans/blocks, queue/match conflicts, concurrent capacity checks, shared room/chat admission, unrated start, and existing private invites.');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{default:Directory,RoomPrivacy}=require('../app/room-directory.tsx');
let visibility;const picker=RoomPrivacy({value:'private',onChange:value=>visibility=value});const buttons=picker.props.children[1].props.children;assert.equal(buttons[0].props['aria-pressed'],true);buttons[1].props.onClick();assert.equal(visibility,'public');assert.equal(buttons[1].props.type,'button');
let directoryData=roomDirectory(fixture(),a,Date.now()),hook=0;const oldUseState=React.useState;React.useState=value=>[hook++===0?directoryData:hook===4?false:value,()=>{}];
const render=blocked=>{hook=0;return renderToStaticMarkup(React.createElement(Directory,{sessionId:a,ready:true,blocked:blocked||'',onPrepare:async()=>a,onJoined(){},onHost(){}}))};
try{
 let html=render();assert(html.includes('Open rooms'));assert.equal((html.match(/Request to join<\/button>/g)||[]).length,2);assert(!html.includes('Private host'));
 const waiting=fixture();changeRoom(waiting,a,request(roomId),Date.now());directoryData=roomDirectory(waiting,a,Date.now());html=render();assert(html.includes('Waiting for the host'));assert(html.includes('Next request in'));assert(html.includes('Cancel request'));assert.equal((html.match(/class="primary" disabled=""/g)||[]).length,2);
 directoryData=roomDirectory(fixture(),a,Date.now());html=render('Finish your match first.');assert(html.includes('Finish your match first.'));assert.equal((html.match(/class="primary" disabled=""/g)||[]).length,2);
}finally{React.useState=oldUseState}
console.log('PASS: privacy choice callbacks, public directory rows, pending/cooldown feedback, cancellation affordance, and active-play disabled states.');
