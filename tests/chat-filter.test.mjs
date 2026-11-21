import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const code=ts.transpileModule(fs.readFileSync('lib/chat-filter.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;
const {censorChat}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
for(const text of ['fuck','SHIT','asshole','bitches','motherfucking','nigger','niggas','faggot','kike','wetback','retarded','tranny','f u c k','s.h.i.t','f_u_c_k','n i g g e r','fuuuck','shiiit','f4gg0t','sh1t','b!tch','a$$hole','ＦＵＣＫ','fück','f\u200buck','fu\u2060ck','fυck'.replace('υ','u'),'fuсk']){
 assert.match(censorChat(text),/^\*+$/,text);
 assert.equal(censorChat(censorChat(text)),censorChat(text),'idempotent: '+text);
}
for(const text of ['Good game!','class assistant assignment','Scunthorpe and Dickens','cocktail and peacock','Pakistan and Japanese','grape and scrape','Hello, shellfish!','gay lesbian queer trans','I like this game','مرحبا 世界 😀','pass the ball','classic chess match','****',''])assert.equal(censorChat(text),text);
assert.equal(censorChat('You said shit! Good game.'),'You said ****! Good game.');
assert.equal(censorChat('fuck, shit, asshole.'),'****, ****, *******.');
assert.equal(censorChat('😀 fuck 😀'),'😀 **** 😀');
const started=performance.now();for(let i=0;i<100;i++)censorChat('s'.repeat(280));assert(performance.now()-started<2000,'bounded repeated-letter input');
console.log('PASS: common profanity/slurs, case, spacing, punctuation, leetspeak, repeated letters, Unicode disguises, emoji, harmless substrings, neutral identity terms and idempotent masking.');
