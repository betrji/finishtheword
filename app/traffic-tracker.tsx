'use client';
import {clientId} from '../lib/client-id';
import {useEffect} from 'react';
let viewId:string|undefined;
export default function TrafficTracker(){
  useEffect(()=>{
    if(!['/','/arena','/how-to-play','/daily'].includes(location.pathname)||navigator.doNotTrack==='1'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl)return;
    try{
      if(localStorage.getItem('ftw-analytics-optout')==='1')return;
      const stored=JSON.parse(localStorage.getItem('ftw-visitor')||'null');
      const visitor=stored?.expires>Date.now()&&typeof stored.id==='string'?stored:{id:clientId(),expires:Date.now()+365*86400000};
      localStorage.setItem('ftw-visitor',JSON.stringify(visitor));
      viewId??=clientId();
      let referrer='';try{referrer=new URL(document.referrer).origin}catch{}
      // One small request per document load. No turn, typing, or countdown events.
      void fetch('/api/analytics',{method:'POST',credentials:'omit',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({id:viewId,visitor:visitor.id,path:location.pathname,referrer,device:/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)||navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent)?'mobile':'desktop'})}).catch(()=>{});
    }catch{/* Storage restrictions or analytics failures must never affect the game. */}
  },[]);
  return null;
}
