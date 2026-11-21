import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const require=createRequire(import.meta.url);
Module._extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2023}}).outputText,file);
const game=require('../lib/game.ts'),{submitWordForTurn,wordTurnId}=require('../lib/word-submission.ts');
const a=crypto.randomUUID(),b=crypto.randomUUID(),now=Date.now();
const make=()=>{const m=game.createMatch({id:a,name:'A',seen:now},{id:b,name:'B',seen:now});m.turn=m.players.findIndex(p=>p.id===a);delete m.letterChoice;m.turnStartsAt=now;m.deadline=now+15000;m.letter='a';m.prefix='a';return m};
const input=(m,word)=>({matchId:m.id,turnId:wordTurnId(m),turnDeadline:m.deadline,actionId:crypto.randomUUID(),word});
let m=make(),bad=input(m,'azzzzz');assert.match(submitWordForTurn(m,a,bad,()=>false),/Not in/);assert.equal(m.mistakes,4);
assert.match(submitWordForTurn(m,a,bad,()=>false),/Not in/);assert.equal(m.mistakes,4,'A repeated rejected request costs one attempt total');
const good=input(m,'apple');assert.equal(submitWordForTurn(m,a,good,()=>true),'');assert.equal(m.words.length,1);
assert.equal(submitWordForTurn(m,a,good,()=>true),'');assert.equal(m.words.length,1,'A successful request is also idempotent');
assert.match(submitWordForTurn(m,a,input({...m,id:'old-match'},'apple'),()=>true),/match has ended/);
m=make();const late=input(m,'apple');m.turnStartsAt+=1000;m.deadline+=1000;assert.match(submitWordForTurn(m,a,late,()=>true),/turn has ended/);assert.equal(m.words.length,0);assert.equal(m.mistakes,5);
assert.match(submitWordForTurn(m,a,{matchId:m.id,word:'apple'},()=>true),/turn has ended/,'Missing turn context fails closed');
m=make();const reconnect=input(m,'apple');m.deadline+=3000;assert.equal(submitWordForTurn(m,a,reconnect,()=>true),'','A shared reconnect extension does not change turn identity');
m=make();m.words=[{word:'apple',player:1-m.turn}];assert.match(submitWordForTurn(m,a,input(m,'apple'),()=>true),/already been played/);assert.equal(m.mistakes,4);assert.equal(submitWordForTurn(m,a,input(m,'animal'),()=>true),'');assert.equal(m.words.at(-1).word,'animal');

const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('drizzle/0000_majestic_leader.sql','utf8'));
const binding={prepare(sql){return {bind(...args){return {async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}},async first(){return db.prepare(sql).get(...args)}}},async first(){return db.prepare(sql).get()}}}};
const originalLoad=Module._load;Module._load=function(id,...args){if(id==='cloudflare:workers')return {env:{DB:binding}};return originalLoad.call(this,id,...args)};
const {POST}=require('../app/api/arena/route.ts');Module._load=originalLoad;
const save=s=>db.prepare("INSERT INTO arena(id,revision,data) VALUES('lobby',0,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=arena.revision+1").run(JSON.stringify(s));
const stored=()=>JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data);
const send=(id,data)=>POST(new Request('https://test/api/arena',{method:'POST',headers:{origin:'https://test','Content-Type':'application/json','X-Arena-Session':id},body:JSON.stringify(data)}));
m=make();const state={leaderboardReset:1,queue:[],matches:[m],profiles:{}};game.ensureProfile(state,m.players[0]);game.ensureProfile(state,m.players[1]);save(state);
bad={action:'word',...input(m,'azzzzz')};const replies=await Promise.all([send(a,bad),send(a,bad)]);for(const r of replies)assert.equal(r.status,200);assert.equal(stored().matches[0].mistakes,4,'Concurrent retries commit only one rejection via CAS');
let response=await (await send(a,{action:'word',compact:true,...input(m,'apple')})).json();assert.equal(response.partial,true,'Active word submissions return a compact snapshot');assert.equal(response.match.words.length,1);assert.equal(response.match.wordReceipts,undefined,'Private request receipts stay out of snapshots');
const before=stored();response=await (await send(a,{action:'play_streak',enabled:true,matchId:m.id})).json();assert.equal(response.message,'');assert.equal(stored().matches[0].rematch,undefined);assert.equal(stored().profiles[a].playStreak.enabled,true);
const ended=stored();game.forfeitPlayer(ended.matches[0],0);save(ended);response=await (await send(a,{action:'play_streak',enabled:false,matchId:m.id})).json();assert.equal(response.message,'');assert.equal(stored().matches[0].rematch,undefined,'Changing the daily streak never requests a rematch');
// Separate sessions, unique names and mode/count partitions use the real route.
save({leaderboardReset:1,queue:[],matches:[]});
for(const name of ['', '   '])assert.equal((await send(a,{action:'queue',name})).status,400);
assert.equal((await send(a,{action:'profile',name:'Journey A'})).status,200);assert.equal((await send(b,{action:'profile',name:'Journey A'})).status,409);
await send(a,{action:'queue',name:'Journey A',mode:'ranked',playerCount:2});await send(b,{action:'queue',name:'Journey B',mode:'casual',playerCount:2});assert.equal(stored().matches.length,0,'Modes never mix');
await send(b,{action:'cancel'});response=await (await send(b,{action:'queue',name:'Journey B',mode:'ranked',playerCount:2})).json();assert.equal(response.match.players.length,2);assert.equal(response.match.mode,'ranked');
assert.equal((await send(a,{action:'practice',name:'Journey A'})).status,409,'A late practice click cannot replace a live human match');
const chooser=response.match.players[response.match.letterChoice.chooser].name==='Journey A'?a:b;
await send(chooser,{action:'choose_letter',matchId:response.match.id,choiceId:response.match.letterChoice.id,letter:response.match.letterChoice.options[0]});
const current=stored().matches[0];assert(!current.letterChoice);assert.equal(current.turnDuration,15000);
await send(a,{action:'leave'});await send(a,{action:'rematch',matchId:current.id});await send(b,{action:'rematch',matchId:current.id});assert.equal(stored().matches[0].rematch.ready.length,2);assert(stored().matches[0].rematch.startAt);
await send(a,{action:'rematch_cancel',matchId:current.id});assert.equal(stored().matches[0].rematch.ready.length,1);assert.equal(stored().matches[0].rematch.startAt,undefined);
console.log('PASS: stale/missing turn rejection, duplicate and concurrent retries, valid retry after duplicate word, reconnect-safe turn identity, private receipts, independent session registration/queue/match/rematch, unchanged starting clock, and daily-streak isolation.');

const {rollPower,powerKinds}=game;
for(const [length,chance] of [[5,0],[6,.15],[7,.30],[8,.45],[9,.60],[10,.75],[20,.75]]){
 assert.equal(rollPower(length,()=>chance),undefined);
 if(chance)for(const [index,kind] of powerKinds.entries()){
  const draws=[chance-.001,(index+.5)/3];
  assert.equal(rollPower(length,()=>draws.shift()),kind);
 }
}
m=make();m.mode='casual';
const player=m.turn,opponent=1-player;
m.casualPower={held:[{},{}],queued:[{},{}]};
m.casualPower.held[player]={attempt:2,extraTime:1};
assert.equal(game.useCasualPower(m,player,'attempt',wordTurnId(m)),'');
assert.match(game.useCasualPower(m,player,'attempt',wordTurnId(m)),/already/);
assert.equal(m.casualPower.held[player].attempt,1);
assert.equal(submitWordForTurn(m,a,input(m,'apple'),()=>true),'');
assert.equal(m.turn,opponent);
assert.equal(m.mistakes,4);
assert.deepEqual(m.casualPower.queued[opponent],{});
