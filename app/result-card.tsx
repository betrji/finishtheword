'use client';
import {useEffect,useRef,useState} from 'react';
import {censorChat} from '../lib/chat-filter';
import {Check,Copy,Share2} from 'lucide-react';
import WordMeaning from './word-meaning';
import type {Language} from '../lib/daily';
import {trackEvent} from '../lib/telemetry';
type MatchChain={you:number,winner:number|null,playerCount:number,practice:boolean,words:{word:string,player:number}[]};
export type ResultDetails={title:string,outcome:string,finalWord:string,longestWord:string,longestLabel?:string,count:number,detail?:string,url?:string,language?:Language,match?:MatchChain,elapsedMs?:number,solved?:boolean,dailyStreak?:number};
export function resultRows(match:MatchChain){
 const moves=match.words.slice(-24).map(word=>word.player===match.you?'🟩':'⬜');
 return Array.from({length:Math.ceil(moves.length/8)},(_,i)=>moves.slice(i*8,i*8+8).join(''));
}
export function resultText(r:ResultDetails){
 if(r.elapsedMs!==undefined)return `${r.title}\n${r.solved?'Solved':'Linked'} ${r.count}/12 words · ${(r.elapsedMs/1000).toFixed(2)}s${r.dailyStreak!==undefined?`\n🔥 ${r.dailyStreak}-day streak`:''}\n${'🟩'.repeat(Math.min(12,r.count))}${'⬜'.repeat(Math.max(0,12-r.count))}\nCan you beat my chain?\n${r.url||'https://finishtheword.com/'}`;
 const match=r.match,rows=match?resultRows(match):[];
 const outcome=match&&match.winner===match.you?`${match.practice?'Practice win':'I got the last word!'} · ${match.playerCount} players`:r.outcome;
 const chain=rows.length?`\n${rows.join('\n')}\n🟩 My words · ⬜ ${match!.practice?'Bot':'Rivals'}${match!.words.length>24?' · Last 24 moves':''}\n`:'';
 return `${r.title}\n${outcome} · ${r.count} words${chain}\nFinal word: ${censorChat(r.finalWord)||'—'}\n${r.longestLabel||'Longest word'}: ${censorChat(r.longestWord)||'—'}${r.detail?'\n'+r.detail:''}${r.elapsedMs!==undefined?'\n'+(r.solved?'Solved in: ':'Time played: ')+(r.elapsedMs/1000).toFixed(2)+'s':''}${r.dailyStreak!==undefined?'\nDaily streak: '+r.dailyStreak+' days':''}\nCan you get the last word? Play with me:\n${r.url||'https://finishtheword.com/?from=result'}`;
}
export default function ResultCard(props:ResultDetails){
 const [notice,setNotice]=useState(''),[sharing,setSharing]=useState(false),[copied,setCopied]=useState(false),[nativeShare,setNativeShare]=useState(false),[fallback,setFallback]=useState(''),[shared,setShared]=useState(false),[inviting,setInviting]=useState(false),lock=useRef(false),copyButton=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>setNativeShare(typeof navigator.share==='function'),[]);
 const victory=!!props.match&&!props.match.practice&&props.match.winner===props.match.you;
 useEffect(()=>{
  if(!victory||shared)return;
  if(typeof IntersectionObserver==='undefined'){setInviting(true);return;}
  if(!copyButton.current)return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setInviting(true);observer.disconnect();}},{threshold:.6});
  observer.observe(copyButton.current);return()=>observer.disconnect();
 },[victory,shared]);
 const rows=props.match?resultRows(props.match):[];
 async function share(copy=false){
  if(lock.current)return;lock.current=true;setSharing(true);setNotice('');setFallback('');
  const text=resultText(props),native=!copy&&typeof navigator.share==='function';
  try{
   if(native)await navigator.share({title:props.title,text});else await navigator.clipboard.writeText(text);
   trackEvent('result_share');if(!native)setCopied(true);setShared(true);setNotice(native?'Shared.':'Copied! Paste it into a post or send it to a friend.');
  }catch(e){if((e as Error).name==='AbortError')setNotice('Sharing canceled.');else{setNotice('Select and copy your result below.');setFallback(text);}}
  finally{lock.current=false;setSharing(false);}
 }
 async function shareImage(){
  if(lock.current)return;lock.current=true;setSharing(true);
  try{
   const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d');if(!c)throw Error('Image unavailable');
   c.fillStyle='#235b4b';c.fillRect(0,0,1080,1350);c.strokeStyle='#c1d9c9';c.lineWidth=2;c.strokeRect(60,60,960,1230);c.textAlign='center';c.fillStyle='#fff8e8';
   c.font='28px sans-serif';c.fillText('FINISH THE WORD',540,160);c.font='bold 82px Georgia';c.fillText(props.match?'The last word.':'Daily chain.',540,310);
   c.font='30px sans-serif';c.fillText(props.title,540,395,900);c.font='bold 128px Georgia';c.fillText(`${props.count}${props.match?'':' / 12'}`,540,600);c.font='30px sans-serif';c.fillText('WORDS LINKED',540,665);
   c.font='bold 43px Georgia';c.fillText(props.solved?'Chain complete!':props.match?props.outcome:'Can you beat my chain?',540,790,900);
   if(props.elapsedMs!==undefined){c.font='36px sans-serif';c.fillText(`${props.solved?'Solved in':'Time played'} ${(props.elapsedMs/1000).toFixed(2)}s`,540,900)}
   if(props.dailyStreak!==undefined){c.font='36px sans-serif';c.fillText(`${props.dailyStreak}-day daily streak`,540,970)}
   c.fillStyle='#edc36e';for(let i=0;i<Math.min(props.count,12);i++)c.fillRect(190+i*60,1050,42,42);c.fillStyle='#fff8e8';c.font='32px sans-serif';c.fillText('finishtheword.com',540,1210);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image unavailable')),'image/png'));const file=new File([blob],'finish-the-word-result.png',{type:'image/png'});
   if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:props.title,text:resultText(props)});setNotice('Choose Instagram or another app from your share sheet.');}
   else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);setNotice('Image downloaded. Add it to an Instagram post or Story. Use Copy result for your caption.');}
   trackEvent('result_share');
  }catch(e){setNotice((e as Error).name==='AbortError'?'Sharing canceled.':'Could not create the image. Use Copy result instead.');}finally{lock.current=false;setSharing(false)}
 }
 const socialText=resultText(props),shareUrl=props.url||'https://finishtheword.com/';
 return <section className="result-card" aria-label="Result card">
  <span className="result-card-title">{props.title}</span><h3>{victory?'Flex on your friends.':props.outcome}</h3>
  <p className="result-share-intro">Copy your word chain. Challenge someone to beat you.</p>
  {!!rows.length&&<div className="result-chain" role="img" aria-label={`${Math.min(props.match!.words.length,24)} ${props.match!.words.length>24?'most recent ':''}words. Green is yours; white is ${props.match!.practice?'the bot’s':'your rivals’'}.`}>
   {rows.map((row,i)=><span key={i} aria-hidden="true">{row}</span>)}
   <small aria-hidden="true">Green: you · White: {props.match!.practice?'bot':'rivals'}{props.match!.words.length>24?' · Last 24 moves':''}</small>
  </div>}
  <div className="result-share-actions"><button ref={copyButton} className={`primary copy-result ${victory&&!shared&&inviting?'is-inviting':''}`} disabled={sharing} onClick={()=>void share(true)}>{copied?<Check size={19}/>:<Copy size={19}/>} {copied?'Copied!':'Copy result'}</button>{nativeShare&&<button className="secondary share-result" disabled={sharing} onClick={()=>void share()} aria-label="Share result"><Share2 size={18}/><span>Share</span></button>}</div>
  <div className="result-socials" aria-label="Share to social platforms"><a target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(socialText)}`} onClick={()=>trackEvent('result_share')}>X / Twitter</a><button className="instagram-result" disabled={sharing} onClick={()=>void shareImage()}>Instagram · image</button><a target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(socialText)}`}>WhatsApp</a><a target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}>Facebook</a><a target="_blank" rel="noopener noreferrer" href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(props.title+' · '+props.count+' words')}`}>Reddit</a>
   {props.elapsedMs!==undefined&&<a target="_blank" rel="noopener noreferrer"
    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
    onClick={()=>{trackEvent('result_share');setNotice('Use Copy result to paste your score and time into the LinkedIn post.')}}>LinkedIn</a>}
  </div>
  {props.elapsedMs!==undefined&&<div className="daily-result-stats"><div><span>{props.solved?'Solved in':'Time played'}</span><b>{(props.elapsedMs/1000).toFixed(2)}s</b></div><div><span>Daily streak</span><b>{props.dailyStreak!==undefined?`${props.dailyStreak} ${props.dailyStreak===1?'day':'days'}`:'Tracking off'}</b></div></div>}
  <small className="result-notice" role="status">{notice}</small>
  {fallback&&<label className="result-copy-fallback">Your result<textarea aria-label="Result to copy" readOnly rows={8} value={fallback} onFocus={event=>event.currentTarget.select()}/></label>}
  <dl><div><dt>Final word</dt><dd>{props.finalWord?<WordMeaning word={props.finalWord} language={props.language}/>: '—'}</dd></div><div><dt>{props.longestLabel||'Longest word'}</dt><dd>{props.longestWord?<WordMeaning word={props.longestWord} language={props.language}/>: '—'}</dd></div></dl>
  {(props.finalWord||props.longestWord)&&<p className="word-learning-hint">Tap a word to explore its meaning.</p>}<p>{props.count} words{props.detail?` · ${props.detail}`:''}</p>
 </section>;
}
