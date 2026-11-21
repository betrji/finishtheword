import {chainBucket} from '../../../lib/daily-analytics';
import {env} from 'cloudflare:workers';
import words from '../../../data/words.json';
import languages from '../../../data/word-languages.json';
import {reconnectDaily,dailyDate,dailyLetter,newDaily,playDaily,tickDaily,type Language} from '../../../lib/daily';
import {isAdministratorProfile,enablePlayStreak,recordPlayDay,playStreakSummary,type State} from '../../../lib/game';
const headers={'Cache-Control':'private, no-store'};
const languageBits = {en:1,es:2,de:4};
function validDailyWord(word: string, language: Language) {
 let low = 0, high = words.length - 1;
 while (low <= high) {
  const middle = (low + high) >>> 1;
  const entry = words[middle];
  if (entry === word) return (Number(languages[middle]) & languageBits[language]) !== 0;
  if (entry < word) low = middle + 1;
  else high = middle - 1;
 }
 return false;
}
export async function POST(req:Request){
 const fail=(error:string,status=400)=>Response.json({error},{status,headers});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return fail('Same-origin requests only.',403);
 try{
  const raw=await req.text();if(raw.length>1024)return fail('Request too large.',413);const input=JSON.parse(raw);
  if(!['status','start','word','finish','streak','retry'].includes(input.action)||!['en','es','de'].includes(input.language))return fail('Choose a language and action.');
  const token=req.headers.get('cookie')?.match(/(?:^|; )arena_player=([a-f0-9-]+)/)?.[1]||req.headers.get('X-Arena-Session')||'';
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(token))return fail('Choose a player name first.',401);
  for(let retry=0;retry<12;retry++){
   const row=await env.DB!.prepare("SELECT revision,data FROM arena WHERE id='lobby'").first<{revision:number,data:string}>();if(!row)return fail('Choose a player name first.',401);
   const state:State=JSON.parse(row.data),profile=state.profiles?.[token];if(!profile||profile.agent)return fail('Choose a player name first.',401);
   if(profile.ban)return fail('This player profile has been banned by the administrator.',403);
   if(input.action==='streak'){if(typeof input.enabled!=='boolean')return fail('Choose whether to enable your play streak.');enablePlayStreak(profile,input.enabled);}
   const now=Date.now(),language=input.language as Language,date=dailyDate(now);profile.daily??={};let run=profile.daily[language];
   if(run&&run.date!==date)run=undefined;
   const unlimited=isAdministratorProfile(state,profile);
   const canRetry=()=>unlimited||(run?.runNumber??1)<2;
   if(input.action==='retry'){
    if(!canRetry())return fail('Both daily runs are used. Try again after noon Eastern.',403);
    if(!run?.finished||run.id!==input.runId)return fail('Refresh your result before retrying.',409);
   }
   // Most daily refreshes are read-only. Only expiry or explicit actions write.
   if(input.action==='status'&&(!run||run.finished||now<run.deadline))return Response.json({canRetry:canRetry(),playStreak:playStreakSummary(profile,now),run:run||null,date,letter:dailyLetter(date,language),now,message:''},{headers});
   const previousRun=run;
   const wasFinished=!!run?.finished;
   if((input.action==='start'&&!run)||input.action==='retry'){if(state.queue.some(p=>p.id===token)||state.matches.some(m=>m.winner===null&&m.players.some(p=>p.id===token)))return fail('Finish your current match or leave the queue first.',409);const runNumber=run?(run.runNumber??1)+1:1;run=profile.daily[language]={...newDaily(language,now,input.countdown===true),runNumber};}
   let message='';if(run){const previousDeadline=run.deadline;reconnectDaily(run,now);const reconnectedDeadline=run.deadline;tickDaily(run,now);if(input.action==='word')message=playDaily(run,String(input.word||''),w=>validDailyWord(w,language),input.deadline===previousDeadline?reconnectedDeadline:input.deadline,now);if(input.action==='finish'&&!run.finished)run.finished=now;}
   if(run&&!unlimited&&run!==previousRun){
    const tracking=state.dailyChainAnalytics??={since:now,days:{}};
    const {bucket,counts}=chainBucket(tracking,date,language);
    counts.starts++;
    if(input.action==='retry')counts.retries++;
    if(profile.dailyAnalyticsDate!==date){bucket.players++;profile.dailyAnalyticsDate=date;}
    run.analyticsTracked=true;
    const cutoff=new Date(Date.parse(date)-89*86400000).toISOString().slice(0,10);
    for(const day of Object.keys(tracking.days))if(day<cutoff)delete tracking.days[day];
   }
   if(run?.finished){
    recordPlayDay(profile,now);
    if(!unlimited&&run.analyticsTracked&&!wasFinished&&state.dailyChainAnalytics){
     const {counts}=chainBucket(state.dailyChainAnalytics,run.date,language);
     counts.ended++;
     counts.words+=run.words.length;
     if(run.completed)counts.solved++;
    }
   }
   const updated=await env.DB!.prepare("UPDATE arena SET data=?,revision=revision+1 WHERE id='lobby' AND revision=?").bind(JSON.stringify(state),row.revision).run();if(!updated.meta.changes)continue;
   return Response.json({canRetry:canRetry(),playStreak:playStreakSummary(profile,now),run:run||null,date,letter:dailyLetter(date,language),now,message},{headers});
  }return fail('Daily challenge is busy. Please retry.',503);
 }catch{return fail('Could not reach the daily challenge. Try again.',503)}
}
