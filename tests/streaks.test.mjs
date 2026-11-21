import {withChatFilter} from './route-fixtures.mjs';
import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText).toString('base64');
const gameURL=moduleURL(fs.readFileSync('lib/game.ts','utf8')),game=await import(gameURL);
const words=JSON.parse(fs.readFileSync('data/words.json','utf8'));
game.configurePrefixes(words);
function make(n=2,settings={}){const m=game.createGroupMatch(Array.from({length:n},(_,i)=>({id:'player-'+i,name:'Player '+i,seen:Date.now()})));game.beginTurn(m);return Object.assign(m,settings)}
function answer(m,player,word,valid=true){m.turn=player;m.prefix=word[0];m.letter=word[0];m.turnStartsAt=0;delete m.letterChoice;return game.play(m,word,valid)}
for(const count of [2,3,4,5]){
 const m=make(count),length=m.turnDuration;
 for(const [i,word] of ['apple','eagle','earth'].entries()){assert.equal(answer(m,0,word),'');assert.equal(m.streaks[0].current,i+1);assert.equal(m.turn,1);assert.equal(answer(m,1,['rabbit','train','night'][i]),'');}
 assert.deepEqual(m.streaks[0],{current:3,best:3});assert.deepEqual(m.streaks[1],{current:3,best:3});
 m.turn=0;m.prefix='e';const deadline=m.deadline,hearts=[...m.hearts],turns=m.completedTurns;
 assert(game.play(m,'earth',true).includes('already'));assert.deepEqual(m.streaks[0],{current:0,best:3});assert.equal(m.streaks[1].current,3);
 assert.equal(m.deadline,deadline);assert.equal(m.completedTurns,turns);assert.deepEqual(m.hearts,hearts);
 assert.equal(game.play(m,'engine',true),'');assert.deepEqual(m.streaks[0],{current:1,best:3});
 assert.equal(answer(m,0,'egg'),'');assert.equal(m.streaks[0].current,0);
 answer(m,0,game.normalize('Árbol'));assert.equal(m.streaks[0].current,1);
 answer(m,0,'mmxxvi');assert.equal(m.streaks[0].current,0);
 answer(m,0,'zebra');assert(answer(m,0,'zzzzz',false));assert.equal(m.streaks[0].current,0);
 answer(m,0,'tiger');m.turn=0;m.prefix='a';assert(game.play(m,'tunnel',true).includes('Start'));assert.equal(m.streaks[0].current,0);
 answer(m,0,'tunnel');m.turn=0;game.loseHeart(m);assert.equal(m.streaks[0].current,0);assert.equal(m.streaks[0].best,3);assert.equal(m.streaks[1].current,3);
 assert.equal(length,15000);assert.equal(game.durationForTurns(6*count,count),9000);
}
const attempts=make();answer(attempts,0,'apple');attempts.turn=0;attempts.mistakes=1;attempts.prefix='a';game.play(attempts,'aaaaa',false);assert.equal(attempts.hearts[0],1);assert.deepEqual(attempts.streaks[0],{current:0,best:1});
const guarded=make();guarded.streaks=[{current:3,best:3},{current:2,best:2}];game.beginLetterChoice(guarded);const unchanged=structuredClone(guarded.streaks);assert(game.play(guarded,'apple',true));assert.deepEqual(guarded.streaks,unchanged);delete guarded.letterChoice;guarded.turnStartsAt=Date.now()+10000;assert(game.play(guarded,'apple',true));assert.deepEqual(guarded.streaks,unchanged);
const forfeited=make(3);forfeited.streaks=[{current:8,best:8},{current:3,best:3},{current:1,best:1}];game.forfeitPlayer(forfeited,0);assert.deepEqual(forfeited.streaks[0],{current:0,best:8});assert.equal(forfeited.streaks[1].current,3);
for(const [best,percent] of [[0,0],[2,0],[3,3],[4,3],[5,6],[7,6],[8,10],[100,10]])assert.equal(game.streakBonus(best),percent);
function rated(settings={},best=8){const m=make(2,{winner:0,...settings});m.words=Array.from({length:5},()=>({word:'extraordinary',player:0})).concat(Array.from({length:5},()=>({word:'watermelon',player:1})));m.streaks=[{current:0,best},{current:0,best}];const s={queue:[],matches:[m],profiles:{}};game.settleRatings(s);return {m,s}}
const {m:boost,s:boostState}=rated();assert.equal(boost.ratingChanges[0].wordPowerPercent,30);assert.equal(boost.ratingChanges[0].streakPercent,10);assert.equal(boost.ratingChanges[0].bonusPercent,40);assert.equal(boost.ratingChanges[0].delta,22);assert.equal(boost.ratingChanges[1].delta,-10);const saved=JSON.stringify(boostState);game.settleRatings(boostState);assert.equal(JSON.stringify(boostState),saved);
assert.equal(rated({},0).m.ratingChanges[0].bonusPercent,30);assert.equal(rated({forfeited:1}).m.ratingChanges[1].delta,-16);assert.equal(rated({forfeitedPlayers:[1]}).m.ratingChanges[1].streakPercent,0);
for(const settings of [{practice:true},{custom:true},{mode:'casual'},{ratingExempt:true}])assert.equal(rated(settings).m.ratingChanges,undefined);
const floor=make(2,{winner:0,streaks:[{current:8,best:8},{current:8,best:8}]});floor.words=boost.words;const floorState={queue:[],matches:[floor],profiles:Object.fromEntries(floor.players.map((p,i)=>[p.id,{name:p.name,rating:i===0?2000:1000,wins:0,losses:0}]))};game.settleRatings(floorState);assert.equal(floor.ratingChanges[1].delta,-1);
for(const settings of [{},{mode:'casual'},{custom:true},{practice:true}]){
 const {m,s}=rated(settings);game.archiveMatches(s);const p=s.profiles[m.players[0].id];assert.equal(p.bestWordStreak,settings.practice?0:8);assert.equal(p.history[0].bestStreak,8);const id=p.publicId;assert.equal(game.findPublicProfile(s,id).bestWordStreak,settings.practice?0:8);game.archiveMatches(s);assert.equal(p.history.length,1);
 const next=make(2,{...settings,winner:0,streaks:[{current:2,best:2},{current:0,best:0}]});s.matches.push(next);game.archiveMatches(s);assert.equal(s.profiles[m.players[0].id].bestWordStreak,settings.practice?0:8);assert.equal(s.profiles[m.players[0].id].history.length,2);
}
// Practice cannot increase an existing multiplayer record, even at the highest milestone.
const preserved=rated({practice:true});preserved.s.profiles[preserved.m.players[0].id]={name:'Player',rating:1000,wins:0,losses:0,bestWordStreak:3};game.archiveMatches(preserved.s);assert.equal(preserved.s.profiles[preserved.m.players[0].id].bestWordStreak,3);
const legacy=make(2,{winner:0});legacy.words=boost.words;const old={queue:[],matches:[legacy]};game.settleRatings(old);game.archiveMatches(old);assert.equal(legacy.ratingChanges[0].streakPercent,0);assert.equal(Object.values(old.profiles)[0].bestWordStreak,0);
const bot=make(2,{practice:true,winner:0,streaks:[{current:3,best:3},{current:5,best:5}]});bot.players[1].id='bot';const bots={queue:[],matches:[bot]};game.archiveMatches(bots);assert.equal(bots.profiles.bot,undefined);

// Exercise new endings against the actual production dictionary and the same odds.
for(const [word,prefix] of [['elegant','an'],['different','en'],['village','ag'],['create','at'],['action','ti'],['artist','is'],['nature','ur'],['careless','le'],['friendship','sh'],['childhood','ho'],['helpful','fu'],['forward','wa'],['active','iv'],['kingdom','do']]){
 const eligible=[...new Set(words)].filter(w=>w.startsWith(prefix)&&w.length>=2&&w.length<=12);assert(eligible.length>=5,prefix);
 const result=game.chooseNextPrefix(word,[word],()=>0);assert.equal(result.prefix,prefix,word);assert.equal(result.kind,'suffix');
 const exhausted=game.chooseNextPrefix(word,eligible.slice(0,-4).concat(word),()=>0);assert.notEqual(exhausted.prefix,prefix);
 assert.deepEqual(game.chooseNextPrefix(word,[word],()=>.25),{prefix:word.at(-1),kind:'letter'});
}
assert.equal(game.chooseNextPrefix('elegant',[],()=>.0799).kind,'suffix');assert.notEqual(game.chooseNextPrefix('elegant',[],()=>.08).kind,'suffix');
console.log('PASS: 2–5 player streaks, resets, retries, Roman exclusion, shared timers, preserved best, milestones, 40% cap, forfeits, unrated modes, persistence, legacy data and playable suffix odds/fallbacks.');

// Real API projection, out-of-turn protection, cookie-independent sessions and timeout.
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('drizzle/0000_majestic_leader.sql','utf8'));globalThis.__db={prepare(sql){return{bind(...args){return{async run(){const r=db.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}},async first(){return db.prepare(sql).get(...args)}}},async first(){return db.prepare(sql).get()}}}};
const avatarURL=moduleURL(fs.readFileSync('lib/avatar.ts','utf8'));
const route=withChatFilter(fs.readFileSync('app/api/arena/route.ts','utf8')).replace("from '../../../lib/avatar'",`from '${avatarURL}'`).replace("import {env} from 'cloudflare:workers';","const env={DB:globalThis.__db};").replace("from '../../../lib/game'",`from '${gameURL}'`).replace("import words from '../../../data/words.json';","const words=['apple','elephant','tiger','rabbit','tree'];");
const {POST}=await import(moduleURL(route));
const call=async(id,action,extra={})=>{const r=await POST(new Request('https://test/api/arena',{method:'POST',headers:{'Content-Type':'application/json','X-Arena-Session':id},body:JSON.stringify({action,...(action==='word'?(()=>{const match=JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data).matches.find(m=>m.winner===null&&m.players.some(p=>p.id===id));return {matchId:match?.id,turnDeadline:match?.deadline}})():{}),...extra})}));assert.equal(r.status,200);return r.json()};
const a=crypto.randomUUID(),b=crypto.randomUUID();await call(a,'queue',{name:'Streak A'});await call(b,'queue',{name:'Streak B'});
let state=JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data),live=state.matches[0];game.beginTurn(live);live.prefix='a';live.letter='a';live.streaks=[{current:2,best:2},{current:0,best:0}];live.turn=0;const actor=live.players[0].id,other=live.players[1].id;db.prepare("UPDATE arena SET data=? WHERE id='lobby'").run(JSON.stringify(state));
const denied=await call(other,'word',{word:'apple',streaks:[{current:999,best:999}]});assert(denied.message.includes('Wait'));assert.equal(denied.match.streaks[0].current,2);
const accepted=await call(actor,'word',{word:'apple',streaks:[{current:999,best:999}],bestWordStreak:999});assert.equal(accepted.match.streaks[0].current,3);const seen=await call(other,'status');assert.deepEqual(seen.match.streaks,accepted.match.streaks);assert.equal(seen.match.deadline,accepted.match.deadline);
state=JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data);live=state.matches[0];live.turn=0;live.deadline=Date.now()-1;live.turnStartsAt=0;db.prepare("UPDATE arena SET data=? WHERE id='lobby'").run(JSON.stringify(state));const timed=await call(actor,'status');assert.deepEqual(timed.match.streaks[0],{current:0,best:3});assert.equal(timed.match.hearts[0],1);
await call(other,'leave');const ended=await call(actor,'status');assert.equal(ended.profile.bestWordStreak,3);assert.equal(ended.history[0].bestStreak,3);
const publicView=await call(other,'view',{publicId:ended.profile.publicId});assert.equal(publicView.viewedProfile.bestWordStreak,3);assert(!JSON.stringify(publicView.viewedProfile).includes(actor));
console.log('PASS: API ignores forged streaks, rejects out-of-turn actions without resetting, shares authoritative counts/clocks, resets on timeout and exposes only public best/history.');
