 'use client';
import type {ReactNode} from 'react';
import {BookOpen} from 'lucide-react';
import Mascot from './character-token';
import DailyChallenge from './daily/play';
import type {Avatar} from '../lib/avatar';
export default function ArenaWelcome({avatar,name,setup,onCustomize,onTutorial,onRules,sound,music,onProfile}:{onProfile:(name:string,sessionId:string)=>void,sound:boolean,music:boolean,avatar:Avatar,name:string,setup:ReactNode,onCustomize:()=>void,onTutorial:()=>void,onRules:()=>void}){
 return <section className="arena-welcome" aria-label="Play Finish the Word">
 <div className="entrance-board"><DailyChallenge embedded onProfile={onProfile} sound={sound} music={music}/><a className="daily-multiplayer-link" href="#multiplayer">Play with friends · Multiplayer</a></div>
 <section className="welcome-desk" id="multiplayer" aria-labelledby="multiplayer-title"><div className="multiplayer-heading"><div><span className="mini-label">2–5 players · Live word chains</span><h2 id="multiplayer-title">Who gets the last word?</h2></div><button className="multiplayer-avatar" onClick={onCustomize} aria-label="Customize your avatar"><Mascot avatar={avatar}/><span>{name.trim()||'Your look'}</span></button></div>{setup}<button className="welcome-tutorial" onClick={onTutorial}><BookOpen size={19}/><span><b>First time? Play a guided round.</b><small>Learn by playing. Skip whenever you like.</small></span></button><button className="text-button" onClick={onRules}>Multiplayer rules</button></section>
 </section>
}
