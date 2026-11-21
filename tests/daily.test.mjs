import fs from 'node:fs';import Module,{createRequire} from 'node:module';import ts from 'typescript';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
const require=createRequire(import.meta.url);
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
const daily=require('../lib/daily.ts'),game=require('../lib/game.ts'),now=Date.UTC(2026,9,15,12);
for (const [instant, expected] of [
 ['2026-01-01T16:59:59.999Z', '2025-12-31'],
 ['2026-01-01T17:00:00.000Z', '2026-01-01'],
 ['2026-07-01T15:59:59.999Z', '2026-06-30'],
 ['2026-07-01T16:00:00.000Z', '2026-07-01'],
]) assert.equal(daily.dailyDate(Date.parse(instant)), expected);
for(const lang of ['en','es','de']){const a=daily.newDaily(lang,now),b=daily.newDaily(lang,now+60000);assert.equal(a.letter,b.letter);assert.equal(a.date,b.date);assert.equal(a.hearts,2);assert.equal(a.deadline-now,15000);assert.equal(a.attempts,5);assert(!a.completed);}
for(const [word,seconds] of [['apple',0],['turtle',1],['orchard',1],['elephant',1],['pineapple',2]]){
 const trial=daily.newDaily('en',now),deadline=trial.deadline;
 trial.letter=word[0];
 assert.equal(daily.playDaily(trial,word,()=>true,deadline,now+100),'');
 assert.equal(trial.deadline,deadline+seconds*1000);
}
let run=daily.newDaily('en',now);run.letter='a';assert.equal(daily.playDaily(run,'Ápple',w=>w==='apple',run.deadline,now+100),'');assert.equal(run.letter,'e');assert.equal(run.words[0],'apple');run.letter='a';const deadline=run.deadline;assert(daily.playDaily(run,'apple',()=>true,deadline,now+200).includes('Already'));assert.equal(run.deadline,deadline);assert.equal(run.attempts,4);assert(daily.playDaily(run,'air',()=>true,deadline-1,now+200).includes('changed'));assert.equal(run.attempts,4);daily.tickDaily(run,deadline);assert.equal(run.hearts,0);daily.tickDaily(run,run.deadline);assert(run.finished);assert.equal(run.hearts,0);
run=daily.newDaily('en',now);for(let i=0;i<12;i++){run.letter='a';assert.equal(daily.playDaily(run,'answer'+i,()=>true,run.deadline,now+i*100),'');}assert(run.completed);assert(run.finished);assert.equal(run.words.length,12);
const words=require('../data/words.json'),bits=require('../data/word-languages.json');assert.equal(bits.length,words.length);for(const [w,bit] of [['apple',1],['arbol',2],['haus',4]])assert(Number(bits[words.indexOf(w)])&bit,w);
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('drizzle/0000_majestic_leader.sql','utf8'));
const binding={prepare(sql){return{bind(...args){return{async run(){return{meta:{changes:Number(db.prepare(sql).run(...args).changes)}}},async first(){return db.prepare(sql).get(...args)}}},async first(){return db.prepare(sql).get()}}}};
const orig=Module._load;Module._load=function(id,...args){if(id==='cloudflare:workers')return{env:{DB:binding}};return orig.call(this,id,...args)};
const {POST}=require('../app/api/daily/route.ts');Module._load=orig;
const id=crypto.randomUUID();const state={queue:[],matches:[],profiles:{[id]:{name:'Daily player',rating:1000,wins:0,losses:0}}};db.prepare("INSERT OR REPLACE INTO arena (id,data,revision) VALUES ('lobby',?,0)").run(JSON.stringify(state));
const req=(action,extra={},token=id,origin='https://test')=>POST(new Request('https://test/api/daily',{method:'POST',headers:{'Content-Type':'application/json','X-Arena-Session':token,origin},body:JSON.stringify({action,language:'en',...extra})}));
assert.equal((await req('start',{},'')).status,401);assert.equal((await req('start',{},id,'https://elsewhere')).status,403);assert.equal((await req('start',{language:'fr'})).status,400);
const first=await (await req('start')).json(),second=await (await req('start')).json();assert.equal(first.run.id,second.run.id);assert.equal(first.run.deadline,second.run.deadline);
const word=words.find((w,i)=>w.startsWith(first.run.letter)&&w.length===6&&(Number(bits[i])&1));const accepted=await (await req('word',{word,deadline:first.run.deadline,hearts:999})).json();assert.equal(accepted.run.deadline,first.run.deadline+1000);assert.equal(accepted.run.words[0],word);assert.equal(accepted.run.hearts,2);
const finished=await (await req('finish')).json();assert(finished.run.finished);assert.equal((await (await req('start')).json()).run.id,finished.run.id);const stored=JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data);assert.equal(stored.profiles[id].rating,1000);assert(!JSON.stringify(game.publicProfile(stored.profiles[id])).includes('daily'));
const es=await (await req('start',{language:'es'})).json();assert.notEqual(es.run.id,first.run.id);assert.equal(es.run.language,'es');
console.log('PASS: equal daily conditions by language/date, clocks, attempts, repeated/stale answers, persisted single attempts, language dictionaries, authorization, forged-value rejection and no Elo effect.');

const resumed=daily.newDaily('en',now);resumed.deadline=now+5000;daily.reconnectDaily(resumed,now+6000);assert.equal(resumed.deadline,now+5000);assert(!resumed.reconnectUsed);daily.reconnectDaily(resumed,now+12000);assert.equal(resumed.deadline,now+5000);console.log('PASS: daily reconnect never extends the countdown.');

const lateState=JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data),lateRun=lateState.profiles[id].daily.es;lateRun.deadline=Date.now()-1;lateRun.lastSeen=Date.now();db.prepare("UPDATE arena SET data=? WHERE id='lobby'").run(JSON.stringify(lateState));const staleAnswer=await (await req('word',{language:'es',word:'arbol',deadline:lateRun.deadline})).json();assert(staleAnswer.message.includes('complete'));assert.equal(staleAnswer.run.hearts,0);assert.equal(staleAnswer.run.words.length,0);console.log('PASS: daily reconnect adjustment never turns a timed-out submission into a new-turn answer.');

run=daily.newDaily('en',now);const fixed=run.deadline;run.letter='a';daily.playDaily(run,'apple',()=>true,fixed,now+1000);assert.equal(run.deadline,fixed);for(let i=0;i<5;i++)daily.playDaily(run,'invalid',()=>false,fixed,now+2000);assert.equal(run.hearts,1);assert.equal(run.deadline,fixed);daily.tickDaily(run,fixed);assert.equal(run.finished,fixed);assert(!run.completed);console.log('PASS: accepted words and lost lives never reset the 15-second clock.');

const beforeIdlePoll=db.prepare("SELECT revision FROM arena WHERE id='lobby'").get().revision;await req('status');assert.equal(db.prepare("SELECT revision FROM arena WHERE id='lobby'").get().revision,beforeIdlePoll,'Finished daily status must not write shared game state');
const fresh=await (await req('start',{language:'de'})).json();const beforeActivePoll=db.prepare("SELECT revision FROM arena WHERE id='lobby'").get().revision;for(let i=0;i<5;i++)await req('status',{language:'de'});assert.equal(db.prepare("SELECT revision FROM arena WHERE id='lobby'").get().revision,beforeActivePoll,'Active daily polls must not compete with word writes');console.log('PASS: idle and active daily status polls perform zero shared-state writes.');

const secondRun=await (await req('retry',{runId:finished.run.id})).json();
assert.equal(secondRun.run.runNumber,2);
assert.equal(secondRun.canRetry,false);
assert.notEqual(secondRun.run.id,finished.run.id);
const secondFinished=await (await req('finish')).json();
assert.equal((await req('retry',{runId:secondFinished.run.id})).status,403);
const adminState=JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data);
adminState.profiles[id].name='vecaid';
adminState.profiles[id].publicId=crypto.randomUUID();
db.prepare("UPDATE arena SET data=? WHERE id='lobby'").run(JSON.stringify(adminState));
assert.equal((await req('retry',{runId:secondFinished.run.id})).status,403,'The name alone grants no unlimited access');
adminState.administrator={ownerUserId:'owner',publicId:adminState.profiles[id].publicId};
db.prepare("UPDATE arena SET data=? WHERE id='lobby'").run(JSON.stringify(adminState));
const replay=await (await req('retry',{runId:secondFinished.run.id})).json();
assert.equal(replay.canRetry,true);
assert.notEqual(replay.run.id,secondFinished.run.id);
assert.deepEqual(replay.run.words,[]);
assert.equal(replay.run.deadline-replay.run.started,15000);
assert.equal((await req('retry',{runId:finished.run.id})).status,409);
const replayFinished=await (await req('finish')).json();
assert.equal((await req('retry',{runId:replayFinished.run.id})).status,200);
console.log('PASS: two runs per language, with unlimited retries for the linked vecaid administrator.');

const staged=daily.newDaily('en',now,true);
assert.equal(staged.started,now+3000);
assert.equal(staged.deadline-staged.started,15000);
const readyWord=staged.letter+'word';
assert.equal(daily.playDaily(staged,readyWord,()=>true,staged.deadline,staged.started-1),'Wait for GO.');
assert.equal(staged.attempts,5);
assert.equal(staged.words.length,0);
assert.equal(daily.playDaily(staged,readyWord,()=>true,staged.deadline,staged.started),'');
console.log('PASS: countdown blocks early submissions and preserves 15 seconds from GO.');


const {dailyChainReport}=require('../lib/daily-analytics.ts');
const chainTracking=JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data).dailyChainAnalytics;
const chainReport=dailyChainReport(chainTracking,7,Date.now());
assert.equal(chainReport.recent[0].players,1,'One player across languages and retries');
assert.equal(chainReport.totals.starts,4,'Linked admin runs do not inflate public totals');
assert.equal(chainReport.totals.retries,1);
assert.equal(chainReport.totals.ended,3,'Each recorded result counts once');
assert.equal(chainReport.byLanguage.find(row=>row.language==='en').starts,2);
assert.equal(chainReport.byLanguage.find(row=>row.language==='es').starts,1);
console.log('PASS: Daily Chain reports deduplicate players and results and exclude admin runs.');

const bonusRun=daily.newDaily('en',now);
bonusRun.letter='p';
const originalDeadline=bonusRun.deadline;
for(const [word,bonus] of [['paper',0],['runner',1000],['rainbow',2000],['watchdog',3000]]){
 assert.equal(daily.playDaily(bonusRun,word,()=>true,bonusRun.deadline,now+500),'');
 assert.equal(bonusRun.deadline,originalDeadline+bonus);
}
assert.ok(daily.playDaily(bonusRun,'garbage',()=>false,bonusRun.deadline,now+600));
assert.equal(bonusRun.deadline,originalDeadline+3000);
