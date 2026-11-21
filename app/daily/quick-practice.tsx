'use client';

import {useState,useRef} from 'react';
import Tile from '../tile';
import {acceptedSound,unlockAudio} from '../../lib/sounds';

import {timeBonusSeconds} from '../../lib/daily';

export default function QuickPractice({sound,busy,onPlay,onSkip}:{
  sound:boolean;busy:boolean;onPlay:()=>void;onSkip:()=>void;
}) {
  const [words,setWords]=useState<string[]>([]);
  const [draft,setDraft]=useState('');
  const [hint,setHint]=useState('');
  const field=useRef<HTMLInputElement>(null);
  const letter=words.length?'E':'T';
  const example=words.length?'EVERGREEN':'TURTLE';
  const won=words.length===2;

  function submit(raw:string) {
    const word=raw.trim().toUpperCase();
    if(word!==example){
      setHint(`For this warm-up, try ${example}.`);
      return;
    }
    if(sound){unlockAudio();acceptedSound(timeBonusSeconds(word));}
    setWords([...words,word]);
    setDraft('');
    setHint('');
    field.current?.focus({preventScroll:true});
  }

  return <section className="panel daily-quick-practice" aria-label="Quick practice">
    {won?<div className="daily-practice-win">
      <span aria-hidden="true">✦</span>
      <strong className="daily-time-bonus" data-seconds="2" role="status">+2s</strong>
      <h2 role="status">Chain complete!</h2>
      <p>EVERGREEN earned 2 seconds. The timed challenge is 12 words in 15 seconds.</p>
      <button className="primary" disabled={busy} onClick={onPlay}>Now try it with the clock</button>
    </div>:<>
      <div className="daily-practice-prompt" key={letter}>
        {words.length>0&&<strong className="daily-time-bonus" role="status">+1s</strong>}
        <Tile letter={letter}/>
        <h2 aria-live="polite">Type {example}</h2>
        <p>{words.length ? "TURTLE earned 1 second. Try EVERGREEN for 2 seconds." : "Words with 6–8 letters add 1 second. Words with 9 or more add 2 seconds total."}</p>
      </div>
      <form onSubmit={event=>{event.preventDefault();submit(draft);}}>
        <label className="sr-only" htmlFor="practice-word">Practice word</label>
        <div className="daily-practice-entry">
          <input ref={field} id="practice-word" value={draft} onChange={e=>setDraft(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="go" maxLength={24} placeholder={example}/>
          <button className="primary" disabled={!draft.trim()}>Link</button>
        </div>
      </form>
      {hint&&<p role="status">{hint}</p>}
      <button type="button" className="daily-practice-text" onClick={()=>submit(example)}>Use {example}</button>
    </>}
    <button type="button" className="daily-practice-text" disabled={busy} onClick={onSkip}>Skip practice</button>
  </section>;
}
