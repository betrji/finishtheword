import {memo,type CSSProperties} from 'react';
import {defaultAvatar,palettes,sanitizeAvatar,rankRewards,type Avatar} from '../lib/avatar';
import RewardEmblem from './reward-emblem';

/** The same printed game piece in profiles, private rooms, and the arena. */
const CharacterToken=memo(function CharacterToken({avatar=defaultAvatar}:{avatar?:Avatar}){
 const a=sanitizeAvatar(avatar),colors=palettes[a.color],reward=rankRewards.find(r=>r.accessory===a.accessory);
 return <div className={'mascot character-token shape-'+a.shape+' token-'+a.accessory} style={{'--piece-color':colors[0],'--piece-ink':colors[1],'--piece-wash':colors[2]} as CSSProperties} aria-hidden="true">
  <svg className="character-drawing" viewBox="0 0 128 144" fill="none" strokeLinecap="round" strokeLinejoin="round" focusable="false">
   <rect className="piece-edge" x="14" y="21" width="100" height="110" rx="10"/>
   <rect className="piece-paper" x="14" y="15" width="100" height="110" rx="10"/>
   <path className="piece-rule" d="M24 24h80M25 112h78"/>
   <g className="piece-portrait">
    {a.shape==='cat'&&<path className="piece-animal" d="m33 62 1-28 23 14h14l23-14 1 28c9 29-5 44-31 44S24 91 33 62Z"/>}
    {a.shape==='bear'&&<><circle className="piece-animal" cx="37" cy="47" r="13"/><circle className="piece-animal" cx="91" cy="47" r="13"/><path className="piece-animal" d="M31 74c0-22 13-33 33-33s33 11 33 33-13 32-33 32-33-10-33-32Z"/></>}
    {a.shape==='bunny'&&<><path className="piece-animal" d="M45 62C27 30 39 20 47 32l10 27m14 0 10-27c8-12 20-2 2 30"/><path className="piece-animal" d="M32 78c0-21 13-31 32-31s32 10 32 31-13 28-32 28-32-7-32-28Z"/></>}
    {a.shape==='cat'&&<path className="piece-detail" d="m40 48 1-5 7 5m32 0 7-5 1 5M32 83l-7-2m7 10-7 2m71-10 7-2m-7 10 7 2"/>}
    <ellipse className="piece-muzzle" cx="64" cy="89" rx="19" ry="12"/>
    <g className="piece-eyes"><circle cx="49" cy="74" r="3"/><circle cx="79" cy="74" r="3"/></g>
    <path className="piece-nose" d="M59 84h10l-5 5Z"/>
    <path className="piece-detail" d="M64 89v4m0 0q-5 6-10 0m10 0q5 6 10 0"/>
    {a.accessory==='glasses'&&<g className="piece-accessory"><rect x="37" y="65" width="23" height="18" rx="6"/><rect x="68" y="65" width="23" height="18" rx="6"/><path d="M60 70h8M32 69h5m54 0h5"/></g>}
    {a.accessory==='cap'&&<g className="piece-accessory"><path className="piece-solid" d="M39 59c0-28 50-28 50 0Z"/><path d="M35 59h65M64 39v20"/></g>}
    {(a.accessory==='crown'||a.accessory==='crystal')&&<g className="piece-accessory"><path className="piece-solid" d="m43 49-4-20 15 9 10-18 10 18 15-9-4 20Z"/>{a.accessory==='crystal'&&<path d="m64 24-7 19 7 5 7-5Z"/>}</g>}
    {a.accessory==='band'&&<g className="piece-accessory"><path className="piece-solid" d="M33 57q31-9 62 0v8q-31-9-62 0Z"/><path d="m61 56 4 3-4 3-4-3Z"/></g>}
    {a.accessory==='visor'&&<g className="piece-accessory"><path className="piece-solid" d="M34 64h60v16H72l-8-5-8 5H34Z"/><path d="m42 68 7 8m6-8 7 6"/></g>}
    {a.accessory==='laurel'&&<g className="piece-accessory"><path d="M38 96Q22 72 40 51m50 45q16-24-2-45"/><path className="piece-solid" d="m34 83-8-7 9-1-6-9 10 1-5-10 10 0m50 26 8-7-9-1 6-9-10 1 5-10-10 0"/></g>}
    {a.accessory==='halo'&&<g className="piece-accessory"><ellipse cx="64" cy="33" rx="25" ry="7"/><circle className="piece-solid" cx="84" cy="29" r="4"/></g>}
   </g>
   <path className="piece-color-tab" d="M48 112h32v13H48z"/>
   {reward&&<g className="piece-reward" transform="translate(83 97) scale(.52)"><RewardEmblem accessory={a.accessory} size={64}/></g>}
  </svg>
 </div>;
},(a,b)=>a.avatar?.color===b.avatar?.color&&a.avatar?.shape===b.avatar?.shape&&a.avatar?.accessory===b.avatar?.accessory);
export default CharacterToken;
