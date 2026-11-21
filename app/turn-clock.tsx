'use client';
import {memo,useEffect,useRef,useState} from 'react';
import {timeWarningSound} from '../lib/sounds';
const TurnClock=memo(function TurnClock({deadline,duration,offset,sound,bomb=true,reconnect}:{deadline:number,duration:number,offset:number,sound:boolean,bomb?:boolean,reconnect?:import('../lib/game').ReconnectPause}){
const [now,setNow]=useState(Date.now());
useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),100);return()=>clearInterval(timer)},[deadline]);
const seconds=Math.max(0,Math.min(duration,reconnect&&now+offset<reconnect.until?reconnect.remaining:deadline-now-offset)/1000),fraction=seconds/(duration/1000);
const warned=useRef(0);useEffect(()=>{if(seconds>0&&seconds<=3&&warned.current!==deadline){warned.current=deadline;if(sound)timeWarningSound()}},[seconds,deadline,sound]);
const fuseX=38*(1-fraction)**2+72*(1-fraction)*fraction+62*fraction**2,fuseY=30*(1-fraction)**2+8*(1-fraction)*fraction+8*fraction**2;
return <div className={'clock-display '+(bomb?'bomb-timer ':'')+(seconds<4?'clock-warning bomb-danger':'')} aria-label={`${seconds.toFixed(1)} seconds remaining`} aria-live="off">
{bomb?<><svg className="animated-fuse" viewBox="0 0 64 32" aria-hidden="true"><path className="fuse-spent" d="M38 30 Q36 4 62 8"/><path className="fuse-rope" d="M38 30 Q36 4 62 8" pathLength="1" strokeDasharray={`${fraction} 1`}/>{seconds>0&&<g className="fuse-tip" style={{transform:`translate(${fuseX}px,${fuseY}px)`}}><circle className="fuse-glow" r="7"/><circle className="fuse-flame" r="3"/><circle className="fuse-ember" r="1.5"/><circle className="fuse-ember ember-two" r="1"/><circle className="fuse-ember ember-three" r="1"/></g>}</svg><div className="bomb-body"><span>{seconds.toFixed(1)}<small>s</small></span></div></>:<div className="clock-digits">{seconds.toFixed(1)}<small>sec</small></div>}
<div className="clock-bar" aria-hidden="true"><i style={{transform:`scaleX(${fraction})`}}/></div></div>
});
export default TurnClock;
