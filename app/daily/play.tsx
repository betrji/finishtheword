'use client';
import {WordDraft,useWordDraft} from '../word-draft';
import {useEffect,useRef,useState} from 'react';
import Tile from '../tile';
import {useDailyCountdown,DailyStartCue} from './start-cue';
import DailyTimer from './timer';
import {ArenaRequests} from '../../lib/arena-requests';
import {unlockAudio,typingSound,acceptedSound,rejectedSound,dailyResultSound,setBattleMusic} from '../../lib/sounds';
import PlayStreak from '../play-streak';
import ThemeToggle from '../theme-toggle';
import ConnectionStatus from '../connection-status';
import ResultCard from '../result-card';
import WordMeaning from '../word-meaning';
import MatchFeedback from '../match-feedback';
import {dailyGoal,timeBonusSeconds,type DailyRun,type Language} from '../../lib/daily';
import QuickPractice from './quick-practice';
type DailyData={canRetry?:boolean,playStreak?:import('../../lib/game').DailyPlayStreak,run:DailyRun|null,date:string,letter:string,now:number,message?:string};
export default function DailyChallenge({embedded=false,sound:providedSound,music:providedMusic,onProfile}:{onProfile?:(name:string,sessionId:string)=>void,embedded?:boolean,sound?:boolean,music?:boolean}={}){
 const [localSound,setLocalSound]=useState(true),[localMusic,setLocalMusic]=useState(true),[exploding,setExploding]=useState(false);const sound=providedSound??localSound,music=providedMusic??localMusic;const exploded=useRef('');
 useEffect(()=>{try{setLocalSound(localStorage.getItem('arena-sound')!=='off');setLocalMusic(localStorage.getItem('arena-music')!=='off')}catch{}},[]);
 const [checkingWord,setCheckingWord]=useState(false);
 const [practice,setPractice]=useState(false);
 const [choosingName,setChoosingName]=useState(false);
 useEffect(()=>{try{setPractice(!localStorage.getItem('ftw-daily-practice'));}catch{}},[]);
 const [language,setLanguage]=useState<Language>('en'),[data,setData]=useState<DailyData|null>(null),[name,setName]=useState(''),[needsName,setNeedsName]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[feedback,setFeedback]=useState('');
 const lane=useRef(new ArenaRequests());const refresh=useRef(()=>{});const [expired,setExpired]=useState(false);const [accepted,setAccepted]=useState(0);const lastSuccess=useRef(0);const session=useRef(''),lock=useRef(false),submitting=useRef(false),field=useRef<HTMLInputElement>(null),offset=useRef(0),generation=useRef(0);
 const activeAudioRun=useRef<string|null>(null);
 const draft=useWordDraft(),setWord=draft.write;
 async function act(action:string,extra:{enabled?:boolean,runId?:string}={}){
  const word=draft.read();
  if(action==='word'&&(submitting.current||busy||expired||!word.trim()||!data?.run||data.run.finished||Date.now()+offset.current<data.run.started))return;
  if(action==='word'){submitting.current=true;setCheckingWord(true);setFeedback('');}
  if((action==='start'||action==='retry')&&(sound||music))unlockAudio();
  if(action!=='status')setBusy(true);
  const gen=generation.current,submitted=word;if(action==='word')setWord('');
  try{
   const d=await lane.current.run(action,async signal=>{
    try{session.current=localStorage.getItem('arena-session')||session.current}catch{}
    const r=await fetch('/api/daily',{method:'POST',headers:{'Content-Type':'application/json','X-Arena-Session':session.current},body:JSON.stringify({action,language,countdown:true,word:submitted,deadline:data?.run?.deadline,...extra}),signal});
    const payload=await r.json() as DailyData & {error?:string};
    if(r.status===401){lastSuccess.current=Date.now();setNeedsName(true);return null;}
    if(!r.ok)throw Error(payload.error||'Connection interrupted.');return payload;
   });
   if(gen!==generation.current)return;
   if(!d){if(action==='word')setWord(current=>current||submitted);return;}
   if(d.run?.finished){
    if(activeAudioRun.current===d.run.id&&sound)dailyResultSound(d.run.completed,d.run.completed&&action==='word'?.35:0);
    activeAudioRun.current=null;
   }else activeAudioRun.current=d.run?.id??null;
   lastSuccess.current=Date.now();offset.current=d.now-Date.now();setData(d);setNeedsName(false);setError('');
   if(action==='start'||action==='retry'){setExpired(false);setExploding(false);setWord('');}
   if(action!=='status')setFeedback(d.message||'');
   if(action==='word'&&d.message){setWord(current=>current||submitted);if(sound&&!d.run?.finished)rejectedSound();}
   if(action==='word'&&!d.message){if(d.run&&!d.run.finished&&d.run.deadline>d.now)setExpired(false);setAccepted(n=>n+1);if(sound)acceptedSound(timeBonusSeconds(d.run?.words.at(-1)||''));}
  }catch(e){if(action==='word'&&gen===generation.current)setWord(current=>current||submitted);if(gen===generation.current&&action!=='status')setError((e as Error).message)}
  finally{if(action!=='status')setBusy(false);if(action==='word'){submitting.current=false;setCheckingWord(false);field.current?.focus({preventScroll:true})}}
 }
 refresh.current=()=>void act('status');

 useEffect(()=>{try{session.current=localStorage.getItem('arena-session')||'';setName(localStorage.getItem('arena-name')||'');const lang=new URLSearchParams(location.search).get('lang');if(lang==='en'||lang==='es'||lang==='de')setLanguage(lang)}catch{}},[]);
 useEffect(()=>{generation.current++;setExpired(false);setData(null);setWord('');setFeedback('');refresh.current();const timer=setInterval(()=>{if(!document.hidden)refresh.current()},5000);return()=>clearInterval(timer)},[language]);
 useEffect(()=>{const resume=()=>{if(!document.hidden)refresh.current()};document.addEventListener('visibilitychange',resume);return()=>document.removeEventListener('visibilitychange',resume)},[]);
 async function saveName(){if(lock.current||!name.trim())return;if(sound||music)unlockAudio();try{session.current=localStorage.getItem('arena-session')||session.current}catch{}setBusy(true);lock.current=true;try{const r=await fetch('/api/arena',{method:'POST',headers:{'Content-Type':'application/json',...(session.current?{'X-Arena-Session':session.current}:{})},body:JSON.stringify({action:'profile',name:name.trim()})});const d=await r.json() as {sessionId:string,profile:{name:string},error?:string};if(!r.ok)throw Error(d.error||'Connection interrupted.');session.current=d.sessionId;try{localStorage.setItem('arena-session',d.sessionId);localStorage.setItem('arena-name',d.profile.name)}catch{}onProfile?.(d.profile.name,d.sessionId);setName(d.profile.name);setNeedsName(false);setError('');await act('start');}catch(e){setError((e as Error).message)}finally{lock.current=false;setBusy(false);}}
 const run=data?.run,active=!!run&&!run.finished;
 const cue=useDailyCountdown(active?run.started:undefined,offset.current,sound);
 const staging=active&&Date.now()+offset.current<run.started;
 function expire(){setExpired(true);if(run&&exploded.current!==run.id){exploded.current=run.id;setExploding(true)}refresh.current();}
 useEffect(()=>{if(!exploding)return;const t=setTimeout(()=>setExploding(false),900);return()=>clearTimeout(t)},[exploding]);
 useEffect(()=>{if(active&&!staging)field.current?.focus({preventScroll:true})},[active,staging]);
 function startDaily(){
  if(busy)return;
  const automaticGuest=/^Guest [a-f0-9]{8}$/i.test(name);
  if(needsName||!session.current||!name.trim()||automaticGuest){
   if(automaticGuest)setName('');
   setChoosingName(true);
   return;
  }
  void act('start');
 }
 const showPractice=practice&&!run&&!choosingName;
 useEffect(()=>{
  if(run)setChoosingName(false);
  if(run&&practice){
   try{localStorage.setItem('ftw-daily-practice','1');}catch{}
   setPractice(false);
  }
 },[run,practice]);
 const bonusSeconds=timeBonusSeconds(run?.words.at(-1)||'');
 const bonusPopup=accepted>0&&run&&bonusSeconds>0&&<strong key={run.id+accepted} className="daily-time-bonus" data-seconds={bonusSeconds} role="status">+{bonusSeconds}s</strong>;
 return <section className={`daily-shell daily-embedded ${embedded?'':'daily-standalone'}`}>{!embedded&&<div className="daily-nav"><a href="/">Main menu</a><ThemeToggle/><button onClick={()=>{setLocalSound(v=>!v);unlockAudio()}}>{sound?'Mute effects':'Enable effects'}</button><button onClick={()=>{setLocalMusic(v=>!v);unlockAudio()}}>{music?'Mute music':'Enable music'}</button></div>}<ConnectionStatus lastSuccess={lastSuccess} onRetry={()=>void act('status')}/>{exploding&&<div className="daily-explosion" aria-hidden="true">✹</div>}<h1>Daily chain<span className="daily-title-dot">.</span></h1><p>{showPractice?'Two words to warm up.':'12 words in 15 seconds.'}</p><label className="daily-language">Language <select disabled={busy||active} value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="en">English</option><option value="es">Español</option><option value="de">Deutsch</option></select></label>
 {showPractice?<QuickPractice sound={sound} busy={busy||(!data&&!needsName&&!error)} onPlay={startDaily} onSkip={startDaily}/>:needsName||(!run&&choosingName)?<form onSubmit={e=>{e.preventDefault();void saveName()}} className="daily-name"><label htmlFor="daily-name">Player name</label><input id="daily-name" value={name} onChange={e=>setName(e.target.value)} maxLength={18} autoComplete="nickname" required/><button className="primary" disabled={busy||!name.trim()}>Save name and play</button></form>:!data?<p role="status">Loading today’s chain…</p>:!run?<section className="daily-ready panel"><Tile letter={data.letter}/><h2>Start with {data.letter.toUpperCase()}</h2><p>Start each new word with the last letter of the previous word.</p><button className="primary" disabled={busy} onClick={startDaily}>Play today’s chain</button><details className="daily-rules"><summary>Rules &amp; reset</summary><p>No repeats. Words with 6–8 letters add 1 second. Words with 9 or more add 2 seconds total. Five rejected words cost a life. You get two lives per run and two runs per language. A new chain starts at noon Eastern.</p></details></section>:active?<section className="daily-arena panel"><DailyStartCue cue={cue}/><div className="daily-status"><b>{run.words.length}/{dailyGoal} words</b><span aria-label={`${run.hearts} lives`}>{'♥'.repeat(run.hearts)}</span>{!staging&&<DailyTimer deadline={run.deadline} duration={run.deadline-run.started} offset={offset.current} sound={sound} music={music} onExpire={expire}/>}</div><div className="daily-prompt" key={accepted}>{bonusPopup}<span>{run.words.at(-1)?`${run.words.at(-1)} · next starts with`:"Start with"}</span><Tile letter={run.letter}/></div><WordDraft draft={draft}>{word=><form onSubmit={e=>{e.preventDefault();void act('word')}}><label htmlFor="daily-word">Your word</label><input ref={field} id="daily-word" readOnly={staging} value={word} onChange={e=>{if(sound&&e.target.value!==word){unlockAudio();typingSound()}setWord(e.target.value)}} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} maxLength={60} aria-describedby="daily-feedback" onKeyDown={e=>{if(e.key==='Enter'&&e.nativeEvent.isComposing)e.preventDefault()}}/><button className="primary" disabled={staging||busy||!word.trim()||expired}>{checkingWord?'Checking…':'Link word'}</button></form>}</WordDraft><span className="sr-only" role="status">{checkingWord?'Checking your word':''}</span><p id="daily-feedback" role="alert">{feedback}</p><small>{run.attempts} attempts left · leaving this page keeps the clock running</small><details><summary>End this attempt</summary><button className="secondary" onClick={()=>void act('finish')} disabled={busy}>Finish and save result</button></details></section>:<>{bonusPopup}<ResultCard elapsedMs={Math.max(0,(run.finished||run.deadline)-run.started)} solved={run.completed} dailyStreak={data?.playStreak?.enabled?data.playStreak.count:undefined} language={language} title={`Daily chain · ${run.date} · ${language.toUpperCase()}`} outcome={run.completed?'Chain complete!':data.canRetry?'Good effort.':'Good effort. Try tomorrow’s chain.'} count={run.words.length} finalWord={run.words.at(-1)||''} longestWord={run.words.reduce((a,b)=>b.length>a.length?b:a,'')} detail={`${run.hearts} lives left · ${run.words.map(()=> '🟩').join('')}${'⬜'.repeat(dailyGoal-run.words.length)}`} url={`https://finishtheword.com/daily?lang=${language}`}/></>}
 {run?.finished&&data?.canRetry&&!needsName&&<button type="button" className="secondary" disabled={busy} onClick={()=>void act('retry',{runId:run.id})}>Play again</button>}
 {run?.finished&&<MatchFeedback key={run.id} matchId={run.id} sessionId={session.current}/>} {data&&!needsName&&!showPractice&&(!choosingName||run)&&<PlayStreak compact value={data.playStreak} busy={busy} onToggle={enabled=>void act('streak',{enabled})}/>} {error&&<p className="error" role="alert">{error} <button className="text-button" onClick={()=>void act('status')}>Reconnect</button></p>}{run&&<section className="daily-trail"><h2>Your chain</h2><p className="word-learning-hint">Tap a word to explore its meaning. Come back to the chain when your attempt is over.</p><ol>{run.words.map(w=><li key={`${run.id}:${w}`}><WordMeaning word={w} language={language} live={active}/></li>)}</ol></section>}
 </section>;
}
