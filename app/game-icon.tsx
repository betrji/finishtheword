type IconName='menu'|'sun'|'moon'|'music'|'music-off'|'sound'|'mute'|'close'|'glasses'|'crown'|'cap'|'none';

/** Compact, ink-drawn marks for the game's tile controls. */
export default function GameIcon({name,size=20}:{name:IconName,size?:number}){
 return <svg className="game-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
  {name==='menu'&&<><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>}
  {name==='sun'&&<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>}
  {name==='moon'&&<path fill="currentColor" stroke="none" d="M19.5 15.1A8.3 8.3 0 0 1 8.9 4.5 8.4 8.4 0 1 0 19.5 15.1Z"/>}
  {(name==='music'||name==='music-off')&&<><path d="M10 17V6l10-2v11M10 10l10-2"/><ellipse fill="currentColor" stroke="none" cx="7" cy="17.5" rx="3.5" ry="2.5"/><ellipse fill="currentColor" stroke="none" cx="17" cy="15.5" rx="3.5" ry="2.5"/>{name==='music-off'&&<path d="m3 3 18 18"/>}</>}
  {(name==='sound'||name==='mute')&&<><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none"/>{name==='sound'?<><path d="M17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14"/></>:<path d="m17 9 5 6m0-6-5 6"/>}</>}
  {name==='close'&&<path d="m6 6 12 12M18 6 6 18"/>}
  {name==='glasses'&&<><rect x="2" y="8" width="8" height="8" rx="3"/><rect x="14" y="8" width="8" height="8" rx="3"/><path d="M10 11h4"/></>}
  {name==='crown'&&<><path d="m3 7 5 4 4-7 4 7 5-4-2 11H5z"/><path d="M6 21h12"/></>}
  {name==='cap'&&<><path d="M4 15V11a8 8 0 0 1 16 0v4M2 15h20M8 15v-4a8 8 0 0 1 4-7"/></>}
  {name==='none'&&<><circle cx="12" cy="12" r="8"/><path d="m6.4 17.6 11.2-11.2"/></>}
 </svg>;
}
