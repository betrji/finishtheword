import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
const require=createRequire(import.meta.url);
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {palettes,paletteNames,sanitizeAvatar,earnedAvatar,rankRewards,defaultAvatar}=require('../lib/avatar.ts');
const Character=require('../app/character-token.tsx').default,Look=require('../app/profile-look.tsx').default;
const accessories=['none','glasses','crown','cap',...rankRewards.map(r=>r.accessory)];
// Every stored avatar combination still resolves and draws; no asset requests or IDs.
for(const color of Object.keys(palettes))for(const shape of ['cat','bear','bunny'])for(const accessory of accessories){
 const avatar={color,shape,accessory};assert.deepEqual(sanitizeAvatar(avatar),avatar);
 assert.deepEqual(earnedAvatar(avatar,3000),avatar);
 const html=renderToStaticMarkup(React.createElement(Character,{avatar}));
 assert(html.includes('character-drawing'));assert(html.includes('aria-hidden="true"'));
 assert(!html.includes('undefined'));assert(!html.includes('linearGradient'));assert(!html.includes('<img'));assert(!html.includes('id="'));
 assert.equal(html.includes('reward-stamp'),rankRewards.some(r=>r.accessory===accessory));
}
for(const reward of rankRewards){
 const avatar={...defaultAvatar,accessory:reward.accessory};
 assert.deepEqual(earnedAvatar(avatar,reward.min),avatar);
 if(reward.min>0)assert.equal(earnedAvatar(avatar,reward.min-1).accessory,'none');
}
const nodes=node=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(nodes)];
const avatar={color:'mint',shape:'bear',accessory:'wings'},changes=[];let rewardsOpened=0;
const tree=Look({avatar,name:'Adhi',onChange:value=>changes.push(value),onRewards:()=>rewardsOpened++});
const buttons=nodes(tree).filter(n=>n.type==='button');assert.equal(buttons.length,14);
const swatches=buttons.slice(0,6),shapes=buttons.slice(6,9),options=buttons.slice(9,13);
assert.equal(swatches.filter(b=>b.props['aria-pressed']).length,1);
assert.equal(shapes.filter(b=>b.props['aria-pressed']).length,1);
assert(options.every(b=>!b.props['aria-pressed']),'An earned cosmetic must not falsely select a basic accessory');
swatches.forEach((b,i)=>{assert.equal(b.props['aria-label'],Object.values(paletteNames)[i]);b.props.onClick();assert.equal(changes.at(-1).accessory,'wings');assert.equal(changes.at(-1).shape,'bear')});
shapes.forEach(b=>{b.props.onClick();assert.equal(changes.at(-1).accessory,'wings');assert.equal(changes.at(-1).color,'mint')});
options.forEach((b,i)=>{b.props.onClick();assert.equal(changes.at(-1).accessory,['none','glasses','crown','cap'][i])});
buttons.at(-1).props.onClick();assert.equal(rewardsOpened,1);
const html=renderToStaticMarkup(tree);assert(html.includes('Adhi'));assert(html.includes('Storm seal'));assert(html.includes('<legend>Game piece</legend>'));
assert(renderToStaticMarkup(React.createElement(Look,{avatar,name:'   ',onChange(){},onRewards(){}})).includes('Your game piece'));
// Printed marks remain readable on the tile and on their chosen ink wash.
const lum=h=>h.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{const [lo,hi]=[lum(a),lum(b)].sort((a,b)=>a-b);return(hi+.05)/(lo+.05)};
for(const [name,[color,ink,wash]] of Object.entries(palettes)){assert(ratio(ink,wash)>=4.5,name);assert(ratio(ink,'#fff8e8')>=4.5,name);assert(ratio(color,'#fff8e8')>=3,name+' selection check');}
const page=fs.readFileSync('app/page.tsx','utf8');assert(page.includes("profileSection==='account'&&<><div className=\"motion-control\""));
assert(page.includes("if(await call('profile'))setCustomizing(false)"));assert(page.includes('showAnalytics'));assert(!page.includes('cosmetic-piece-'));
console.log('PASS: all 216 saved avatar combinations, reward thresholds, color/shape/accessory callbacks, earned-accessory preservation, readable ink contrast, and unchanged profile save/owner controls. No browser layout assertions.');
