import {ArrowRight,BookOpen,Heart,Users} from 'lucide-react';
import Tile from './tile';
import Mascot from './character-token';
import type {Avatar} from '../lib/avatar';
export default function ArenaIdle({avatar,name,onMenu,onTutorial}:{avatar:Avatar,name:string,onMenu:()=>void,onTutorial:()=>void}){
 return <section className="arena-idle" aria-label="Arena waiting table">
  <div className="arena-idle-heading"><span>Finish the Word · Arena</span><h1>The table is ready<span className="arena-heading-period">.</span></h1><p>Find a rival, bring a friend, or warm up against a bot.</p></div>
  <div className="arena-idle-table" aria-hidden="true"><div className="idle-seat"><Mascot avatar={avatar}/><b>{name||'Your seat'}</b><span><Heart size={17} fill="currentColor"/><Heart size={17} fill="currentColor"/></span></div><div className="idle-table-center"><div>{Array.from('PLAY').map((letter,i)=><Tile key={i} letter={letter}/>)}</div><span>The first letter is waiting.</span></div><div className="idle-seat idle-open-seat"><Users size={42}/><b>Open seat</b><span>Your next rival</span></div></div>
  <div className="arena-idle-actions"><button className="primary" onClick={onMenu}>Choose a game <ArrowRight size={19}/></button><button className="secondary" onClick={onTutorial}><BookOpen size={17}/> Try a guided round</button><p>Matches open in fullscreen. Exit any time using the arena toolbar.</p></div>
 </section>;
}
