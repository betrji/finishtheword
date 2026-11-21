import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
const require=createRequire(import.meta.url);
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),Nav=require('../app/tile-navigation.tsx').default;
const destinations=['menu','arena','community','guide','ranks','history'];
for(const compact of [false,true])for(const current of destinations){
 const visited=[],closed=[],tree=Nav({current,compact,requests:12,onNavigate:id=>visited.push(id)}),buttons=React.Children.toArray(tree.props.children);
 assert.equal(buttons.length,6);assert.equal(buttons.filter(b=>b.props['aria-current']==='page').length,1);assert.equal(buttons[destinations.indexOf(current)].props['aria-current'],'page');
 for(const button of buttons){assert(button.props['aria-label']);button.props.onClick({currentTarget:{closest:selector=>{assert.equal(selector,'details');return{removeAttribute:attribute=>closed.push(attribute)}}}})}
 assert.deepEqual(visited,destinations);assert.equal(closed.length,compact?6:0);
 const html=renderToStaticMarkup(tree);assert(html.includes('Community, 12 friend requests'));assert(html.includes('9+'));assert.equal((html.match(/class="game-tile nav-letter"/g)||[]).length,6);assert.equal((html.match(/class="tile-nav-art" aria-hidden="true"/g)||[]).length,6);
}
const html=renderToStaticMarkup(React.createElement(Nav,{current:'menu',onNavigate(){}}));assert(!html.includes('tile-nav-count'));assert(html.includes('How to play'));assert(html.includes('Main menu'));
const page=fs.readFileSync('app/page.tsx','utf8');assert.equal((page.match(/if\(value==='menu'\)void openMainMenu\(\);else setTab\(value\)/g)||[]).length,2);assert.equal((page.match(/current=\{tab\}/g)||[]).length,2);assert(page.includes('className="mobile-rewards"'));assert(page.includes('Exit fullscreen'));
console.log('PASS: all six destinations and selected states, readable labels, decorative tiles hidden from AT, friend-request badges, compact menu closure, existing Main menu handler, and correct idle-menu selection. No browser layout assertions.');
