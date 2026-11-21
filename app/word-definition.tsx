'use client';
import {useEffect,useId,useState} from 'react';
import {ExternalLink,X} from 'lucide-react';
import {definitionLanguages,dictionarySearchUrl,type WordDefinition} from '../lib/definition-types';
import type {Language} from '../lib/daily';
export default function WordDefinitionPanel({word,language,live,onClose}:{word:string,language?:Language,live:boolean,onClose:()=>void}){
 const [selected,setSelected]=useState(language||'auto'),[spelling,setSpelling]=useState(''),[data,setData]=useState<WordDefinition|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const id=useId();
 useEffect(()=>{
  const controller=new AbortController();let current=true;setLoading(true);setError(false);
  const timeout=setTimeout(()=>controller.abort(),12000);
  const query=new URLSearchParams({word,language:selected,...(spelling?{spelling}:{})});
  void fetch(`/api/definitions?${query}`,{signal:controller.signal,credentials:'same-origin'}).then(async response=>{if(!response.ok)throw Error();const result=await response.json() as WordDefinition;if(current)setData(result)}).catch(()=>{if(current)setError(true)}).finally(()=>{clearTimeout(timeout);if(current)setLoading(false)});
  return()=>{current=false;clearTimeout(timeout);controller.abort();};
 },[word,selected,spelling,retry]);
 const unavailable=error||data?.status==='unavailable',choices=data?.languages||[],headword=spelling||data?.headword||word;
 return <section className="definition-panel" aria-label={`Meaning of ${word}`}>
  <div className="definition-heading"><h3>{headword}</h3><button type="button" className="definition-close" onClick={onClose} aria-label="Close definition"><X size={17} aria-hidden="true"/></button></div>
  {live&&<p className="definition-clock-note">The match clock keeps running.</p>}
  {choices.length>1&&<label className="definition-select" htmlFor={`${id}-language`}>Word language<select id={`${id}-language`} value={selected==='auto'?data?.language:selected} onChange={e=>{setSelected(e.target.value);setSpelling('')}}>{choices.map(lang=><option key={lang} value={lang}>{definitionLanguages[lang]}</option>)}</select></label>}
  {(data?.spellings.length||0)>1&&(selected==='auto'||selected===data?.language)&&<label className="definition-select" htmlFor={`${id}-spelling`}>Dictionary spelling<select id={`${id}-spelling`} value={headword} onChange={e=>setSpelling(e.target.value)}>{data!.spellings.map(form=><option key={form} value={form}>{form}</option>)}</select></label>}
  <div role="status" aria-live="polite">{loading?<p>Looking up {word}…</p>:unavailable?<p>Definitions are unavailable right now. You can still look this word up on Wiktionary.</p>:data?.status==='missing'?<p>No {definitionLanguages[data.language]} definition was found for this spelling. It’s still accepted by the game’s word list.</p>:null}</div>
  {!loading&&!error&&data&&<>
   {!!data.senses.length&&<><p className="definition-language">{definitionLanguages[data.language]} word · definitions in English</p><ol className="definition-senses">{data.senses.map((sense,i)=><li key={i}><span>{sense.partOfSpeech}</span><p>{sense.meaning}</p></li>)}</ol></>}
   {data.romanValue!==undefined&&<p className="definition-numeral">{data.senses.length?'Also a Roman numeral':'Roman numeral'}: <b>{data.word.toUpperCase()} = {data.romanValue.toLocaleString('en-US')}</b>. Roman numerals don’t earn Word Power or word streaks.</p>}
   {data.headword.toLowerCase()!==data.word&&<p className="definition-spelling-note">Played as <b>{data.word}</b>. The game ignores accents; the dictionary keeps the original spelling.</p>}
  </>}
  <div className="definition-links"><a href={!loading&&!error&&data?.status==='found'?data.sourceUrl:data?.searchUrl||dictionarySearchUrl(word)} target="_blank" rel="noopener noreferrer">{!loading&&!error&&data?.status==='found'?'Full dictionary entry':'Look up on Wiktionary'}<ExternalLink size={13} aria-hidden="true"/><span className="sr-only"> (opens a new tab)</span></a>{!loading&&unavailable&&<button type="button" className="text-button" onClick={()=>setRetry(n=>n+1)}>Try again</button>}</div>
  {!loading&&!error&&!!data?.senses.length&&<small className="definition-credit">Definitions from <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">Wiktionary contributors</a>, <a href={`https://creativecommons.org/licenses/by-sa/${data.license||'4.0'}/`} target="_blank" rel="noopener noreferrer">CC BY-SA {data.license||'4.0'}</a>. Selected meanings; formatting removed.</small>}
 </section>;
}
