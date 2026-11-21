import {ArrowLeft,ArrowRight,Bot,LoaderCircle,Play,Users} from 'lucide-react';

export type PlaySection='online'|'friends'|'practice';

export function MenuSetupHeader({section,busy,onBack}:{section:Exclude<PlaySection,'online'>,busy:boolean,onBack:()=>void}){
 return <div className="menu-setup-heading"><button type="button" className="menu-setup-back" disabled={busy} onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/> Back to online play</button><h2 id="setup-section-title" tabIndex={-1}>{section==='friends'?'Play with friends':'Practice'}</h2><p>{section==='friends'?'Host a public or private room, or join your friends.':'Choose a bot to warm up with. No Elo changes.'}</p></div>
}

export function MenuAlternatives({busy,onSelect}:{busy:boolean,onSelect:(section:PlaySection)=>void}){
 return <div className="quick-alternatives"><button id="menu-friends" type="button" disabled={busy} onClick={()=>onSelect('friends')}><MenuOptionArt kind="friends"/><span><b>Play with friends</b><small>Host or join a room</small></span><ArrowRight size={15} aria-hidden="true"/></button><button id="menu-practice" type="button" disabled={busy} onClick={()=>onSelect('practice')}><MenuOptionArt kind="practice"/><span><b>Practice</b><small>Warm up with a bot</small></span><ArrowRight size={15} aria-hidden="true"/></button></div>
}

export function MenuPlayButton({mode,nameValid,busy,ready,onPlay}:{mode:'ranked'|'casual',nameValid:boolean,busy:boolean,ready:boolean,onPlay:()=>void}){
 const label=busy?'Joining…':!nameValid?'Enter a name to play':!ready?'Connecting…':mode==='ranked'?'Play ranked':'Play now';
 const hint=busy?'Getting your match ready':!nameValid?'Your name goes in the field above':!ready?'Getting the arena ready':mode==='ranked'?'Compete and climb the ranks':'Find a live match';
 return <button type="button" className="primary play-now menu-play" disabled={busy||!ready} aria-busy={busy} aria-label={label} onClick={onPlay}>
  <span className="menu-play-key" aria-hidden="true">{busy?<LoaderCircle size={22} className="spin"/>:<Play size={21} fill="currentColor"/>}</span>
  <span className="menu-play-copy"><strong>{label}</strong><small>{hint}</small></span>
  <span className="menu-play-arrow" aria-hidden="true"><ArrowRight size={22}/></span>
 </button>
}

export function MenuOptionArt({kind}:{kind:'friends'|'practice'}){
 return <span className={'menu-option-art art-'+kind} aria-hidden="true"><span className="menu-art-back"/><span className="menu-art-front">{kind==='friends'?<Users size={22}/>:<Bot size={23}/>}</span></span>
}
