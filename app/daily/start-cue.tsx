'use client';

import {useEffect,useRef,useState} from 'react';
import {dailyStartSound} from '../../lib/sounds';

export function useDailyCountdown(startsAt: number | undefined, offset: number, sound: boolean) {
  const [cue,setCue] = useState(0);
  const played = useRef('');
  useEffect(()=>{
    if (startsAt === undefined) { setCue(0); return; }
    let timer: ReturnType<typeof setTimeout>;
    function update() {
      const remaining = startsAt! - (Date.now() + offset);
      const phase = remaining > 0 ? Math.min(3,Math.ceil(remaining/1000)) : remaining > -700 ? -1 : 0;
      setCue(phase);
      const key = `${startsAt}:${phase}`;
      if (phase && played.current !== key) {
        played.current = key;
        if (sound && !document.hidden) dailyStartSound(phase === -1);
      }
      if (phase) timer = setTimeout(update,Math.max(1,phase>0 ? remaining-(phase-1)*1000 : 700+remaining));
    }
    update();
    return ()=>clearTimeout(timer);
  },[startsAt,offset,sound]);
  return cue;
}

export function DailyStartCue({cue}: {cue:number}) {
  return <>
    <span className="sr-only" role="status">{cue === -1 ? 'Go!' : cue || ''}</span>
    {!!cue&&<div className={`daily-start-cue${cue===-1?' daily-start-go':''}`} aria-hidden="true" key={cue}>
      <span className="daily-start-ring"/>
      <strong>{cue===-1?'GO!':cue}</strong>
      <div className="daily-start-lights">{[3,2,1].map(light=><i key={light} data-lit={light>=cue}/>)}</div>
    </div>}
  </>;
}
