import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const layout=fs.readFileSync('app/layout.tsx','utf8');
const script=layout.match(/__html:`([^`]+)`/)[1];
assert(layout.includes('data-theme="light"'));
for(const saved of [null,'light','dark','invalid']){
 const document={documentElement:{dataset:{}}};
 vm.runInNewContext(script,{document,localStorage:{getItem:()=>saved},matchMedia:()=>{throw Error('System preference must not override the default')}});
 assert.equal(document.documentElement.dataset.theme,saved==='dark'?'dark':'light');
}
const document={documentElement:{dataset:{}}};
vm.runInNewContext(script,{document,localStorage:{getItem(){throw Error('Storage blocked')}}});
assert.equal(document.documentElement.dataset.theme,'light');

const css=fs.readFileSync('app/playful.css','utf8');
const colors=rule=>Object.fromEntries([...rule.matchAll(/(--[\w-]+):(#[\da-f]{6})(?=[;}])/g)].map(m=>[m[1],m[2]]));
const light=colors(css.match(/:root\{[^}]+\}/)[0]);
const dark={...light,...colors(css.match(/:root\[data-theme=dark\]\{[^}]+\}/)[0])};
const luminance=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>a-b);return (values[1]+.05)/(values[0]+.05)};
for(const [theme,palette] of Object.entries({light,dark})){
 const pairs=[['--ink','--surface'],['--ink','--surface-soft'],['--muted','--surface'],['--muted','--surface-soft'],['--muted','--highlight'],['--green','--surface'],['--green','--highlight'],['--on-green','--green'],['--on-green','--blue'],['--coral','--warning'],['--tile-ink','--tile-low'],['--tile-ink','--sky'],['--tile','--board'],['--tile','--green-dark']];
 for(const [fg,bg] of pairs)assert(ratio(palette[fg],palette[bg])>=4.5,`${theme} ${fg} on ${bg} must have 4.5:1 text contrast`);
 for(const danger of ['#762d27','#a63e32'])assert(ratio(palette['--tile'],danger)>=4.5);
}
console.log('PASS: light default, saved light/dark preferences, blocked storage fallback, and 4.5:1 text contrast for main surfaces, hints, selections, buttons, feedback, tiles and bomb digits in both themes.');
