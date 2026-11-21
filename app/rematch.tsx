'use client';
import {useEffect,useRef,useState} from 'react';
import {rematchCountdownSound} from '../lib/sounds';
export default function Rematch({ready,you,startAt,nextId,offset=0,busy,onReady,onCancel,practice=false,total=2,sound=false}:{ready:number[],you:number,startAt?:number,nextId?:string,offset?:number,busy:boolean,onReady:()=>void,onCancel:()=>void,practice?:boolean,total?:number,sound?:boolean}){
 const [now,setNow]=useState(Date.now());useEffect(()=>{if(!startAt||nextId||practice)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(timer)},[startAt,nextId,practice]);
 const joined=ready.includes(you);
 const played=useRef('');
 useEffect(()=>{if(!startAt){played.current='';return;}if(practice||!joined||nextId)return;const tick=()=>{const remaining=Math.ceil((startAt-Date.now()-offset)/1000),key=`${startAt}:${remaining}`;if(remaining<1||remaining>3||key===played.current)return;played.current=key;if(sound&&!document.hidden)rematchCountdownSound(remaining)};tick();const timer=setInterval(tick,100);return()=>clearInterval(timer)},[startAt,offset,practice,joined,nextId,sound]);
 const seconds=startAt?Math.max(0,Math.ceil((startAt-now-offset)/1000)):0;
 return <section className="rematch-controls" aria-label="Rematch"><button className={practice?'secondary rematch-button':'primary rematch-button'} disabled={busy||!!nextId} aria-pressed={practice?undefined:joined} onClick={joined&&!practice?onCancel:onReady}><span>{practice?'Play this bot again':'Rematch?'}</span>{!practice&&<small>{ready.length}/{total} ready</small>}</button>{!practice&&<><p role="status">{nextId?'Rematch started':joined?'You’re in. Tap again to cancel.':'One more with these players?'}</p>{startAt&&!nextId&&<p className="rematch-countdown" aria-live="off">{seconds>0?`Starting in ${seconds}…`:'Starting match…'}{ready.length<total&&<small>Starting with {ready.length} ready players.</small>}</p>}</>}</section>
}
