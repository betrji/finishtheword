// Presentation-only moderation for chat and live typing. Never alter submitted
// game answers or dictionary validation: masked drafts are not game answers.
// Keep explicit whole-word variants: broad substring matching censors innocent names/words.
const blocked=[
 'ass','asses','asshole','assholes','arse','arsehole','arseholes','bastard','bastards',
 'bitch','bitches','bitching','bollocks','bullshit','bullshitting','crap','crappy',
 'cock','cocks','cocksucker','cocksuckers','cunt','cunts','damn','damned','goddamn',
 'dick','dicks','dickhead','dickheads','douche','douchebag','douchebags','dumbass','dumbasses',
 'fuck','fucks','fucked','fucker','fuckers','fucking','fuckin','fuckoff','motherfucker','motherfuckers','motherfucking',
 'piss','pissed','pissing','prick','pricks','pussy','pussies','shit','shits','shitty','shitting','shithead','shitheads',
 'slut','sluts','twat','twats','wanker','wankers','whore','whores',
 'nigger','niggers','nigga','niggas','faggot','faggots','fag','fags','dyke','dykes',
 'retard','retards','retarded','tranny','trannies','kike','kikes','spic','spics',
 'chink','chinks','gook','gooks','wetback','wetbacks','paki','pakis','coon','coons',
 // Explicit Spanish and German variants, keeping whole-word boundaries.
 'mierda','mierdas','joder','jodido','jodida','gilipollas','cabron','cabrones',
 'puta','putas','puto','putos','pendejo','pendeja','pendejos','pendejas',
 'scheisse','scheiße','scheiss','arschloch','arschlocher','wichser','fotze','hurensohn'
];
const leet:Record<string,string>={a:'[a@4]',b:'[b8]',e:'[e3]',i:'[i1!|]',o:'[o0]',s:'[s$5]',t:'[t7]'};
const lookalikes:Record<string,string>={'а':'a','ɑ':'a','е':'e','ε':'e','о':'o','ο':'o','р':'p','с':'c','х':'x','у':'y','і':'i','ι':'i','ј':'j','ѕ':'s','ӏ':'l','к':'k'};
function pattern(word:string){
 // Longest forms first; require real word boundaries, including for non-English text.
 const gap=word.length>=4?'[\\s._~*\\-]{0,3}':'';
 return Array.from(word,c=>(leet[c]||c)+'+').join(gap);
}
const matcher=new RegExp('(?<![\\p{L}\\p{N}])(?:'+blocked.sort((a,b)=>b.length-a.length).map(pattern).join('|')+')(?![\\p{L}\\p{N}])','gu');
export function censorChat(text:string):string{
 let normalized='',offset=0;
 const positions:{start:number,end:number}[]=[];
 for(const original of text){
  const end=offset+original.length;
  for(const char of original.normalize('NFKD').toLowerCase()){
   if(/[\p{M}\p{Cf}]/u.test(char))continue;
   const value=lookalikes[char]||char;normalized+=value;
   for(let i=0;i<value.length;i++)positions.push({start:offset,end});
  }
  offset=end;
 }
 const masked=new Uint8Array(text.length);matcher.lastIndex=0;
 for(const match of normalized.matchAll(matcher)){
  const start=positions[match.index!].start,end=positions[match.index!+match[0].length-1].end;
  masked.fill(1,start,end);
 }
 let output='';offset=0;
 for(const char of text){output+=masked[offset]?'*':char;offset+=char.length;}
 return output;
}
