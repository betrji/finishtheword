'use client';
import {useEffect,useRef,type RefObject} from 'react';
export function trapDialogKey(event:KeyboardEvent,elements:HTMLElement[],active:Element|null,onClose:()=>void){
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();return;}
 if(event.key!=='Tab')return;
 if(!elements.length){event.preventDefault();return;}
 const first=elements[0],last=elements.at(-1)!;
 if(event.shiftKey&&(active===first||!elements.includes(active as HTMLElement))){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&(active===last||!elements.includes(active as HTMLElement))){event.preventDefault();first.focus();}
}
export function useDialogFocus(ref:RefObject<HTMLElement|null>,onClose:()=>void,active=true){
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{if(!active)return;const element=ref.current;if(!element)return;const previous=document.activeElement as HTMLElement|null;
  const focusables=()=>Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')).filter(e=>e.getClientRects().length>0);
  (focusables()[0]||element).focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>trapDialogKey(e,focusables(),document.activeElement,()=>close.current());element.addEventListener('keydown',key);
  return()=>{element.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus({preventScroll:true})};
 },[ref,active]);
}
