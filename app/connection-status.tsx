'use client';
import {useEffect,useRef,useState} from 'react';
import {Wifi,WifiOff} from 'lucide-react';
export function connectionLabel(lastSuccess:number,now:number,online:boolean){return !online?'Offline':!lastSuccess?'Connecting':now-lastSuccess>15000?'Reconnecting':'Connected'}
export default function ConnectionStatus({lastSuccess,onRetry}:{lastSuccess:number|{current:number},onRetry:()=>void}){
 const mounted=useRef(Date.now()),resumed=useRef(Date.now());const [online,setOnline]=useState(true),[now,setNow]=useState(Date.now()),retry=useRef(onRetry);retry.current=onRetry;
 useEffect(()=>{const update=()=>{setOnline(navigator.onLine);setNow(Date.now());if(navigator.onLine)retry.current()};setOnline(navigator.onLine);const visible=()=>{if(!document.hidden){resumed.current=Date.now();update()}};document.addEventListener('visibilitychange',visible);window.addEventListener('online',update);window.addEventListener('offline',update);const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[]);
 const timestamp=typeof lastSuccess==='number'?lastSuccess:lastSuccess.current;
 const label=!timestamp&&online&&now-mounted.current<=15000?'Connecting':connectionLabel(Math.max(timestamp||mounted.current,resumed.current),now,online),good=label==='Connected';
 if(good||label==='Connecting')return <div className="connection-status connection-good" aria-hidden="true"/>;
 return <div className={'connection-status '+(good?'connection-good':'connection-waiting')}><span role="status">{good?<Wifi size={13}/>:<WifiOff size={13}/>} {label}</span>{<><small>Updates are delayed. Retrying automatically.</small><button className="text-button" onClick={onRetry}>Retry now</button></>}</div>
}
