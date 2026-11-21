'use client';
import {memo,useEffect,useRef,useState} from 'react';

export type Tempo = {matchId:string,duration:number,round:number,active:boolean};
export function secondsLost(previous:Tempo|undefined,next:Tempo){
 if(!previous||!next.active||!previous.active||previous.matchId!==next.matchId||next.round<=previous.round)return 0;
 return Math.max(0,(previous.duration-next.duration)/1000);
}
// Compare the server's turn allowance, never the ticking deadline or choice clock.
export default memo(function TempoNotice(props:Tempo){
 const previous=useRef<Tempo|undefined>(undefined);
 const [notice,setNotice]=useState<{id:string,seconds:number,duration:number}|null>(null);
 useEffect(()=>{
  const seconds=secondsLost(previous.current,props);previous.current=props;
  if(!seconds){setNotice(null);return;}
  setNotice({id:`${props.matchId}:${props.round}`,seconds,duration:props.duration/1000});
  const timer=setTimeout(()=>setNotice(null),1800);return()=>clearTimeout(timer);
 },[props.matchId,props.duration,props.round,props.active]);
 return <div className="tempo-notice" role="status" aria-live="polite" aria-atomic="true">
  {notice&&<><span className="sr-only">Faster round. Turns are now {notice.duration} seconds.</span><span key={notice.id} className="tempo-hit" aria-hidden="true"><b>−{notice.seconds} {notice.seconds===1?'sec':'secs'}!</b><small>{notice.duration}-second turns</small></span></>}
 </div>;
});
