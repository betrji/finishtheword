import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
const require=createRequire(import.meta.url);
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {MenuPlayButton}=require('../app/menu-controls.tsx'),{cleanName}=require('../lib/game.ts');
let clicked=0;
const props={mode:'casual',nameValid:true,busy:false,ready:true,onPlay(){clicked++}};
for(const name of ['', '   ', 'Adhi']){
 const valid=!!cleanName(name),button=MenuPlayButton({...props,nameValid:valid});
 assert.equal(button.props['aria-label'],valid?'Play now':'Enter a name to play');
 assert.equal(button.props.disabled,false,'Empty names keep the existing focus-and-hint CTA');
 button.props.onClick();
}
assert.equal(clicked,3);
assert.equal(MenuPlayButton({...props,mode:'ranked'}).props['aria-label'],'Play ranked');
for(const state of [{busy:true},{ready:false},{busy:true,ready:false}]){
 const button=MenuPlayButton({...props,...state});assert(button.props.disabled);assert.equal(button.props['aria-busy'],!!state.busy);
}
const html=renderToStaticMarkup(React.createElement(MenuPlayButton,props));
assert(html.includes('menu-play-key'));assert(html.includes('menu-play-arrow'));assert(html.includes('Find a live match'));assert.equal((html.match(/<button /g)||[]).length,1);
const Demo=require('../app/word-chain-demo.tsx').default,original=React.useState;let current=0,opened=0;
React.useState=()=>[current,value=>current=typeof value==='function'?value(current):value];
const nodes=node=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(nodes),...React.Children.toArray(node.props?.setup).flatMap(nodes)];
const text=node=>typeof node==='string'?node:React.Children.toArray(node?.props?.children).map(text).join('');
try{
 for(const [before,after] of [['APPLE','ECHO'],['ECHO','ORBIT'],['ORBIT','TIGER'],['TIGER','RIVER']]){
  const tree=Demo({onPractice(){opened++}}),all=nodes(tree),status=all.find(n=>n.props?.role==='status');
  assert(text(status).includes(before));assert(text(status).includes(after));assert.equal(before.at(-1),after[0]);assert.notEqual(before,after);
  assert.equal(all.filter(n=>n.props?.className==='chain-preview-scene').length,1);
  all.find(n=>n.props?.['aria-label']==='Show the next example word chain').props.onClick();
 }
 assert.equal(current,0);nodes(Demo({onPractice(){opened++}})).find(n=>n.props?.className==='chain-preview-practice').props.onClick();assert.equal(opened,1);
}finally{React.useState=original}
// Guard the mobile overflow fix: single-column scene and fractional tile tracks.
const css=fs.readFileSync('app/onboarding.css','utf8');
assert(css.includes('.chain-preview-scene{display:grid;grid-template-columns:minmax(0,1fr)'));
assert(css.includes('grid-template-columns:repeat(var(--tile-count),minmax(0,1fr))'));
assert(!css.includes('.chain-preview-board{padding:20px;display:grid;grid-template-columns:1fr 1fr'));
assert(css.includes('width:min(100%,calc(var(--tile-count) * 46px'));
for(const viewport of [320,360,375,393,430,480])for(const length of [4,5]){
 const available=viewport-32-42-68,gap=6,tile=(Math.min(available,length*46+(length-1)*gap)-(length-1)*gap)/length;
 assert(tile>=30&&tile<=46,`${viewport}px: readable tiles fit the padded reply row`);
 assert(tile*length+(length-1)*gap<=available);
}
assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('html[data-motion=reduced]'));assert(css.includes('.menu-play,.quick-alternatives)::after'));
console.log('PASS: name CTA, ranked/casual labels, disabled joining/connection states, one Play button, example progression and tutorial entry, reduced-motion guards, and calculated 320–480px tile bounds. No browser layout assertions.');

// Exercise the actual menu handlers through Friends/Practice and back. These are
// navigation actions, not pressed toggles with a label that changes underneath.
const {MenuSetupHeader,MenuAlternatives}=require('../app/menu-controls.tsx');
const Home=require('../app/page.tsx').default,Navigation=require('../app/tile-navigation.tsx').default;
const hooks={useState:React.useState,useRef:React.useRef,useEffect:React.useEffect};
const previousDocument=globalThis.document,previousFrame=globalThis.requestAnimationFrame;
let states=[],refs=[],cursor=0,refCursor=0,focused='',home;
React.useState=initial=>{const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],next=>states[i]=typeof next==='function'?next(states[i]):next]};
React.useRef=initial=>refs[refCursor++]??={current:initial};React.useEffect=()=>{};
globalThis.requestAnimationFrame=fn=>{fn();return 1};globalThis.document={getElementById:id=>({focus(){focused=id}})};
const renderHome=()=>{cursor=refCursor=0;home=Home();return nodes(home)};
const findHome=predicate=>nodes(home).find(predicate);
try{
 renderHome();findHome(n=>n.props?.id==='name').props.onChange({target:{value:'Adhi'}});renderHome();
 findHome(n=>n.type==='button'&&text(n).includes('Ranked')).props.onClick();
 findHome(n=>n.props?.id==='player-count').props.onChange({target:{value:'5'}});renderHome();
 for(const section of ['friends','practice','friends']){
  const alternatives=findHome(n=>n.type===MenuAlternatives);assert(alternatives);
  const choices=nodes(MenuAlternatives(alternatives.props)).filter(n=>n.type==='button');
  assert(choices.every(n=>n.props['aria-pressed']===undefined));
  choices.find(n=>n.props.id===`menu-${section}`).props.onClick();renderHome();
  assert.equal(focused,'setup-section-title');assert.equal(findHome(n=>n.type===MenuSetupHeader).props.section,section);
  assert(!findHome(n=>n.type===MenuAlternatives));assert(!findHome(n=>n.props?.className==='quick-settings'));
  assert.equal(findHome(n=>n.props?.id==='name').props.value,'Adhi');
  if(section==='friends'){
   assert.equal(findHome(n=>n.props?.id==='room-player-count').props.value,5);
   assert(findHome(n=>n.props?.['aria-labelledby']==='create-room-title'));
   assert(findHome(n=>n.props?.['aria-labelledby']==='join-room-title'));
   findHome(n=>n.props?.id==='room-code').props.onChange({target:{value:' a-b12!z'}});renderHome();
   assert.equal(findHome(n=>n.props?.id==='room-code').props.value,'AB12');
   assert(findHome(n=>n.type==='button'&&text(n)==='Join room').props.disabled,'Joining stays disabled before connection/profile readiness');
  }
  findHome(n=>n.type===MenuSetupHeader).props.onBack();renderHome();
  assert.equal(focused,`menu-${section}`);assert(!findHome(n=>n.type===MenuSetupHeader));
  assert.equal(findHome(n=>n.type===MenuPlayButton).props.mode,'ranked');
  assert.equal(findHome(n=>n.props?.id==='player-count').props.value,5);
 }
 findHome(n=>n.type===MenuAlternatives).props.onSelect('friends');renderHome();
 findHome(n=>n.type===Navigation).props.onNavigate('menu');renderHome();
 assert(findHome(n=>n.type===MenuPlayButton));assert(!findHome(n=>n.type===MenuSetupHeader),'Main menu resets temporary setup selection');
 assert.equal(findHome(n=>n.props?.id==='name').props.value,'Adhi');
 for(const component of [MenuAlternatives,MenuSetupHeader]){
  const tree=component({section:'friends',busy:true,onSelect(){},onBack(){}});
  assert(nodes(tree).filter(n=>n.type==='button').every(n=>n.props.disabled));
 }
 console.log('PASS: actual Friends/Practice/back navigation, no false pressed states, name/ranked/player-count preservation, room-code normalization, connection/busy gates, focus return, and main-menu reset. Simulated interactions.');
}finally{Object.assign(React,hooks);if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;if(previousFrame===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=previousFrame;}
