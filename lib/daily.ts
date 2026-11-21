import {normalize,singleRoman} from './game';
export type Language='en'|'es'|'de';
export type DailyRun={analyticsTracked?:boolean,runNumber?:number,lastSeen?:number,reconnectUsed?:boolean,id:string,date:string,language:Language,letter:string,words:string[],hearts:number,attempts:number,deadline:number,started:number,finished?:number,completed:boolean};
export const dailyGoal=12;
export const timeBonusSeconds=(word:string)=>word.length>=9 ? 2 : Number(word.length>=6);
const easternClock = new Intl.DateTimeFormat('en-US', {
 timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
 hour: '2-digit', hourCycle: 'h23',
});
export function dailyDate(now = Date.now()) {
 const parts = Object.fromEntries(easternClock.formatToParts(now).map(({type,value}) => [type,Number(value)]));
 // Use UTC arithmetic on the local calendar date to handle month and year boundaries.
 const day = parts.day - (parts.hour < 12 ? 1 : 0);
 return new Date(Date.UTC(parts.year, parts.month - 1, day)).toISOString().slice(0,10);
}
export function dailyLetter(date:string,language:Language,step=0){let seed=2166136261;for(const c of `${date}:${language}:${step}`)seed=Math.imul(seed^c.charCodeAt(0),16777619);return 'aeorst'[Math.abs(seed)%6]}
export function newDaily(language:Language,now=Date.now(),countdown=false):DailyRun{const date=dailyDate(now),started=now+(countdown?3000:0);return{lastSeen:now,id:crypto.randomUUID(),date,language,letter:dailyLetter(date,language),words:[],hearts:2,attempts:5,deadline:started+15000,started,completed:false}}
function loseDailyLife(run:DailyRun,at:number){run.hearts--;if(!run.hearts){run.finished=at;return;}run.attempts=5;run.letter=dailyLetter(run.date,run.language,run.words.length+2-run.hearts);}
export function tickDaily(run:DailyRun,now=Date.now()){if(!run.finished&&now>=run.deadline){run.finished=run.deadline;run.hearts=0;}}
export function playDaily(run:DailyRun,raw:string,valid:(word:string)=>boolean,expectedDeadline:number,now=Date.now()){
 if(now<run.started)return 'Wait for GO.';
 tickDaily(run,now);if(run.finished)return 'This daily attempt is complete.';if(expectedDeadline!==run.deadline)return 'The turn changed. Check the starting letter.';
 const word=normalize(raw).slice(0,60),reason=singleRoman(word)?'Roman numerals need at least two letters.':!word.startsWith(run.letter)?`Start with ${run.letter.toUpperCase()}.`:run.words.includes(word)?'Already played. Try another word.':!valid(word)?'Not in this language’s word list. Try another.':'';
 if(reason){if(--run.attempts<=0)loseDailyLife(run,now);return reason;}
 run.deadline+=timeBonusSeconds(word)*1000;
 run.words.push(word);run.letter=word.at(-1)!;run.attempts=5;
 if(run.words.length>=dailyGoal){run.completed=true;run.finished=now;}
 return '';
}

export function reconnectDaily(run:DailyRun,now=Date.now()){run.lastSeen=now;}
