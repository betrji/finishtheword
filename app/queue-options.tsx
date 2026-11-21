'use client';
import {useEffect,useRef,useState} from 'react';
export const queueOfferReady=(started:number,now:number,delay:number)=>now-started>=delay*1000;
export default function QueueOptions({startedAt,busy,onInvite,onPractice}:{startedAt?:number,busy:boolean,onInvite:()=>void,onPractice:()=>void}){
 const fallback=useRef(Date.now()),[now,setNow]=useState(Date.now()),[delay,setDelay]=useState(30),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{try{const n=Number(localStorage.getItem('ftw-queue-offer-seconds'));if([15,30,60].includes(n))setDelay(n)}catch{}const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 useEffect(()=>setDismissed(false),[startedAt]);
 const waited=Math.max(0,Math.floor((now-(startedAt||fallback.current))/1000)),offer=!dismissed&&queueOfferReady(startedAt||fallback.current,now,delay);
 return <section className="queue-options" aria-label="Matchmaking options"><div className="queue-wait"><span aria-live="off">Waiting {waited}s</span><label>Offer alternatives after <select value={delay} onChange={e=>{const n=Number(e.target.value);setDelay(n);try{localStorage.setItem('ftw-queue-offer-seconds',String(n))}catch{}}}><option value={15}>15s</option><option value={30}>30s</option><option value={60}>60s</option></select></label></div>{offer&&<><p role="status">Still looking for players. You can keep your place or choose another way to play.</p><div className="queue-choice-buttons"><button className="secondary" disabled={busy} onClick={()=>setDismissed(true)}>Keep waiting</button><button className="secondary" disabled={busy} onClick={onInvite}>Leave queue & invite a friend</button><button className="secondary" disabled={busy} onClick={onPractice}>Leave queue & practice</button></div></>}</section>
}
