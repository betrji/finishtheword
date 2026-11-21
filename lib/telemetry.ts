// Only these named events can be sent. Never pass names, room codes, chat or words.
import {clientId} from './client-id';
export type ProductEvent='invite_open'|'invite_join'|'result_share'|'invite_share'|'invite_copy'|'invite_code_copy';
const recorded=new Set<string>();
export function trackEvent(event:ProductEvent,localOnceKey?:string){
 try{
  if(navigator.doNotTrack==='1'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl||localStorage.getItem('ftw-analytics-optout')==='1')return;
  const key=localOnceKey?event+':'+localOnceKey:'';if(key&&recorded.has(key))return;
  const old=JSON.parse(localStorage.getItem('ftw-visitor')||'null'),visitor=old?.expires>Date.now()&&typeof old.id==='string'?old:{id:clientId(),expires:Date.now()+365*86400000};localStorage.setItem('ftw-visitor',JSON.stringify(visitor));if(key)recorded.add(key);
  void fetch('/api/analytics',{method:'POST',credentials:'omit',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({id:clientId(),visitor:visitor.id,event})}).catch(()=>{});
 }catch{/* Opt-outs, blocked storage and analytics failures never interrupt play. */}
}
