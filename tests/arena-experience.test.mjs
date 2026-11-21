import fs from 'node:fs';import Module,{createRequire} from 'node:module';import ts from 'typescript';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {gameTab,gamePath}=require('../lib/game-navigation.ts');
assert.equal(gameTab('/'),'menu');assert.equal(gameTab('/arena'),'arena');assert.equal(gameTab('/arena/'),'arena');assert.equal(gameTab('/','?view=ranks'),'ranks');assert.equal(gameTab('/','?view=unknown'),'menu');
assert.equal(gamePath('arena','https://test/?room=AB12&from=invite#chat'),'/arena?room=AB12&from=invite#chat');assert.equal(gamePath('menu','https://test/arena?room=AB12'), '/?room=AB12');assert.equal(gamePath('ranks','https://test/arena'),'/?view=ranks');
const Input=require('../app/censored-word-input.tsx').default,Badge=require('../app/admin-badge.tsx').default;
let html=renderToStaticMarkup(React.createElement(Input,{inputRef:{current:null},value:'shit',onChange(){},'aria-label':'Your word'}));assert(html.includes('value="shit"'),'Original input remains intact for validation and caret');assert(html.includes('aria-hidden="true">****</span>'));assert(html.includes('is-censored'));
html=renderToStaticMarkup(React.createElement(Input,{inputRef:{current:null},value:'shellfish',onChange(){}}));assert(!html.includes('is-censored'));assert(!html.includes('censored-word-cover'));
assert.equal(renderToStaticMarkup(React.createElement(Badge,{admin:false})), '');assert(renderToStaticMarkup(React.createElement(Badge,{admin:true})).includes('Game administrator'));
const Home=require('../app/page.tsx').default,original={useState:React.useState,useRef:React.useRef,useEffect:React.useEffect},oldWindow=globalThis.window,oldDocument=globalThis.document;
let states=[],refs=[],effects=[],i=0,j=0;React.useState=initial=>{const n=i++;if(!(n in states))states[n]=typeof initial==='function'?initial():initial;return[states[n],value=>states[n]=typeof value==='function'?value(states[n]):value]};React.useRef=initial=>refs[j++]??={current:initial};React.useEffect=(fn,deps)=>effects.push({fn,deps});
const links=[];globalThis.window={location:{href:'https://test/',pathname:'/',search:'',hash:''},history:{pushState(_,__,path){links.push(path)}}};globalThis.document={fullscreenElement:null};
const render=()=>{i=j=0;effects=[];return Home()};
try{
 render();states[0]={match:{id:'first',winner:null,turn:0,you:0,players:[{name:'Me'},{name:'Rival'}],hearts:[2,2],words:[],letter:'a',mistakes:5,deadline:Date.now()+15000},queued:false,waiting:0,now:Date.now()};
 const enter=()=>effects.find(e=>e.fn.toString().includes('enteredMatch')).fn();
 render();enter();let tree=render();assert(tree.props.className.includes('arena-expanded'));assert(links.includes('/arena'));
 // Exit is respected across polls; a rematch with a new ID opens fullscreen again.
 states[2]=false;render();enter();assert(!render().props.className.includes('arena-expanded'));
 states[0].match.id='rematch';render();enter();assert(render().props.className.includes('arena-expanded'));
 states[0].match=null;states[2]=false;render();enter();assert(!render().props.className.includes('arena-expanded'));
 // Exercise the real profile UI with independent owner, badge and permission states.
 const source=ts.createSourceFile('page.tsx',fs.readFileSync('app/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),home=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='Home'),names=[];
 const visit=n=>{if(ts.isVariableDeclaration(n)&&ts.isArrayBindingPattern(n.name)&&ts.isCallExpression(n.initializer)&&n.initializer.expression.getText(source)==='useState')names.push(n.name.elements[0]?.name?.getText(source));ts.forEachChild(n,visit)};visit(home);
 const set=(name,value)=>{const index=names.indexOf(name);assert(index>=0,name);states[index]=value};
 const profile={name:'Rival',publicId:'other-profile',admin:false,rating:1000,peakRating:1000,wins:0,losses:0};
 states[0]={match:null,queued:false,waiting:0,now:Date.now(),profile};set('customizing',true);set('analyticsOwner',true);set('adminProfileId','owner-profile');
 let markup=renderToStaticMarkup(render());assert(!markup.includes('Game administrator'),'Owner sign-in alone must not show a badge');assert(!markup.includes('>Admin</button>'),'Owner on another profile cannot see the Admin tab');assert(!markup.includes('Open admin panel'));
 Object.assign(profile,{name:'vecaid',publicId:'owner-profile',admin:true});set('analyticsOwner',false);
 markup=renderToStaticMarkup(render());assert(markup.includes('Game administrator'),'A public badge does not depend on viewer authentication');assert(!markup.includes('>Admin</button>'));
 set('analyticsOwner',true);set('adminProfileId','');markup=renderToStaticMarkup(render());assert(!markup.includes('>Admin</button>'),'A badge alone cannot grant controls');
 set('adminProfileId','owner-profile');set('profileSection','admin');markup=renderToStaticMarkup(render());assert(markup.includes('>Admin</button>'));assert(markup.includes('Open admin panel'));
 Object.assign(profile,{name:'Rival',publicId:'other-profile',admin:false});markup=renderToStaticMarkup(render());assert(!markup.includes('Open admin panel'),'Switching profiles immediately hides stale permissions');
 set('customizing',false);set('profileOpen',true);set('viewedPlayer',{name:'vecaid',publicId:'owner-profile',admin:true,rating:1000,peakRating:1000,wins:0,losses:0,history:[]});markup=renderToStaticMarkup(render());assert(markup.includes('Game administrator'),'Other players can view vecaid’s public badge');assert(!markup.includes('Open admin panel'));
 const badge=renderToStaticMarkup(React.createElement(Badge,{admin:true}));assert(badge.includes('class="sender-kind admin-badge"'));assert(!badge.includes('<svg'),'Admin uses the same simple chip as Player');
}finally{Object.assign(React,original);globalThis.window=oldWindow;globalThis.document=oldDocument;}
console.log('PASS: distinct menu/arena routes, invite parameter preservation, raw input retention with visual masking, optional Admin badges, auto-fullscreen on new match/rematch and persistent exit during polling.');
