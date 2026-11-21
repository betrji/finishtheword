import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';
const code=ts.transpileModule(fs.readFileSync('lib/game.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText,g=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function make(choice=false){const m=g.createMatch({id:'a',name:'A',seen:0},{id:'b',name:'B',seen:0});m.turn=0;m.created=0;m.turnStartsAt=0;m.deadline=5000;m.turnDuration=5000;if(choice)m.letterChoice={id:'choice',chooser:0,options:['a','e','r','s'],startsAt:0,deadline:5000};else delete m.letterChoice;g.updateConnection(m,'',0);return m}
for(const choice of [false,true]){
 const m=make(choice),actor=m.players[0].id,other=m.players[1].id;
 assert(!g.updateConnection(m,other,3999));assert.equal(m.deadline,5000);assert(g.updateConnection(m,other,4000));assert.equal(m.deadline,13000);assert.equal(m.reconnect.remaining,1000);if(choice)assert.equal(m.letterChoice.deadline,13000);
 assert(g.updateConnection(m,other,6000));assert.equal(m.deadline,13000);assert(!g.updateConnection(m,actor,7000));assert.equal(m.deadline,8000);if(choice)assert.equal(m.letterChoice.deadline,8000);assert(!m.reconnect);assert(m.connection.used[0]);assert.deepEqual(m.hearts,[2,2]);assert.equal(m.mistakes,5);
 g.updateConnection(m,other,11999);assert.equal(m.deadline,8000);assert(!m.reconnect);
}
const expired=make(),observer=expired.players[1].id;g.updateConnection(expired,observer,4000);g.updateConnection(expired,observer,12000);assert(!expired.reconnect);assert.equal(expired.deadline,13000);g.loseHeart(expired);assert.equal(expired.hearts[0],1);
const silent=make();g.updateConnection(silent,silent.players[0].id,6000);assert.equal(silent.deadline,7000);assert(!silent.reconnect);assert.equal(silent.hearts[0],2);
const tooLate=make();g.updateConnection(tooLate,tooLate.players[0].id,20000);assert.equal(tooLate.deadline,13000);assert(!tooLate.reconnect);
const normal=make();for(let t=500;t<5000;t+=500)g.updateConnection(normal,normal.players[0].id,t);assert.equal(normal.deadline,5000);assert(!normal.connection.used[0]);
const bot=make();bot.players[0].id='bot';assert(!g.updateConnection(bot,bot.players[1].id,4500));assert.equal(bot.deadline,5000);
const source=fs.readFileSync('app/page.tsx','utf8');assert(source.includes('`${d.match?.id}:${d.match?.turn}:${d.match?.turnStartsAt}:${d.match?.letterChoice?.id'));assert(!source.includes('const nextTurn=`${d.match?.id}:${d.match?.turn}:${d.match?.deadline}'));
console.log('PASS: shared bounded pause, early return/refund, expiry, once-per-player cap, letter-choice clocks, normal connected timers, bot exclusion, and stable input identity during deadline adjustments.');
