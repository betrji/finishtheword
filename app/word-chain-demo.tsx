'use client';
import {ArrowDown,ArrowRight,BookOpen,Heart,RotateCw,Timer} from 'lucide-react';
import Tile from './tile';
import {useState,type CSSProperties} from 'react';

const examples=[['APPLE','ECHO'],['ECHO','ORBIT'],['ORBIT','TIGER'],['TIGER','RIVER']];

export default function WordChainDemo({onPractice}:{onPractice:()=>void}){
 const [example,setExample]=useState(0),[previous,reply]=examples[example];
 return <div className="chain-preview">
  <div className="chain-preview-board" aria-label="An example word chain">
   <div className="chain-preview-top"><span>How the chain works</span><div aria-label="Two hearts"><Heart size={17} fill="currentColor"/><Heart size={17} fill="currentColor"/></div></div>
   <div className="chain-preview-scene" key={example} aria-hidden="true">
    <div className="chain-preview-row"><span>Last word</span><div className="chain-preview-tiles" style={{'--tile-count':previous.length} as CSSProperties}>{previous.split('').map((letter,i)=><Tile key={i} letter={letter} className={i===previous.length-1?'tile-accent':''} style={{'--tile-index':i} as CSSProperties}/>)}</div></div>
    <div className="chain-preview-link"><span className="chain-handoff"><ArrowDown size={18}/></span><span>Take the <b>{previous.at(-1)}</b>. Make it yours.</span></div>
    <div className="chain-preview-row chain-preview-answer"><span>Your reply</span><div className="chain-preview-tiles" style={{'--tile-count':reply.length} as CSSProperties}>{reply.split('').map((letter,i)=><Tile key={i} letter={letter} className={i===0?'tile-accent':''} style={{'--tile-index':i+5} as CSSProperties}/>)}</div></div>
    <div className="chain-preview-next"><span>Next up</span><Tile letter={reply.at(-1)!}/><ArrowRight size={18}/><span>A new word. Your move.</span></div>
   </div>
   <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{previous} ends in {previous.at(-1)}. Play {reply}. The next word starts with {reply.at(-1)}.</p>
   <div className="chain-preview-rule"><span><Timer size={15}/> Beat the clock. No repeats.</span><button type="button" onClick={()=>setExample(n=>(n+1)%examples.length)} aria-label="Show the next example word chain"><RotateCw size={15}/> Next example</button></div>
  </div>
  <button className="chain-preview-practice" onClick={onPractice}><BookOpen size={20}/><span><b>Try a guided round</b><small>Learn the game in four quick steps</small></span><ArrowRight size={19}/></button>
 </div>
}
