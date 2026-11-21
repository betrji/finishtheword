'use client';
import {useLayoutEffect,useRef,type InputHTMLAttributes,type RefObject} from 'react';
import {censorChat} from '../lib/chat-filter';

// The real input retains its value, caret, selection, composition and paste
// behavior. Only its visual text is replaced; validation receives the original.
export default function CensoredWordInput({inputRef,value,...props}:Omit<InputHTMLAttributes<HTMLInputElement>,'value'> & {inputRef:RefObject<HTMLInputElement|null>,value:string}){
 const cover=useRef<HTMLSpanElement>(null),masked=censorChat(value),censored=masked!==value;
 function sync(){if(cover.current&&inputRef.current)cover.current.scrollLeft=inputRef.current.scrollLeft;}
 useLayoutEffect(sync,[value,censored]);
 return <div className={'censored-word-input'+(censored?' is-censored':'')}>
  <input {...props} ref={inputRef} value={value} onScroll={e=>{props.onScroll?.(e);sync()}} onSelect={e=>{props.onSelect?.(e);sync()}}/>
  {censored&&<span ref={cover} className="censored-word-cover" aria-hidden="true">{masked}</span>}
 </div>;
}
