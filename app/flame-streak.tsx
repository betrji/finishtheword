'use client';
import {memo,useEffect,useRef,useState,type CSSProperties} from 'react';
import {streakMilestones} from '../lib/game';

export function FlameIcon(){return <svg className="streak-flame" viewBox="0 0 32 40" aria-hidden="true"><path className="flame-shell" d="M18 2c2 10-7 12-4 18 2-2 4-5 4-8 8 6 12 12 10 19-2 7-9 9-14 8C3 37 1 28 5 21c0 5 3 7 4 7C5 15 18 12 18 2Z"/><path className="flame-heart" d="M17 23c0 5-6 6-6 10 0 3 3 5 6 5 6 0 8-7 0-15Z"/></svg>}

const FlameStreak=memo(function FlameStreak({current=0,best=0,practice=false}:{current?:number,best?:number,practice?:boolean}){
 const previous=useRef(current),[gain,setGain]=useState(0);
 useEffect(()=>{const increased=current>previous.current;previous.current=current;if(!increased){setGain(0);return;}setGain(current);const timer=setTimeout(()=>setGain(0),1100);return()=>clearTimeout(timer)},[current]);
 const next=streakMilestones.find(t=>t.min>best);
 return <div className={'word-streak '+(current?'streak-lit':'streak-idle')} style={{'--flame-scale':.62+Math.min(current,8)*.0475} as CSSProperties}>
  <span className="flame-holder"><FlameIcon/>{gain>0&&<span key={gain} className="streak-gain" aria-hidden="true">+1</span>}</span>
  <div className="streak-count"><b>Your streak <strong>{current}</strong></b><small>Best {best}{practice?' · Practice only':next?` · ${next.name} at ${next.min}`:' · Inferno earned'}</small></div>
  <details className="streak-help"><summary aria-label="Word streak rules">5+ letters</summary><p>Play accepted words of 5+ letters on consecutive turns of your own. Short words, Roman numerals, rejected answers and lost lives reset the flame. Your best stays. Earn permanent profile badges at 3, 5 and 8 in multiplayer matches. Bot practice does not unlock badges or improve your profile best.</p></details>
  <span className="streak-announcement" role="status" aria-live="polite" aria-atomic="true">{gain>0?`Plus one. Word streak ${gain}.`:''}</span>
 </div>;
});
export default FlameStreak;

export function StreakBadges({best=0}:{best?:number}){return <section className="streak-collection" aria-label="Word streak badges"><h3>Word streak badges</h3><p>Personal best: <b>{best}</b> · Earned in multiplayer. Bot practice excluded.</p><div className="streak-badges">{streakMilestones.map(t=><div key={t.name} className={'streak-badge '+(best>=t.min?'streak-earned':'streak-locked')}><FlameIcon/><b>{t.name}</b><small>{best>=t.min?'Unlocked':`${t.min}-word streak`}</small></div>)}</div></section>}
