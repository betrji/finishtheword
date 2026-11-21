// Server-only, read-only dictionary lookup. No game-state imports or writes.
import words from '../data/words.json';
import memberships from '../data/word-languages.json';
import originalSpellings from '../data/word-spellings.json';
import type {Language} from './daily';
import {dictionaryUrl,dictionarySearchUrl,type DefinitionSense,type WordDefinition} from './definition-types';

const spellings=originalSpellings as Record<'es'|'de',Record<string,string[]>>;
const normalize=(word:string)=>word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
function wordIndex(word:string){let lo=0,hi=words.length-1;while(lo<=hi){const mid=(lo+hi)>>>1;if(words[mid]===word)return mid;if(words[mid]<word)lo=mid+1;else hi=mid-1;}return -1;}
export function numeralValue(word:string){
 if(word.length<2||!/^(?=[mdclxvi]+$)m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/.test(word))return undefined;
 const values:Record<string,number>={i:1,v:5,x:10,l:50,c:100,d:500,m:1000};
 return [...word].reduce((sum,c,i)=>sum+(values[c]<(values[word[i+1]]||0)?-values[c]:values[c]),0);
}
export function lookupTarget(raw:string,language?:string,spelling?:string):Omit<WordDefinition,'status'|'senses'>|null{
 const clean=raw.trim();if(!clean||clean.length>60||!/^[\p{L}]+$/u.test(clean))return null;
 const word=normalize(clean),index=wordIndex(word),romanValue=numeralValue(word);
 if(index<0&&romanValue===undefined)return null;
 const bits=Number(memberships[index]||0);
 const languages=(['en','es','de'] as Language[]).filter((_,i)=>bits&(1<<i));
 if(language&&language!=='auto'&&!languages.includes(language as Language))return null;
 const selected=languages.includes(language as Language)?language as Language:languages[0]||'en';
 const variants=languages.length?(selected==='en'?[word]:spellings[selected][word]||[word]):[word.toUpperCase()];
 if(spelling&&!variants.includes(spelling))return null;
 // A played word is lowercased. Prefer the original German noun spelling when
 // both forms exist, and expose every spelling so no ambiguity is silently lost.
 const explicit=clean!==word?variants.find(form=>form===clean):undefined;
 const noun=selected==='de'?variants.find(form=>form[0]!==form[0].toLowerCase()):undefined;
 const headword=spelling||explicit||noun||variants[0];
 return {word,language:selected,languages,headword,spellings:variants,sourceUrl:dictionaryUrl(headword,selected),searchUrl:dictionarySearchUrl(headword),...(romanValue===undefined?{}:{romanValue})};
}

// Render only text, never upstream HTML. Formatting removal is disclosed in attribution.
export function definitionText(value:unknown){
 if(typeof value!=='string')return '';
 const named:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',hellip:'…'};
 return value.slice(0,30000).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(entity,code:string)=>{
  if(code[0]!=='#')return named[code]??entity;
  const n=code[1].toLowerCase()==='x'?parseInt(code.slice(2),16):parseInt(code.slice(1),10);
  return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';
 }).replace(/\s+/g,' ').trim().slice(0,900);
}
export function parseDefinitions(body:unknown,language:Language):DefinitionSense[]{
 if(!body||typeof body!=='object')return [];
 const entries=(body as Record<string,unknown>)[language];if(!Array.isArray(entries))return [];
 const senses:DefinitionSense[]=[];
 for(const entry of entries){
  if(!entry||typeof entry!=='object'||!Array.isArray(entry.definitions))continue;
  for(const item of entry.definitions){const meaning=definitionText(item?.definition);if(meaning&&!senses.some(s=>s.meaning===meaning))senses.push({partOfSpeech:definitionText(entry.partOfSpeech).slice(0,60),meaning});if(senses.length===3)return senses;}
 }
 return senses;
}
type LookupContent=Pick<WordDefinition,'status'|'senses'|'license'>;
const cache=new Map<string,{until:number,value:LookupContent}>(),pending=new Map<string,Promise<LookupContent>>();
let backoffUntil=0;
async function requestDefinition(headword:string,language:Language):Promise<LookupContent>{
 const key=`${language}:${headword}`,cached=cache.get(key);
 if(cached&&cached.until>Date.now())return cached.value;
 if(pending.has(key))return pending.get(key)!;
 if(pending.size>=4)return {status:'unavailable',senses:[]};
 const request=(async()=>{
  let value:LookupContent={status:'unavailable',senses:[]};
  try{
   if(Date.now()<backoffUntil)throw Error('Dictionary cooling down');
   const response=await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(headword)}`,{headers:{Accept:'application/json','User-Agent':'FinishTheWord/1.0 (https://finishtheword.com/about)'},signal:AbortSignal.timeout(4000),redirect:'manual'});
   if(response.status===404)value={status:'missing',senses:[]};
   else if(response.ok){const senses=parseDefinitions(await response.json(),language);value={status:senses.length?'found':'missing',senses};}
   else if(response.status===429||response.status===503){const retry=Number(response.headers.get('Retry-After'))||60;backoffUntil=Date.now()+Math.max(30,Math.min(300,retry))*1000;}
  }catch(error){console.warn('dictionary-primary',error instanceof Error?error.message:'request failed');}
  // Wikimedia can reject requests from shared hosting IPs. Use an independent
  // English dictionary endpoint before reporting a failed lookup to the player.
  if(value.status!=='found'&&language==='en'){
   try{
    const response=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(headword)}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(4000),redirect:'manual'});
    if(!response.ok)console.warn('dictionary-fallback-status',response.status);
    if(response.ok){
     const body=await response.json() as unknown;
     if(Array.isArray(body)){
      const senses:DefinitionSense[]=[];
      for(const entry of body)for(const meaning of Array.isArray(entry?.meanings)?entry.meanings:[])for(const item of Array.isArray(meaning?.definitions)?meaning.definitions:[]){
       const text=definitionText(item?.definition);
       if(text&&senses.length<3&&!senses.some(s=>s.meaning===text))senses.push({partOfSpeech:definitionText(meaning.partOfSpeech).slice(0,60),meaning:text});
      }
      if(senses.length)value={status:'found',senses,license:'3.0'};
     }
    }
   }catch(error){console.warn('dictionary-fallback',error instanceof Error?error.message:'request failed');}
  }
  // Transient failures must not make the explicit retry button a cached no-op.
  if(value.status==='unavailable')return value;
  if(cache.size>=200)cache.delete(cache.keys().next().value!);
  cache.set(key,{until:Date.now()+(value.status==='found'?86400000:value.status==='missing'?300000:15000),value});return value;
 })();
 pending.set(key,request);try{return await request;}finally{pending.delete(key);}
}
export async function getDefinition(target:NonNullable<ReturnType<typeof lookupTarget>>):Promise<WordDefinition>{
 if(!target.languages.length)return {...target,status:'roman',senses:[]};
 return {...target,...await requestDefinition(target.headword,target.language)};
}
