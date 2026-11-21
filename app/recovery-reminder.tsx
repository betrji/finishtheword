'use client';
import {useEffect,useState} from 'react';
import {KeyRound} from 'lucide-react';

export const recoveryReminderKey=(profileId:string)=>`ftw-recovery-reminder:${profileId}`;
export function useRecoveryReminder(profileId:string|undefined,recoveryEnabled:boolean|undefined){
 const [preference,setPreference]=useState({profileId:'',hidden:true});
 useEffect(()=>{
  if(!profileId)return;
  const key=recoveryReminderKey(profileId);let hidden=false;
  try{hidden=localStorage.getItem(key)==='hidden'}catch{}
  setPreference({profileId,hidden});
  const update=(event:StorageEvent)=>{if(event.key===key||event.key===null)setPreference({profileId,hidden:event.key===key&&event.newValue==='hidden'})};
  window.addEventListener('storage',update);return()=>window.removeEventListener('storage',update);
 },[profileId]);
 function hide(){if(!profileId)return;setPreference({profileId,hidden:true});try{localStorage.setItem(recoveryReminderKey(profileId),'hidden')}catch{}}
 return {show:!!profileId&&preference.profileId===profileId&&!preference.hidden&&recoveryEnabled===false,hide};
}

export default function RecoveryReminder({compact=false,onSetup,onHide,onLater}:{compact?:boolean,onSetup:()=>void,onHide:()=>void,onLater?:()=>void}){
 return <section className={'recovery-reminder '+(compact?'recovery-reminder-compact':'')} aria-label="Protect your player profile"><div className="recovery-reminder-copy"><KeyRound size={22} aria-hidden="true"/><div><h3>Keep your progress safe</h3><p>Create a recovery key to restore your name, rank, rewards, and friends if you lose browser data or switch devices.</p></div></div><div className="recovery-reminder-actions"><button type="button" className={compact?'secondary':'primary'} onClick={onSetup}>Create recovery key</button>{onLater&&<button type="button" className="text-button" onClick={onLater}>Not now</button>}<button type="button" className="text-button" aria-label="Don’t show this again on this browser" onClick={onHide}>Don’t show this again</button></div><small>You can always set a key in Profile → Account. This reminder preference applies to this browser.</small></section>;
}
