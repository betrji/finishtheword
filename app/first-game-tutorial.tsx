'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowRight,Check,ChevronLeft,Heart,Lightbulb,RotateCcw,Timer,Volume2,VolumeX,X} from 'lucide-react';
import Tile from './tile';
import {useDialogFocus} from './dialog-focus';
import {acceptedSound,rejectedSound,unlockAudio} from '../lib/sounds';

const lessons=[
 {label:'Chain',title:'You’re up. Play ECHO.',copy:'APPLE ends in E. Your word starts with E. That’s the chain.',prompt:'E',answer:'ECHO',trail:['APPLE']},
 {label:'Clock',title:'Two hearts. Keep them beating.',copy:'Real turns start at 15 seconds and get shorter. Run out of time or spelling attempts and you lose a heart.',prompt:'O',answer:'',trail:['APPLE','ECHO']},
 {label:'Repeats',title:'New turn. New word.',copy:'ECHO is already in this chain. Try it again, then play EAGLE instead.',prompt:'E',answer:'EAGLE',trail:['APPLE','ECHO','ORANGE']},
 {label:'Prefixes',title:'Sometimes, take two letters.',copy:'A bonus can carry over more than one letter. VILLAGE gives you AG here. Play AGAIN to match both.',prompt:'AG',answer:'AGAIN',trail:['VILLAGE']},
];
// These are guided examples, not a second dictionary or a live match.
export function tutorialAnswer(step:number,word:string){
 const w=word.trim().toUpperCase(),lesson=lessons[step];
 if(!lesson||step===1)return '';
 if(!w)return `Type ${lesson.answer}, or use the hint below.`;
 if(lesson.trail.includes(w))return `Already played. Try ${lesson.answer}.`;
 if(!w.startsWith(lesson.prompt))return `Start with ${lesson.prompt}. Try ${lesson.answer}.`;
 return w===lesson.answer?`Accepted! ${step===3?'You matched both letters.':'The next word starts with '+w.at(-1)+'.'}`:`For this practice turn, play ${lesson.answer}.`;
}

export default function FirstGameTutorial({onDone,onCancel,standalone=false,sound=false,onToggleSound}:{onDone:()=>void,onCancel:()=>void,standalone?:boolean,sound?:boolean,onToggleSound?:()=>void}){
 const [step,setStep]=useState(0),[seconds,setSeconds]=useState(15),[running,setRunning]=useState(false),[word,setWord]=useState(''),[message,setMessage]=useState(''),[complete,setComplete]=useState(false),[attempt,setAttempt]=useState(0);
 const dialog=useRef<HTMLElement>(null),input=useRef<HTMLInputElement>(null),title=useRef<HTMLHeadingElement>(null),previousStep=useRef(0);
 useDialogFocus(dialog,onCancel);
 useEffect(()=>{if(previousStep.current!==step){previousStep.current=step;title.current?.focus({preventScroll:true})}},[step]);
 useEffect(()=>{
  if(!running)return;
  const end=Date.now()+3000;
  const timer=setInterval(()=>{const remaining=Math.max(0,(end-Date.now())/1000);setSeconds(remaining);if(!remaining){setRunning(false);setComplete(true);setMessage('One heart left. You stay in the game. The last player with a heart wins.')}},100);
  return()=>clearInterval(timer);
 },[running]);
 const lesson=lessons[step],failed=!!message&&!complete,visibleWord=(word.trim()||lesson.prompt).toUpperCase();
 function go(next:number){setRunning(false);setSeconds(15);setStep(next);setWord('');setMessage('');setComplete(false);setAttempt(0)}
 function submit(value=word){
  if(complete)return;
  const feedback=tutorialAnswer(step,value),ok=feedback.startsWith('Accepted');
  setWord(value);setMessage(feedback);setComplete(ok);setAttempt(n=>n+1);
  if(sound){unlockAudio();if(ok)acceptedSound();else rejectedSound()}
  if(!ok){input.current?.focus({preventScroll:true});input.current?.select()}
 }
 function hint(){setWord(lesson.answer);setMessage('');input.current?.focus({preventScroll:true})}
 return <div className="modal-backdrop tutorial-backdrop"><section ref={dialog} className="modal panel tutorial" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" aria-describedby="tutorial-description" tabIndex={-1}>
  <div className="lesson-toolbar"><span>Learn by playing <small>· {step+1} of 4</small></span><div>{onToggleSound&&<button className="lesson-icon" aria-label={sound?'Mute tutorial sounds':'Enable tutorial sounds'} aria-pressed={sound} onClick={onToggleSound}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>}<button className="lesson-icon" aria-label="Close tutorial" onClick={onCancel}><X size={20}/></button></div></div>
  <ol className="lesson-progress" aria-label="Tutorial progress">{lessons.map((item,i)=><li key={item.label} className={i<step?'is-done':i===step?'is-current':''} aria-current={i===step?'step':undefined}><span>{i<step?<Check size={12}/>:i+1}</span>{item.label}</li>)}</ol>
  <div className="lesson-heading" key={'heading-'+step}><h2 id="tutorial-title" ref={title} tabIndex={-1}>{lesson.title}</h2><p id="tutorial-description">{lesson.copy}</p></div>
  <div className={'lesson-board '+(complete?'lesson-complete':'')}>
   <div className="lesson-board-top"><span>{step===1?'Clock demo':'Your practice turn'}</span><div className="lesson-hearts" aria-label={`${step===1&&complete?1:2} hearts remaining`}><Heart size={19} fill="currentColor"/><Heart size={19} className={step===1&&complete?'heart-spent':''} fill={step===1&&complete?'none':'currentColor'}/></div></div>
   <div className="lesson-trail" aria-label="Words already played">{lesson.trail.map((item,i)=><span key={item}>{i>0&&<ArrowRight size={12} aria-hidden="true"/>}<b>{item.slice(0,-(step===3?3:1))}<mark>{item.slice(-(step===3?3:1))}</mark></b></span>)}</div>
   {step===1?<div className={'lesson-clock '+(running?'is-running':'')}><Timer size={28} aria-hidden="true"/><div className="lesson-seconds" aria-live="off">{Math.ceil(seconds)}<small>seconds</small></div><div className="lesson-timebar" aria-hidden="true"><i style={{transform:`scaleX(${seconds/(running||complete?3:15)})`}}/></div><span>{complete?'You get another chance.':running?'Demo only. Watch the heart.':'Let’s see a three-second demo.'}</span></div>:<>
    <div className="lesson-prompt">{complete?<><Check size={16}/> Nice word. Next up: <b>{lesson.answer.at(-1)}</b></>:<>Start with <b>{lesson.prompt}</b>{step===3&&<small>Both letters, in order</small>}</>}</div>
    <div key={`${step}-${attempt}`} className={'lesson-rack '+(complete?'word-accepted':failed?'word-rejected':'')} aria-hidden="true" style={{'--letters':Math.max(5,visibleWord.length)} as CSSProperties}>{visibleWord.split('').map((letter,i)=><Tile key={i} letter={letter} className={i<lesson.prompt.length?'tile-accent':''} style={{'--tile-index':i} as CSSProperties}/>)}{!word&&Array.from({length:lesson.answer.length-lesson.prompt.length},(_,i)=><span className="lesson-empty-tile" key={'empty-'+i}/>)}</div>
   </>}
  </div>
  {step===1?<div className="lesson-clock-actions"><button className="secondary" disabled={running||complete} onClick={()=>{setSeconds(3);setRunning(true)}}><Timer size={17}/> {running?'Watching the clock…':complete?'Demo complete':'Watch the timer'}</button>{!complete&&<button className="text-button" onClick={()=>go(2)}>Got it, skip demo <ArrowRight size={14}/></button>}</div>:<form className="lesson-form" onSubmit={e=>{e.preventDefault();submit()}}>
   <label htmlFor="tutorial-word">{complete?'Word accepted':`Your word · starts with ${lesson.prompt}`}</label><div><input ref={input} id="tutorial-word" value={word} onChange={e=>{setWord(e.target.value.replace(/[^a-z]/gi,'').slice(0,12));setMessage('')}} readOnly={complete} maxLength={12} placeholder={`Type ${lesson.answer.toLowerCase()}`} autoComplete="off" autoCapitalize="none" autoCorrect="off" enterKeyHint="send" spellCheck={false} aria-invalid={failed} aria-describedby="tutorial-feedback"/><button className="primary" disabled={complete} type="submit">{complete?<Check size={18}/>:<>Play <ArrowRight size={17}/></>}</button></div>
   {!complete&&<div className="lesson-hints">{step===2&&<button type="button" onClick={()=>submit('ECHO')}><RotateCcw size={14}/> Try the repeat</button>}<button type="button" onClick={hint}><Lightbulb size={14}/> Fill {lesson.answer}</button></div>}
  </form>}
  <div id="tutorial-feedback" className={'lesson-feedback '+(complete?'is-success':failed?'is-error':'')} role="status" aria-live="polite" aria-atomic="true">{message&&<>{complete?<Check size={17}/>:<RotateCcw size={17}/>}<span>{message}</span></>}</div>
  <div className="tutorial-actions"><div>{step>0&&<button className="text-button" onClick={()=>go(step-1)}><ChevronLeft size={15}/> Back</button>}<button className="text-button" onClick={onDone}>{standalone?'Skip tutorial':'Skip & play'}</button></div><button className="primary" disabled={!complete} onClick={step===3?onDone:()=>go(step+1)}>{step===3?(standalone?'Let’s play':'Ready to play'):`Next: ${lessons[step+1].label.toLowerCase()}`}<ArrowRight size={17}/></button></div>
  <p className="lesson-note">No score. No pressure. Replay this in How to Play.</p>
 </section></div>
}
