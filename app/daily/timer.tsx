'use client';
import {useEffect,useRef,useState} from 'react';
import TurnClock from '../turn-clock';
import {setBattleMusic} from '../../lib/sounds';
// The 10Hz clock and audio updates stay out of the word input's React tree.
export default function DailyTimer({deadline,duration,offset,sound,music,onExpire}:{deadline:number,duration:number,offset:number,sound:boolean,music:boolean,onExpire:()=>void}){
 const [now,setNow]=useState(Date.now()),expired=useRef(0),callback=useRef(onExpire);callback.current=onExpire;
 useEffect(()=>{const tick=()=>{const now=Date.now(),remaining=Math.max(0,deadline-now-offset);setNow(now);setBattleMusic(music&&remaining>0&&!document.hidden,1-remaining/duration);if(!remaining&&expired.current!==deadline){expired.current=deadline;callback.current()}};tick();const timer=setInterval(tick,100);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);setBattleMusic(false)}},[deadline,duration,offset,music]);
 const remaining=Math.max(0,Math.min(1,(deadline-now-offset)/duration));
 return <><div className="daily-time-track" role="progressbar" aria-label="Time remaining" aria-valuemin={0} aria-valuemax={duration/1000} aria-valuenow={remaining*duration/1000}><div style={{transform:`scaleX(${remaining})`}}/></div><TurnClock deadline={deadline} duration={duration} offset={offset} sound={sound}/></>;
}
