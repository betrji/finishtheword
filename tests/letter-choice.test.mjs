import {withChatFilter} from './route-fixtures.mjs';
import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
const gameCode=ts.transpileModule(fs.readFileSync('lib/game.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;
const game=await import('data:text/javascript;base64,'+Buffer.from(gameCode).toString('base64'));
assert.equal(game.normalize('árbol'),'arbol');assert.equal(game.normalize('Straße'),'strasse');for(const s of ['xiv','mmxxvi','ix'])assert(game.roman(s));for(const s of ['','iiii','vx','hello'])assert(!game.roman(s));
const m=game.createMatch({id:'a',name:'A',seen:0},{id:'b',name:'B',seen:0});game.beginTurn(m);m.letter='a';m.prefix='a';const turn=m.turn;assert.equal(game.play(m,'apple',true),'');assert.equal(m.turn,1-turn);assert.equal(m.letter,'e');assert(game.play(m,'apple',true));assert.equal(m.words.length,1);m.hearts[m.turn]=1;game.loseHeart(m);assert.equal(m.winner,turn);
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('drizzle/0000_majestic_leader.sql','utf8'));globalThis.__db={prepare(sql){return{bind(...args){return{async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}},async first(){return db.prepare(sql).get(...args)}}},async first(){return db.prepare(sql).get()}}}};
const avatarCode=ts.transpileModule(fs.readFileSync('lib/avatar.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;
const avatarModule=await import('data:text/javascript;base64,'+Buffer.from(avatarCode).toString('base64'));
let route=withChatFilter(fs.readFileSync('app/api/arena/route.ts','utf8')).replace("from '../../../lib/avatar'","from 'data:text/javascript;base64,"+Buffer.from(avatarCode).toString('base64')+"'").replace("import {env} from 'cloudflare:workers';","const env={DB:globalThis.__db};").replace("from '../../../lib/game'","from 'data:text/javascript;base64,"+Buffer.from(gameCode).toString('base64')+"'").replace("import words from '../../../data/words.json';","const words="+fs.readFileSync('data/words.json','utf8')+";");
route=ts.transpileModule(route,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(route).toString('base64'));

const words=JSON.parse(fs.readFileSync('data/words.json','utf8'));
game.configurePrefixes(words);
const make=(n=2,practice=false,mode='ranked')=>game.createGroupMatch(Array.from({length:n},(_,i)=>({id:'p'+i,name:'P'+i,seen:0,rating:1000+i*400,mode})),practice,mode);
for(const n of [2,3,4,5]){
 const match=make(n),choice=match.letterChoice;assert(choice);assert.equal(new Set(choice.options).size,4);
 for(const letter of choice.options)assert(words.filter(w=>w.startsWith(letter)&&w.length>=2&&w.length<=12).length>=5);
 assert.equal(choice.deadline-choice.startsAt,8000);
 const hearts=[...match.hearts],attempts=match.mistakes;
 assert(game.play(match,'apple',true).includes('Choose'));game.loseHeart(match);assert.deepEqual(match.hearts,hearts);
 assert(game.chooseLetter(match,(choice.chooser+1)%n,choice.id,choice.options[0]));
 assert(game.chooseLetter(match,choice.chooser,'stale',choice.options[0]));
 assert(game.chooseLetter(match,choice.chooser,choice.id,'!'));
 assert.equal(match.mistakes,attempts);
 assert.equal(game.chooseLetter(match,choice.chooser,choice.id,choice.options[0]),'');
 assert(!match.letterChoice);assert.equal(match.prefix,choice.options[0]);assert.equal(match.prefixKind,'letter');
 assert.equal(match.deadline-match.turnStartsAt,15000);
 const turn=match.turn;game.loseHeart(match);assert.equal(match.hearts[turn],1);assert(match.letterChoice);assert(match.letterChoice.startsAt>Date.now());
 const restarted=match.letterChoice;assert(game.chooseLetter(match,restarted.chooser,restarted.id,restarted.options[0]).includes('Wait'));
 game.advanceLetterChoice(match,restarted.deadline+1);assert(!match.letterChoice);assert.equal(match.deadline-match.turnStartsAt,game.durationForTurns(1,n));assert.equal(match.completedTurns,1);
}
const ranked=make(3),weights=game.chooserWeights(ranked);assert.deepEqual(weights.map(w=>w.weight).sort(),[1,2,3]);
for(const mode of ['casual'])assert(game.chooserWeights(make(5,false,mode)).every(w=>w.weight===1));
assert(game.chooserWeights(make(3,true)).every(w=>w.weight===1));
const custom=make(4);custom.custom=true;assert(game.chooserWeights(custom).every(w=>w.weight===1));
const equal=make(4);equal.players.forEach(p=>p.rating=1000);assert(game.chooserWeights(equal).every(w=>w.weight===1));
const eliminated=make(3),old=eliminated.letterChoice;game.forfeitPlayer(eliminated,old.chooser);assert.equal(eliminated.hearts[old.chooser],0);assert(eliminated.letterChoice);assert.notEqual(eliminated.letterChoice.chooser,old.chooser);assert.notEqual(eliminated.letterChoice.id,old.id);
game.forfeitPlayer(eliminated,eliminated.letterChoice.chooser);assert.notEqual(eliminated.winner,null);assert(!eliminated.letterChoice);
const bot=game.createMatch({id:'human',name:'Human',seen:0},{id:'bot',name:'Bot',seen:0},true);bot.letterChoice.chooser=bot.players.findIndex(p=>p.id==='bot');game.advanceLetterChoice(bot,bot.letterChoice.startsAt+1000);assert(!bot.letterChoice);
for(const [word,prefix] of [['quickly','ly'],['running','in']]){
 const result=game.chooseNextPrefix(word,[],()=>0);assert.equal(result.kind,'suffix');assert.equal(result.prefix,prefix);
 const exhausted=words.filter(w=>w.startsWith(prefix));assert.equal(game.chooseNextPrefix(word,exhausted,()=>0).prefix,word.slice(-1));
}
assert.equal(game.chooseNextPrefix('cat',[],()=>.1).kind,'bonus');
assert.deepEqual(game.chooseNextPrefix('running',[],()=>.9),{prefix:'g',kind:'letter'});
const req=(id,action,extra={})=>POST(new Request('https://test/api/arena',{method:'POST',headers:{'Content-Type':'application/json','X-Arena-Session':id},body:JSON.stringify({action,name:'Choice '+id.slice(0,8),...extra})}));
const ids=[crypto.randomUUID(),crypto.randomUUID()];await req(ids[0],'queue');const paired=await (await req(ids[1],'queue')).json();assert(paired.match.letterChoice);
const rawState=JSON.parse(db.prepare("SELECT data FROM arena WHERE id='lobby'").get().data),live=rawState.matches.at(-1),choice=live.letterChoice,chooser=live.players[choice.chooser].id,other=ids.find(id=>id!==chooser);
const payload={matchId:live.id,choiceId:choice.id,letter:choice.options[0]};
const denied=await (await req(other,'choose_letter',payload)).json();assert(denied.message.includes('chosen'));assert(denied.match.letterChoice);
const wrong=await (await req(chooser,'choose_letter',{...payload,letter:'!'})).json();assert(wrong.message.includes('four'));
const selected=await (await req(chooser,'choose_letter',payload)).json();assert.equal(selected.message,'');assert(!selected.match.letterChoice);assert.equal(selected.match.prefix,payload.letter);
const duplicate=await (await req(chooser,'choose_letter',payload)).json();assert(duplicate.message.includes('ended'));assert.equal(duplicate.match.deadline,selected.match.deadline);
const observed=await (await req(other,'status')).json();assert.equal(observed.match.prefix,payload.letter);assert.equal(observed.match.deadline,selected.match.deadline);
assert(!JSON.stringify(observed.match).includes(chooser));
console.log('PASS: four valid distinct letters, 2–5 players, chooser-only authorization, stale/invalid/repeated choices, shared clocks, life-loss reselection, elimination, weighted Ranked odds, equal unrated odds, bot and deadline auto-pick, playable LY/IN suffix prompts and exhaustion fallback.');
