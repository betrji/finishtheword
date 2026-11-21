import {dailyDate,type Language} from './daily';

export type ChainCounts = {starts:number; retries:number; ended:number; solved:number; words:number};
type ChainDay = {players:number; languages:Partial<Record<Language,ChainCounts>>};
export type ChainAnalytics = {since:number; days:Record<string,ChainDay>};
const languages: Language[] = ['en','es','de'];
const empty = (): ChainCounts => ({starts:0,retries:0,ended:0,solved:0,words:0});
function add(total:ChainCounts, counts:ChainCounts) {
  for (const key of Object.keys(counts) as (keyof ChainCounts)[]) total[key] += counts[key];
}

export function chainBucket(tracking:ChainAnalytics,date:string,language:Language) {
  const bucket = tracking.days[date] ??= {players:0,languages:{}};
  return {bucket,counts:bucket.languages[language] ??= empty()};
}

export function dailyChainReport(tracking:ChainAnalytics|undefined, days:number, now:number) {
  const end = Date.parse(dailyDate(now));
  const totals = empty();
  const byLanguage = languages.map(language=>({language,...empty()}));
  const recent = Array.from({length:days},(_,index)=>{
    const date = new Date(end-index*86400000).toISOString().slice(0,10);
    const bucket = tracking?.days[date];
    const counts=empty();
    for (const language of byLanguage) {
      const languageCounts=bucket?.languages[language.language];
      if (languageCounts) { add(counts,languageCounts); add(language,languageCounts); }
    }
    add(totals,counts);
    return {date,players:bucket?.players??0,...counts};
  });
  return {since:tracking?.since??null,totals,byLanguage,recent};
}

export type DailyChainReport = ReturnType<typeof dailyChainReport>;
