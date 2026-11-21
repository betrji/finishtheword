import fs from 'node:fs';import Module,{createRequire} from 'node:module';import ts from 'typescript';import assert from 'node:assert/strict';import vm from 'node:vm';
const require=createRequire(import.meta.url);Module._extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText,file);
const React=require('react'),originalEffect=React.useEffect,originalRef=React.useRef;let effect,deps;
React.useEffect=(fn,dependencies)=>{effect=fn;deps=dependencies};React.useRef=value=>({current:value});
const {useDialogFocus,trapDialogKey}=require('../app/dialog-focus.ts');let focused='',handler,closed=0,prevented=0;
const control=name=>({focus(){focused=name},getClientRects(){return[{}]}}),first=control('first'),last=control('last'),previous={isConnected:true,focus(){focused='previous'}};
globalThis.document={activeElement:previous};const element={querySelectorAll(){return[first,last]},addEventListener(type,fn){assert.equal(type,'keydown');handler=fn},removeEventListener(type,fn){assert.equal(fn,handler)},focus(){focused='dialog'}},ref={current:element};
useDialogFocus(ref,()=>closed++,false);assert.equal(deps[1],false);assert.equal(effect(),undefined);assert.equal(focused,'');
useDialogFocus(ref,()=>closed++,true);assert.equal(deps[1],true);const cleanup=effect();assert.equal(focused,'first');
const key=(key,shiftKey=false)=>({key,shiftKey,preventDefault(){prevented++},stopPropagation(){}});
document.activeElement=last;handler(key('Tab'));assert.equal(focused,'first');document.activeElement=first;handler(key('Tab',true));assert.equal(focused,'last');handler(key('Escape'));assert.equal(closed,1);cleanup();assert.equal(focused,'previous');
const before=prevented;trapDialogKey(key('Tab'),[],null,()=>closed++);assert.equal(prevented,before+1);assert.equal(closed,1);
React.useEffect=originalEffect;React.useRef=originalRef;delete globalThis.document;
const layout=fs.readFileSync('app/layout.tsx','utf8'),script=layout.match(/__html:`([^`]+)`/)[1];
for(const saved of [null,'full','reduced','system','invalid']){const doc={documentElement:{dataset:{}}};vm.runInNewContext(script,{document:doc,localStorage:{getItem:key=>key==='arena-motion'?saved:'dark'}});assert.equal(doc.documentElement.dataset.motion,['full','reduced'].includes(saved)?saved:'system');assert.equal(doc.documentElement.dataset.theme,'dark');}
const doc={documentElement:{dataset:{}}};vm.runInNewContext(script,{document:doc,localStorage:{getItem(){throw Error('disabled')}}});assert.equal(doc.documentElement.dataset.motion,'system');assert.equal(doc.documentElement.dataset.theme,'light');
const page=fs.readFileSync('app/page.tsx','utf8');for(const name of ['rulesDialog','profileDialog','recoveryDialog','customizerDialog']){assert(page.includes('useDialogFocus('+name));assert(page.includes('ref={'+name+'}'));}assert(page.includes('aria-pressed={sound}'));assert(page.includes('!profileOpen&&!recoverOpen&&!window.matchMedia'));assert(fs.readFileSync('app/playful.css','utf8').includes('textarea:focus-visible'));
console.log('PASS: conditional dialog activation, focus entry/Tab wrap/Escape/restore, empty-dialog Tab handling, all four dialog bindings, saved motion across pages, blocked-storage defaults, sound state and text-area focus styling. Simulated DOM only.');
// Explicit mobile keyboard recovery stays synchronous with the player's tap.
const focusSource=page.match(/function focusWordInput\(\)\{([^]*?)\}\nfunction editWord/)[1];
const visibilitySource=page.match(/function keepWordInputVisible\(\)\{([^]*?)\}\nfunction focusWordInput/)[1];
for(const allowed of [false,true])for(const compact of [false,true]){const calls=[],doc={activeElement:null,documentElement:{dataset:{compactViewport:String(compact)}}},board={scrollIntoView(){calls.push('board')}},field={blur(){calls.push('blur')},focus(){calls.push('focus');doc.activeElement=field},closest(){return board},scrollIntoView(){calls.push('field')}};vm.runInNewContext(`function keepWordInputVisible(){${visibilitySource}};(function(){${focusSource}})()`,{myTurn:allowed,input:{current:field},document:doc});assert.deepEqual(calls,allowed?['focus',compact?'board':'field']:[]);doc.activeElement={};vm.runInNewContext(`(function(){${visibilitySource}})()`,{input:{current:field},document:doc});assert.deepEqual(calls,allowed?['focus',compact?'board':'field']:[],'Viewport resize must respect focus outside the word field');}
assert(page.includes('readOnly={!myTurn}'));assert(!page.includes('readOnly={!myTurn||busy}'));
assert(page.includes("if(window.matchMedia('(pointer: coarse)').matches)return;try{await document.documentElement.requestFullscreen"));
console.log('PASS: synchronous keyboard recovery only on own turn, no read-only toggle while sending, and touch fullscreen uses the expanded layout. Device keyboard behavior needs iPhone verification.');

assert(!page.includes('onTouchEnd='),'Native touch caret and single-tap focus must not be canceled');assert(page.includes('onCompositionStart='));assert(page.includes('composing.current||!word.trim()'));assert(page.includes('focused!==document.body'),'Do not steal focus from chat or other controls');
