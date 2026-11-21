import fs from 'node:fs';import Module,{createRequire} from 'node:module';import ts from 'typescript';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
const require=createRequire(import.meta.url);for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
const game=require('../lib/game.ts'),{submitFeedback}=require('../lib/feedback.ts'),now=Date.now(),ids=Array.from({length:3},()=>crypto.randomUUID()),[a,b,c]=ids;
const profiles=Object.fromEntries(ids.map((id,i)=>[id,{name:'Player '+i,publicId:'public-'+i,rating:1000,wins:0,losses:0,friends:[],friendRequests:[]}]));profiles[a].friends=['public-1'];profiles[b].friends=['public-0'];profiles[a].friendRequests=['public-1'];profiles[b].friendRequests=['public-0'];
const messages=ids.map((id,i)=>({id:crypto.randomUUID(),at:now,publicId:profiles[id].publicId,name:profiles[id].name,agent:false,text:'hello '+i}));
const state={queue:[],matches:[],profiles,boards:{lobby:messages,'room:AB12:1':messages},rooms:[{code:'AB12',created:1,hostId:a,capacity:2,players:[{id:a},{id:b}]}]};
const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE arena(id TEXT PRIMARY KEY,data TEXT,revision INTEGER)');db.prepare("INSERT INTO arena VALUES('lobby',?,0)").run(JSON.stringify(state));
const binding = {
 prepare(sql) {
  return {
   async first() { return db.prepare(sql).get(); },
   bind(...args) {
    return {
     async first() { return db.prepare(sql).get(...args); },
     async run() { return {meta: {changes: Number(db.prepare(sql).run(...args).changes)}}; }
    };
   }
  };
 }
};

const orig=Module._load;Module._load=function(id,...args){if(id==='cloudflare:workers')return{env:{DB:binding}};return orig.call(this,id,...args)};
const social=require('../app/api/social/route.ts').POST,chat=require('../app/api/community/route.ts').POST;Module._load=orig;
const post=(fn,id,body,origin='https://test')=>fn(new Request('https://test/api',{method:'POST',headers:{'Content-Type':'application/json','X-Arena-Session':id,origin},body:JSON.stringify(body)}));
const action=(id,action,targetId='public-1')=>post(social,id,{action,targetId});
assert.equal((await action('','block')).status,401);assert.equal((await action(a,'block','public-0')).status,400);
let result=await (await action(a,'block')).json();assert.equal(result.blocked[0].publicId,'public-1');assert.equal(result.friends.length,0);assert.equal(result.incoming.length,0);assert.equal((await action(a,'block')).status,200);
let stored=JSON.parse(db.prepare("SELECT data FROM arena").get().data);assert.deepEqual(stored.profiles[a].blocked,['public-1']);assert.deepEqual(stored.profiles[b].friends,[]);assert.deepEqual(stored.profiles[b].friendRequests,[]);assert(!JSON.stringify(game.publicProfile(stored.profiles[a])).includes('blocked'));
for(const [id,target] of [[a,'public-1'],[b,'public-0']]){const r=await (await action(id,'request',target)).json();assert(r.error.includes('unavailable'));}
const bData=await (await action(b,'read')).json();assert.deepEqual(bData.blocked,[]);
for(const channel of ['lobby','room:AB12:1'])for(const [id,hidden] of [[a,'public-1'],[b,'public-0']]){const r=await (await post(chat,id,{action:'read',channel})).json();assert(!r.messages.some(m=>m.publicId===hidden));assert(r.messages.some(m=>m.publicId==='public-2'));}
assert.equal((await post(chat,c,{action:'read',channel:'room:AB12:1'})).status,403);assert.equal((await post(chat,a,{action:'send',text:'x'},'https://evil')).status,403);
const sent=await (await post(chat,b,{action:'send',text:'Another greeting',clientId:crypto.randomUUID()})).json();assert(!sent.messages.some(m=>m.publicId==='public-0'));
assert.equal((await action(a,'unblock')).status,200);const visible=await (await post(chat,a,{action:'read'})).json();assert(visible.messages.some(m=>m.publicId==='public-1'));stored=JSON.parse(db.prepare("SELECT data FROM arena").get().data);assert.deepEqual(stored.profiles[a].friends,[]);
const report={id:crypto.randomUUID(),kind:'player',targetId:'public-1',reason:'harassment',details:'This player repeatedly harassed me.',chat:'NEVER ATTACH',draft:'NEVER ATTACH'};
assert(submitFeedback(stored,a,{...report,targetId:'missing'},now));assert(submitFeedback(stored,a,{...report,targetId:'public-0'},now));assert(submitFeedback(stored,a,{...report,reason:'invalid'},now));assert.equal(submitFeedback(stored,a,report,now),'');assert.equal(submitFeedback(stored,a,report,now),'');assert.equal(stored.feedback.length,1);assert.equal(stored.feedback[0].targetId,'public-1');assert(!JSON.stringify(stored.feedback).includes('NEVER ATTACH'));assert(submitFeedback(stored,a,{...report,id:crypto.randomUUID()},now).includes('wait'));
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),Safety=require('../app/player-safety.tsx').default;
const html=renderToStaticMarkup(React.createElement(Safety,{sessionId:a,targetId:'public-1',blocked:false,busy:false,onBlock:async()=>{}}));assert(html.includes('Block chat &amp; friend requests'));assert(html.includes('Report player'));assert(html.includes('Chat history is not attached'));assert(html.includes('What happened?'));
console.log('PASS: authenticated block/unblock without recovery keys, mutual chat filtering, friendship/request cleanup, private lists, unchanged private-room access, player report validation/rate limits/idempotency, no automatic chat capture, and accessible report controls.');
