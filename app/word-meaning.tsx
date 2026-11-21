'use client';
import {lazy,Suspense,useId,useRef,useState,type ReactNode} from 'react';
import {censorChat} from '../lib/chat-filter';
import {BookOpen} from 'lucide-react';
import type {Language} from '../lib/daily';
const DefinitionPanel=lazy(()=>import('./word-definition'));
export default function WordMeaning({word,language,live=false,children}:{word:string,language?:Language,live?:boolean,children?:ReactNode}){
 const [open,setOpen]=useState(false),details=useRef<HTMLDetailsElement>(null),id=useId();
 function close(){if(details.current){details.current.open=false;details.current.querySelector('summary')?.focus({preventScroll:true});}setOpen(false);}
 if(censorChat(word)!==word)return <span className="word-meaning word-masked" aria-label="Filtered word"><b>{censorChat(word)}</b></span>;
 return <details className="word-meaning" data-word-meaning ref={details} onToggle={e=>setOpen(e.currentTarget.open)} onKeyDown={e=>{if(e.key==='Escape'&&details.current?.open){e.preventDefault();e.stopPropagation();close();}}}>
  <summary aria-label={`Definition of ${word}`} aria-controls={id}>{children||<b>{word}</b>}<BookOpen size={15} aria-hidden="true"/></summary>
  <div id={id} className="word-meaning-body">{open&&<Suspense fallback={<p role="status">Looking up {word}…</p>}><DefinitionPanel key={`${word}:${language||'auto'}`} word={word} language={language} live={live} onClose={close}/></Suspense>}</div>
 </details>;
}
