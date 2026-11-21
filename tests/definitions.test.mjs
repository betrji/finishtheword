import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
const require=createRequire(import.meta.url);
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
const {lookupTarget,numeralValue,definitionText,parseDefinitions,getDefinition}=require('../lib/definitions.ts');
const {GET}=require('../app/api/definitions/route.ts');
const words=require('../data/words.json'),bits=require('../data/word-languages.json'),forms=require('../data/word-spellings.json');
const {normalize,roman}=require('../lib/game.ts');
let supported=0;
for(let i=0;i<words.length;i++){
 const word=words[i];if(word.length>60)continue;
 const target=lookupTarget(word);assert(target,word);supported++;
 assert.equal(target.languages.length,[1,2,4].filter(bit=>Number(bits[i])&bit).length);
 assert.equal(numeralValue(word)!==undefined,roman(word));
}
for(const language of ['es','de'])for(const [word,spellings] of Object.entries(forms[language]))for(const spelling of spellings){assert.equal(normalize(spelling),word);assert.equal(lookupTarget(word,language,spelling).headword,spelling);}
assert.equal(lookupTarget('arbol','es').headword,'árbol');
assert.equal(lookupTarget('haus','de').headword,'Haus');
assert(lookupTarget('ano','es').spellings.includes('año'));
assert.equal(lookupTarget('straße','de').word,'strasse');
for(const word of ['', ' ', '<script>', '../apple', 'a'.repeat(61), 'notawordzzz'])assert.equal(lookupTarget(word),null);
assert.equal(lookupTarget('apple','fr'),null);assert.equal(lookupTarget('apple','en','https://example.org'),null);
assert.equal(numeralValue('iv'),4);assert.equal(numeralValue('mix'),1009);assert.equal(numeralValue('mmmdccclxxxviii'),3888);assert.equal(numeralValue('i'),undefined);assert.equal(numeralValue('iiii'),undefined);
assert.equal(definitionText('<style>bad</style><script>evil()</script>A <b>test</b> &amp; &#xE9; &#233; &#99999999;'),'A test & é é');
const fixture={en:[{partOfSpeech:'Noun',definitions:[{definition:'A <b>test</b> meaning.'},{definition:''},{definition:'A second meaning.'},{definition:'A third meaning.'},{definition:'Extra meaning.'}]}],es:[{partOfSpeech:'Noun',definitions:[{definition:'Spanish-only meaning.'}]}]};
assert.equal(parseDefinitions(fixture,'en').length,3);assert.equal(parseDefinitions(fixture,'es')[0].meaning,'Spanish-only meaning.');assert.deepEqual(parseDefinitions({en:'broken'},'en'),[]);
const originalFetch=globalThis.fetch;let calls=[];
globalThis.fetch=async(url,options)=>{assert.equal(options.redirect,'manual','Cloudflare Workers reject redirect:error before making a request');calls.push({url,options});return Response.json(fixture)};
try{
 const [a,b]=await Promise.all([getDefinition(lookupTarget('apple')),getDefinition(lookupTarget('apple'))]);
 assert.equal(calls.length,1);assert.deepEqual(a,b);assert.equal(a.status,'found');assert(a.sourceUrl.endsWith('apple#English'));
 await getDefinition(lookupTarget('apple'));assert.equal(calls.length,1,'Cached definitions do not refetch');
 assert(calls[0].options.headers['User-Agent'].includes('finishtheword.com'));assert(!('Cookie' in calls[0].options.headers));assert.equal(calls[0].options.redirect,'manual');
 let response=await GET(new Request('https://test/api/definitions?word=arbol&language=es'));
 let body=await response.json();assert.equal(body.headword,'árbol');assert.equal(body.language,'es');assert.equal(body.senses[0].meaning,'Spanish-only meaning.');assert(calls.at(-1).url.endsWith('%C3%A1rbol'));assert(response.headers.get('Cache-Control').includes('public'));
 response=await GET(new Request('https://test/api/definitions?word=apple&spelling=bad'));assert.equal(response.status,400);
 const count=calls.length;const numeral=await getDefinition(lookupTarget('mmmdccclxxxviii'));assert.equal(numeral.status,'roman');assert.equal(calls.length,count,'Roman numeral does not need an external service');
 globalThis.fetch=async()=>new Response(null,{status:404});assert.equal((await getDefinition(lookupTarget('tiger'))).status,'missing');
 globalThis.fetch=async()=>{throw Error('Timeout')};response=await GET(new Request('https://test/api/definitions?word=river'));body=await response.json();assert.equal(body.status,'unavailable');assert.equal(response.headers.get('Cache-Control'),'no-store');assert(body.sourceUrl.includes('river'));
 globalThis.fetch=async()=>new Response(null,{status:403});assert.equal((await getDefinition(lookupTarget('forest'))).status,'unavailable');
 const fallback=[{meanings:[{partOfSpeech:'noun',definitions:[{definition:'A device used to measure amounts of time.'}]}]}];
 let fallbackCalls=[];
 globalThis.fetch=async url=>{fallbackCalls.push(url);return url.includes('wiktionary.org')?new Response(null,{status:403}):Response.json(fallback)};
 const timer=await getDefinition(lookupTarget('timer'));assert.equal(timer.status,'found');assert.equal(timer.license,'3.0');assert(timer.senses[0].meaning.includes('measure'));assert.equal(fallbackCalls.length,2);
 // Previously failed words must immediately retry rather than reuse a failure.
 assert.equal((await getDefinition(lookupTarget('river'))).status,'found');
 globalThis.fetch=async()=>new Response(null,{status:429,headers:{'Retry-After':'60'}});assert.equal((await getDefinition(lookupTarget('echo'))).status,'unavailable');
 globalThis.fetch=async url=>{assert(!url.includes('wiktionary.org'),'Only the failing provider backs off');return Response.json(fallback)};assert.equal((await getDefinition(lookupTarget('orange'))).status,'found');
}finally{globalThis.fetch=originalFetch;}
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),WordMeaning=require('../app/word-meaning.tsx').default;
const html=renderToStaticMarkup(React.createElement(WordMeaning,{word:'apple',live:true}));
assert(html.includes('<details'));assert(html.includes('Definition of apple'));assert(html.includes('aria-hidden="true"'));assert(!html.includes('Looking up'),'Nothing fetches or announces until expanded');
assert(!html.includes('role="dialog"'));assert(!html.includes('autoFocus'));
// Client imports must never ship the half-million-word server index or call game actions.
for(const file of ['app/word-meaning.tsx','app/word-definition.tsx']){const code=fs.readFileSync(file,'utf8');assert(!code.includes('data/'));assert(!code.includes('/api/arena'));assert(!code.includes('trackEvent'));assert(!code.includes('dangerouslySetInnerHTML'));}
console.log(`PASS: lookup targets for all ${supported} playable-length dictionary entries, original spelling variants, language filtering, Roman numerals, plain-text parsing, source links, cache/coalescing, 404/403/timeout/backoff, and closed accessible disclosures.`);
