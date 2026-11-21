import type {CasualPower,PowerKind} from './casual-power';
import type {Avatar} from './avatar';
export type Player={queuedAt?:number,rating?:number,agent?:boolean,playerCount?:number,mode?:'ranked'|'casual'|'agents',id:string,name:string,seen:number,avatar?:Avatar};
export type WordStreak={current:number,best:number};
export type Match={casualPower?:CasualPower,wordReceipts?:{id:string,player:number,message:string}[],connection?:{seen:number[],used:boolean[]},reconnect?:ReconnectPause,rematchOf?:string,rematch?:{ready:number[],startAt?:number,nextId?:string},streaks?:WordStreak[],letterChoice?:{id:string,chooser:number,options:string[],startsAt:number,deadline:number},prefixKind?:'letter'|'bonus'|'suffix',custom?:boolean,placements?:number[],forfeitedPlayers?:number[],alphabetBonusUsed?:boolean[],historySaved?:boolean,forfeited?:number,ratingExempt?:boolean,mode?:'ranked'|'casual'|'agents',ratingChanges?:{before:number,after:number,delta:number,base?:number,bonus?:number,bonusPercent?:number,wordPowerPercent?:number,streakPercent?:number,wordCount?:number,unlocks?:string[]}[],id:string,players:Player[],turn:number,hearts:number[],mistakes:number,letter:string,words:{word:string,player:number}[],deadline:number,winner:number|null,created:number,practice:boolean,completedTurns?:number,turnDuration?:number,turnStartsAt?:number,prefix?:string,explosion?:{id:string,player:number,at:number},difficulty?:'easy'|'normal'|'hard',drafts?:string[],botPlan?:{word:string,start:number,step:number,deadline:number}};
export type Room={id?:string,visibility?:'private'|'public',code:string,hostId:string,capacity:number,players:Player[],created:number,matchId?:string};
export type ChatMessage={id:string,at:number,publicId:string,name:string,agent:boolean,text:string};
export type State={dailyChainAnalytics?:import('./daily-analytics').ChainAnalytics,administrator?:{publicId:string,ownerUserId:string},moderationLog?:import('./moderation').ModerationEntry[],feedback?:import('./feedback').GameFeedback[],analytics?:{ccu?:{since:number,lastAt:number,samples:{at:number,count:number}[],peaks:Record<string,number>},growthDays?:Record<string,GrowthDay>,since:number,days:Record<string,{started:number,completed:number}>},boards?:Record<string,ChatMessage[]>,rooms?:Room[],leaderboardReset?:number,queue:Player[],matches:Match[],profiles?:Record<string,RankedProfile>};
export function createMatch(a:Player,b:Player,practice=false):Match{return createGroupMatch([a,b],practice)}
export function createGroupMatch(players:Player[],practice=false,mode:Match['mode']=players[0]?.mode||'ranked',custom=false):Match{if(players.length<2||players.length>5||new Set(players.map(p=>p.id)).size!==players.length)throw Error('A match needs 2–5 unique players.');const shuffled=[...players];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}const m:Match={mode,custom,id:crypto.randomUUID(),players:shuffled,turn:0,hearts:players.map(()=>2),placements:players.map(()=>0),alphabetBonusUsed:players.map(()=>false),mistakes:5,letter:'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random()*26)],words:[],deadline:Date.now()+15000,winner:null,created:Date.now(),practice,completedTurns:0};beginLetterChoice(m);return m;}
export function nextLiving(m:Match,from=m.turn){for(let step=1;step<=m.players.length;step++){const index=(from+step)%m.players.length;if(m.hearts[index]>0)return index;}return from;}
export function finishIfLast(m:Match){const living=m.hearts.map((h,i)=>h>0?i:-1).filter(i=>i>=0);if(living.length===1){m.winner=living[0];delete m.letterChoice;m.placements??=m.players.map(()=>0);m.placements[living[0]]=1;return true;}return false;}
export function forfeitPlayer(m:Match,player:number){if(m.winner!==null||player<0||m.hearts[player]<=0)return;resetWordStreak(m,player);m.forfeitedPlayers??=[];m.forfeitedPlayers.push(player);m.forfeited=player;m.placements??=m.players.map(()=>0);m.placements[player]=m.hearts.filter(h=>h>0).length;m.hearts[player]=0;if(finishIfLast(m))return;const wasTurn=m.turn===player;if(wasTurn){m.completedTurns=(m.completedTurns||0)+1;m.turn=nextLiving(m,player);}if(m.letterChoice){if(wasTurn||m.letterChoice.chooser===player)beginLetterChoice(m);}else if(wasTurn)beginLetterChoice(m);}

const pairs='ab ac ad af ag al am an ap ar as at au av ba be bi bl bo br bu ca ce ch ci cl co cr cu da de di do dr du ea ec ed ef el em en ep er es et ev ex fa fe fi fl fo fr fu ga ge gi gl go gr gu ha he hi ho hu ia ic id ig il im in ir is it ja je jo ju ka ke ki kl kn ko kr ku la le li lo lu ma me mi mo mu na ne ni no nu ob oc od of ol om on op or os ot ou ov ow ox pa pe ph pi pl po pr pu qu ra re ri ro ru sa sc se sh si sk sl sm sn so sp st su sw ta te th ti to tr tu tw ul un up ur us va ve vi vo vu wa we wh wi wo wr xa xe xi xy ya ye yo yu za ze zi zo'.split(' ');
// Map recognizable endings to approachable starting prompts; never blindly trim a word.
const suffixPrompts=[['tion','ti'],['sion','si'],['ness','ne'],['ment','me'],['less','le'],['able','ab'],['ance','an'],['ence','en'],['ship','sh'],['hood','ho'],['ward','wa'],['ing','in'],['ous','ou'],['ant','an'],['ent','en'],['est','es'],['ity','it'],['age','ag'],['ate','at'],['ion','io'],['ist','is'],['ure','ur'],['ful','fu'],['ish','is'],['ive','iv'],['dom','do'],['ary','ar'],['ory','or'],['ly','ly'],['ed','ed'],['er','er'],['en','en'],['es','es'],['al','al'],['or','or'],['ic','ic']];
let prefixWords=new Map<string,string[]>();
export function configurePrefixes(words:string[]){prefixWords=new Map();for(const w of new Set(words)){if(w.length<2||w.length>12)continue;for(let n=1;n<=Math.min(4,w.length);n++){const p=w.slice(0,n),list=prefixWords.get(p)||[];list.push(w);prefixWords.set(p,list)}}}
function availablePrefix(prefix:string,seen:Set<string>){let count=0;for(const word of prefixWords.get(prefix)||[])if(!seen.has(word)&&++count>=5)return true;return false;}
export function durationForTurns(turns:number,players=2){return Math.max(5000,15000-Math.floor(turns/players)*1000)}
export function choosePrefix(letter:string,used:string[],random=Math.random){if(random()>=.17)return letter;const seen=new Set(used),options=pairs.filter(p=>p[0]===letter&&availablePrefix(p,seen));return options.length?options[Math.floor(random()*options.length)]:letter;}
export function chooseNextPrefix(word:string,used:string[],random=Math.random){const roll=random(),letter=word.slice(-1),seen=new Set(used);if(roll<.08){const options=suffixPrompts.filter(([ending,prefix])=>word.length>ending.length&&word.endsWith(ending)&&availablePrefix(prefix,seen)).map(([,prefix])=>prefix);if(options.length)return {prefix:options[Math.floor(random()*options.length)],kind:'suffix' as const};}else if(roll<.25){const options=pairs.filter(p=>p[0]===letter&&availablePrefix(p,seen));if(options.length)return {prefix:options[Math.floor(random()*options.length)],kind:'bonus' as const};}return {prefix:letter,kind:'letter' as const};}
export function chooserWeights(m:Match){const alive=m.players.map((_,i)=>i).filter(i=>m.hearts[i]>0),top=Math.max(...alive.map(i=>m.players[i].rating??1000));return alive.map(player=>({player,weight:!m.practice&&!m.custom&&(m.mode||'ranked')==='ranked'?1+Math.min(2,Math.max(0,top-(m.players[player].rating??1000))/400):1}));}
export function beginLetterChoice(m:Match,pause=0,random=Math.random){delete m.reconnect;if(m.winner!==null)return;const weights=chooserWeights(m);let pick=random()*weights.reduce((sum,p)=>sum+p.weight,0),chooser=weights.at(-1)!.player;for(const item of weights){pick-=item.weight;if(pick<0){chooser=item.player;break;}}
const seen=new Set(m.words.map(w=>w.word)),letters=Array.from('abcdefghijklmnopqrstuvwxyz').filter(l=>availablePrefix(l,seen)),options:string[]=[];
while(options.length<4&&letters.length)options.push(letters.splice(Math.floor(random()*letters.length),1)[0]);
// Unit fixtures without a dictionary still have a usable selection. Production supplies the dictionary.
if(!prefixWords.size)for(const l of 'aeorst')if(options.length<4&&!options.includes(l))options.push(l);
if(options.length<4){beginTurn(m,pause);return;}
const startsAt=Date.now()+pause;m.letterChoice={id:crypto.randomUUID(),chooser,options,startsAt,deadline:startsAt+8000};m.turnStartsAt=startsAt;m.deadline=startsAt+8000;m.turnDuration=durationForTurns(m.completedTurns||0,m.players.length);m.mistakes=attemptsForWords(m.words.length);m.drafts=m.players.map(()=>'');delete m.botPlan;
}
export function chooseLetter(m:Match,player:number,choiceId:string,letter:string,now=Date.now()){const choice=m.letterChoice;if(m.winner!==null||!choice||choice.id!==choiceId)return 'This letter choice has ended.';if(player!==choice.chooser||m.hearts[player]<=0)return 'Wait for the chosen player to pick.';if(now<choice.startsAt)return 'Wait for the next round.';if(now>=choice.deadline)return 'This letter choice has ended.';if(!choice.options.includes(letter))return 'Choose one of the four letters.';m.letter=letter;beginTurn(m,0,letter);return '';}
export function advanceLetterChoice(m:Match,now=Date.now()){const choice=m.letterChoice;if(!choice||m.winner!==null)return;if(now>=choice.deadline||(m.players[choice.chooser].id==='bot'&&now>=choice.startsAt+1000)){const letter=choice.options[Math.floor(Math.random()*choice.options.length)];m.letter=letter;beginTurn(m,0,letter);}}
export function attemptsForWords(words:number){return Math.max(1,5-Math.floor(words/15))}
export const powerKinds = ['attempt', 'extraTime', 'lessTime'] as const satisfies readonly PowerKind[];
export function rollPower(length: number, random = Math.random) {
  const chance = Math.min(5, Math.max(0, length - 5)) * 15;
  if (chance && random() * 100 < chance) return powerKinds[Math.floor(random() * powerKinds.length)];
}
export function hasCasualPower(m: Match) {
 return !m.practice && (m.mode === 'casual' || !!m.custom);
}
function awardCasualPower(m: Match, word: string) {
 if (!hasCasualPower(m) || roman(word)) return;
 const kind = rollPower(Array.from(word).length);
 if (!kind) return;
 const power: CasualPower = m.casualPower ??= {held: m.players.map(() => ({})), queued: m.players.map(() => ({}))};
 const held = power.held[m.turn];
 if ((held[kind] ?? 0) >= 2) return;
 held[kind] = (held[kind] ?? 0) + 1;
 power.earned = {player: m.turn, kind, wordCount: m.words.length};
}
export function useCasualPower(m: Match, player: number, kind: PowerKind, turnId: string) {
 const power = m.casualPower;
 if (!hasCasualPower(m) || m.winner !== null || player < 0 || player !== m.turn ||
     m.letterChoice || m.reconnect || Date.now() < (m.turnStartsAt ?? 0) || Date.now() >= m.deadline) {
  return 'Power-ups can be used during your turn.';
 }
 if (!power?.held[player]?.[kind]) return 'You do not have that power-up.';
 if (power.usedTurn === turnId) return 'You already used a power-up this turn.';
 const target = kind === 'extraTime' ? player : nextLiving(m);
 if (power.queued[target][kind]) return 'That effect is already queued.';
 power.held[player][kind] = power.held[player][kind]! - 1;
 power.queued[target][kind] = true;
 power.usedTurn = turnId;
 return '';
}
function applyCasualPower(m: Match) {
 const power = m.casualPower;
 if (!power || !hasCasualPower(m)) return;
 delete power.applied;
 const effects = power.queued[m.turn];
 if (!Object.keys(effects).length) return;
 const duration = Math.max(2000, (m.turnDuration ?? 15000) + (effects.extraTime ? 3000 : 0) - (effects.lessTime ? 3000 : 0));
 m.turnDuration = duration;
 m.deadline = (m.turnStartsAt ?? Date.now()) + duration;
 if (effects.attempt) m.mistakes = Math.max(1, m.mistakes - 1);
 power.applied = {player: m.turn, effects};
 power.queued[m.turn] = {};
}
export function beginTurn(m:Match,pause=0,exactLetter?:string){delete m.reconnect;delete m.letterChoice;m.turnDuration=durationForTurns(m.completedTurns||0,m.players.length);m.turnStartsAt=Date.now()+pause;m.deadline=m.turnStartsAt+m.turnDuration;const next=exactLetter?{prefix:exactLetter,kind:'letter' as const}:m.words.length?chooseNextPrefix(m.words.at(-1)!.word,m.words.map(w=>w.word)):{prefix:m.letter,kind:'letter' as const};m.prefix=next.prefix;m.prefixKind=next.kind;m.mistakes=attemptsForWords(m.words.length);applyCasualPower(m);m.drafts=m.players.map(()=>'');delete m.botPlan;}
export function loseHeart(m:Match){if(m.winner!==null||m.letterChoice)return;resetWordStreak(m,m.turn);m.drafts=m.players.map(()=>'');delete m.botPlan;m.explosion={id:crypto.randomUUID(),player:m.turn,at:Date.now()};m.hearts[m.turn]--;m.completedTurns=(m.completedTurns||0)+1;if(m.hearts[m.turn]<=0){m.placements??=m.players.map(()=>0);m.placements[m.turn]=m.hearts.filter(h=>h>0).length+1;}if(!finishIfLast(m)){m.turn=nextLiving(m);beginLetterChoice(m,1400)}}
export function play(m:Match,word:string,valid:boolean){if(m.winner!==null)return 'This match has ended.';if(Date.now()<(m.turnStartsAt||0))return 'Next turn starts after the explosion.';if(m.letterChoice)return 'Choose the starting letter first.';const rejection=singleRoman(word)?'Roman numerals need at least two letters.':!word.startsWith(m.prefix||m.letter)?'Start with '+(m.prefix||m.letter).toUpperCase():m.words.some(w=>w.word===word)?'That word has already been played.':!valid?'Not in this word list. Try another.':'';if(rejection){resetWordStreak(m,m.turn);m.mistakes=Math.min(m.mistakes,attemptsForWords(m.words.length))-1;if(m.mistakes<=0)loseHeart(m);return rejection;}recordWordStreak(m,m.turn,word);m.words.push({word,player:m.turn});awardAlphabetBonus(m,m.turn);awardCasualPower(m,word);m.letter=word.slice(-1);m.turn=nextLiving(m);m.completedTurns=(m.completedTurns||0)+1;beginTurn(m);return '';}
export const normalize=(w:string)=>w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').trim();
export const singleRoman=(w:string)=>/^[ivxlcdm]$/.test(w);
export const roman=(w:string)=>w.length>=2&&/^(?=[mdclxvi]+$)m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/.test(w);

// Fixed human-like speeds: bots feel the same rising time pressure as players.
export const botLevels={easy:{think:3200,step:310,lapse:.28,maxLength:6},normal:{think:2300,step:210,lapse:.14,maxLength:8},hard:{think:1500,step:150,lapse:.06,maxLength:10}};
export function tickBot(m:Match,candidates:string[],now=Date.now(),random=Math.random){
 if(!m.practice||m.winner!==null||m.letterChoice||m.players[m.turn].id!=='bot'||now<(m.turnStartsAt||0)||now>=m.deadline)return;
 const level=m.difficulty||'normal',settings=botLevels[level];
 if(!m.botPlan||m.botPlan.deadline!==m.deadline){
  const used=new Set(m.words.map(w=>w.word));
  const choices=candidates.filter(w=>!singleRoman(w)&&w.startsWith(m.prefix||m.letter)&&!used.has(w)&&w.length<=settings.maxLength);
  // Persist a missed turn too, so frequent polling cannot reroll it into a success.
  const stuck=!choices.length||random()<settings.lapse;
  m.botPlan={word:stuck?'':choices[Math.floor(random()*choices.length)],start:now+settings.think*(.8+random()*.4),step:settings.step*(.8+random()*.4),deadline:m.deadline};
 }
 const plan=m.botPlan;if(!plan.word)return;
 const count=Math.max(0,Math.floor((now-plan.start)/plan.step));
 m.drafts??=m.players.map(()=>'');m.drafts[m.turn]=plan.word.slice(0,count);
 if(count>=plan.word.length+2)play(m,plan.word,true);
}

export const rankTiers=[{name:'Bronze',min:0,color:'#986440'},{name:'Silver',min:900,color:'#667579'},{name:'Gold',min:1100,color:'#9b7625'},{name:'Platinum',min:1300,color:'#427c77'},{name:'Diamond',min:1500,color:'#3e7396'},{name:'Elite',min:1800,color:'#496847'},{name:'Champion',min:2100,color:'#ad5535'},{name:'Unreal',min:2400,color:'#923e46'}];
export function rankFor(rating:number){return rankTiers.findLast(t=>rating>=t.min)||rankTiers[0]}
export type RankedProfile={dailyAnalyticsDate?:string,roomJoinRequest?:import('./room-directory').RoomJoinRequest,admin?:boolean,ban?:{at:number,by:string,reason:string},blocked?:string[],firstCompletionTracked?:boolean,playStreak?:DailyPlayStreak,daily?:Partial<Record<import('./daily').Language,import('./daily').DailyRun>>,bestWordStreak?:number,friends?:string[],friendRequests?:string[],friendRequestTimes?:number[],agent?:boolean,lastSeen?:number,lastChatAt?:number,recovery?:{salt:string,hash:string},recoveryAttempts?:{count:number,until:number},publicId?:string,history?:HistoryEntry[],peakRating?:number,avatar?:Avatar,name:string,rating:number,wins:number,losses:number};
export function ensureProfile(s:State,p:Player){s.profiles??={};return s.profiles[p.id]??=( {name:p.name,agent:!!p.agent,rating:1000,wins:0,losses:0} );}
export function wordPerformance(words:{word:string,player:number}[],player:number){const mine=words.filter(w=>w.player===player);const weight=mine.reduce((sum,{word})=>sum+(roman(word)?0:Math.min(30,Math.max(0,(Array.from(word).length-3)*5))),0);return {count:mine.length,percent:mine.length?Math.round(weight/mine.length*Math.min(1,mine.length/5)):0};}
export const streakMilestones=[{name:'Spark',min:3,percent:3},{name:'Blaze',min:5,percent:6},{name:'Inferno',min:8,percent:10}];
export function streakBonus(best:number){return streakMilestones.findLast(t=>best>=t.min)?.percent||0;}
function playerStreak(m:Match,player:number){m.streaks??=m.players.map(()=>({current:0,best:0}));return m.streaks[player]??=( {current:0,best:0} );}
export function resetWordStreak(m:Match,player:number){playerStreak(m,player).current=0;}
function recordWordStreak(m:Match,player:number,word:string){const streak=playerStreak(m,player);streak.current=Array.from(word).length>=5&&!roman(word)?streak.current+1:0;streak.best=Math.max(streak.best,streak.current);}
export function settleRatings(s:State){for(const m of s.matches){if(m.ratingExempt||m.practice||m.custom||(m.mode==='casual'||m.mode==='agents'||m.players.some(p=>p.agent))||m.winner===null||m.ratingChanges)continue;const profiles=m.players.map(p=>ensureProfile(s,p));const ratings=profiles.map(p=>p.rating);const places=m.players.map((_,i)=>i===m.winner?1:m.placements?.[i]||m.players.length);
m.ratingChanges=profiles.map((p,i)=>{let pairTotal=0;for(let j=0;j<profiles.length;j++){if(i===j)continue;const outcome=places[i]<places[j]?1:places[i]===places[j]?.5:0;const expected=1/(1+10**((ratings[j]-ratings[i])/400));pairTotal+=outcome-expected;}let base=Math.round(32*pairTotal/(profiles.length-1));if(profiles.length===2&&base===0)base=i===m.winner?1:-1;base=Math.max(-p.rating,base);const performance=wordPerformance(m.words,i),forfeitLoss=(m.forfeitedPlayers?.includes(i)||m.forfeited===i)&&base<0,wordPowerPercent=forfeitLoss?0:performance.percent,streakPercent=forfeitLoss?0:streakBonus(m.streaks?.[i]?.best||0),percent=Math.min(40,wordPowerPercent+streakPercent);const bonus=Math.round(Math.abs(base)*percent/100);const delta=base>=0?base+bonus:-Math.min(p.rating,Math.max(1,Math.abs(base)-bonus));const before=p.rating,after=Math.max(0,before+delta),oldPeak=Math.max(p.peakRating||0,before);p.peakRating=Math.max(oldPeak,after);p.rating=after;if(i===m.winner)p.wins++;else p.losses++;return {before,after,delta:after-before,base,bonus:after-before-base,bonusPercent:percent,wordPowerPercent,streakPercent,wordCount:performance.count,unlocks:rankTiers.filter(t=>t.min>oldPeak&&t.min<=after).map(t=>t.name)};});}}
export type HistoryEntry={bestStreak?:number,id:string,at:number,mode:'ranked'|'casual'|'agents'|'practice'|'custom',playerCount?:number,placement?:number,opponents?:{publicId?:string,name:string,avatar?:Avatar}[],won:boolean,opponent:{publicId?:string,name:string,avatar?:Avatar},words:number,longest:string,delta:number|null};
// The public badge identifies one linked profile; it never grants permissions.
// Legacy per-profile `admin` flags are deliberately ignored.
export function isAdministratorProfile(s:Pick<State,'administrator'>|undefined,p:RankedProfile|undefined){return !!s?.administrator?.ownerUserId&&!!p?.publicId&&p.publicId===s.administrator.publicId&&p.name.trim().toLowerCase()==='vecaid'&&!p.agent&&!p.ban;}
export function publicProfile(p:RankedProfile,s?:State){return {admin:isAdministratorProfile(s,p),bestWordStreak:p.bestWordStreak||0,publicId:p.publicId,agent:!!p.agent,name:p.name,avatar:p.avatar,rating:p.rating,peakRating:Math.max(p.peakRating||0,p.rating),wins:p.wins,losses:p.losses};}
export function archiveMatches(s:State){for(const p of Object.values(s.profiles||{}))p.publicId??=crypto.randomUUID();for(const m of s.matches){if(m.winner===null||m.historySaved)continue;for(let i=0;i<m.players.length;i++){const player=m.players[i];if(player.id==='bot')continue;const p=ensureProfile(s,player);if(m.forfeited!==i&&!m.forfeitedPlayers?.includes(i))recordPlayDay(p);p.publicId??=crypto.randomUUID();const opponents=m.players.filter((_,j)=>j!==i).map(rival=>{const other=rival.id==='bot'?undefined:ensureProfile(s,rival);if(other)other.publicId??=crypto.randomUUID();return {name:other?.name||rival.name,publicId:other?.publicId,avatar:other?.avatar||rival.avatar}});const mine=m.words.filter(w=>w.player===i),bestStreak=m.streaks?.[i]?.best||0;p.bestWordStreak=Math.max(p.bestWordStreak||0,m.practice?0:bestStreak);const entry:HistoryEntry={bestStreak,id:m.id,at:Date.now(),mode:m.practice?'practice':m.custom?'custom':m.mode||'ranked',playerCount:m.players.length,placement:i===m.winner?1:m.placements?.[i]||m.players.length,won:m.winner===i,opponents,opponent:opponents[0],words:mine.length,longest:mine.reduce((best,w)=>w.word.length>best.length?w.word:best,''),delta:m.ratingChanges?.[i]?.delta??null};p.history=[entry,...(p.history||[]).filter(h=>h.id!==m.id)].slice(0,50);}m.historySaved=true;}}
export function standings(s:State,me:string){for(const p of Object.values(s.profiles||{})){p.peakRating=Math.max(p.peakRating||0,p.rating);p.publicId??=crypto.randomUUID();}const rows=Object.entries(s.profiles||{}).filter(([,p])=>p.wins+p.losses>0).sort((a,b)=>b[1].rating-a[1].rating||b[1].wins-a[1].wins||a[0].localeCompare(b[0]));const mine=rows.findIndex(([id])=>id===me);return {leaderboard:rows.slice(0,100).map(([id,p],i)=>({...publicProfile(p,s),position:i+1,isYou:id===me})),rankedPlayers:rows.length,profile:{...publicProfile(s.profiles?.[me]||{name:'You',rating:1000,wins:0,losses:0},s),position:mine<0?null:mine+1}};}
export function findPublicProfile(s:State,id:string){const p=Object.values(s.profiles||{}).find(p=>p.publicId===id);return p?{...publicProfile(p,s),history:(p.history||[]).slice(0,10)}:null;}

export function cleanName(name:string){return name.normalize('NFKC').replace(/[^\p{L}\p{N} _]/gu,'').trim().replace(/\s+/g,' ').slice(0,18)}
export function nameTaken(s:State,id:string,name:string){return Object.entries(s.profiles||{}).some(([key,p])=>key!==id&&cleanName(p.name).toLowerCase()===cleanName(name).toLowerCase())}
// One-time owner-requested reset. Existing profiles and active matches survive.
export function resetLeaderboard(s:State){if(s.leaderboardReset===1)return;for(const p of Object.values(s.profiles||{})){p.rating=1000;p.wins=0;p.losses=0}for(const m of s.matches){m.ratingExempt=true;delete m.ratingChanges}s.leaderboardReset=1;}

export const alphabet='abcdefghijklmnopqrstuvwxyz';
export function collectedLetters(words:{word:string,player:number}[],player:number){const found=new Set(words.filter(w=>w.player===player).flatMap(w=>Array.from(normalize(w.word))).filter(c=>alphabet.includes(c)));return Array.from(alphabet).filter(c=>found.has(c));}
export function awardAlphabetBonus(m:Match,player:number){if(m.winner!==null||m.hearts[player]<=0)return false;m.alphabetBonusUsed??=m.players.map(()=>false);if(m.alphabetBonusUsed[player]||collectedLetters(m.words,player).length!==26)return false;m.alphabetBonusUsed[player]=true;m.hearts[player]++;return true;}

export function roomCode(s:State){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';for(let attempt=0;attempt<1000;attempt++){const bytes=crypto.getRandomValues(new Uint32Array(4));const code=Array.from(bytes,n=>chars[n%chars.length]).join('');if(!(s.rooms||[]).some(r=>r.code===code))return code;}throw Error('No room code available. Try again.');}

export async function recoveryHash(secret:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');}
export function sameHash(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^(b.charCodeAt(i)||0);return diff===0;}

export function leaderboardPage(s:State,me:string,offset=0,limit=100){const rows=Object.entries(s.profiles||{}).filter(([,p])=>p.wins+p.losses>0).sort((a,b)=>b[1].rating-a[1].rating||b[1].wins-a[1].wins||a[0].localeCompare(b[0]));const mine=rows.findIndex(([id])=>id===me);const start=Math.max(0,Math.min(Math.floor(offset),Math.max(0,rows.length-1)));return {offset:start,total:rows.length,rows:rows.slice(start,start+Math.max(1,Math.min(100,Math.floor(limit)))).map(([id,p],i)=>({...publicProfile(p,s),position:start+i+1,isYou:id===me})),you:mine<0?null:{...publicProfile(rows[mine][1],s),position:mine+1,isYou:true}};}

// Applied inside the same compare-and-swap as game state, so retries cannot double-count.
export function recordMatchAnalytics(s:State,before:{id:string,winner:number|null}[],now:number){
 recordGrowthMetrics(s,before,now);
 s.analytics??={since:now,days:{}};
 const ccu=s.analytics.ccu??={since:now,lastAt:0,samples:[],peaks:{}};
 if(!ccu.samples.length||now-ccu.lastAt>=300000){
  const count=Object.values(s.profiles||{}).filter(p=>!p.agent&&p.lastSeen!==undefined&&now-p.lastSeen>=0&&now-p.lastSeen<60000).length,date=new Date(now).toISOString().slice(0,10);
  ccu.lastAt=now;ccu.samples=ccu.samples.filter(p=>p.at>=now-7*86400000);ccu.samples.push({at:now,count});ccu.peaks[date]=Math.max(ccu.peaks[date]||0,count);
  const cutoff=new Date(now-90*86400000).toISOString().slice(0,10);for(const date of Object.keys(ccu.peaks))if(date<cutoff)delete ccu.peaks[date];
 }
 const previous=new Map(before.map(m=>[m.id,m.winner]));
 let started=0,completed=0;
 for(const m of s.matches){if(m.mode==='agents'||m.players.some(p=>p.agent))continue;if(!previous.has(m.id))started++;if(m.winner!==null&&(!previous.has(m.id)||previous.get(m.id)===null))completed++;}
 if(started||completed){const date=new Date(now).toISOString().slice(0,10),entry=s.analytics.days[date]??={started:0,completed:0};entry.started+=started;entry.completed+=completed;}
 const cutoff=new Date(now-90*86400000).toISOString().slice(0,10);
 for(const date of Object.keys(s.analytics.days))if(date<cutoff)delete s.analytics.days[date];
}
// Rematches require explicit consent, and never move a player out of another activity.
export function requestRematch(s:State,m:Match,me:string,cancel=false,now=Date.now()){
 const index=m.players.findIndex(p=>p.id===me);
 if(index<0||m.winner===null||m.practice)return 'Rematches are available after a multiplayer match.';
 if(m.rematch?.nextId)return 'This rematch has already started.';
 m.rematch??={ready:[]};
 if(cancel){m.rematch.ready=m.rematch.ready.filter(i=>i!==index);return '';}
 if(s.queue.some(p=>p.id===me)||s.matches.some(x=>x.winner===null&&x.players.some(p=>p.id===me)))return 'Finish your current activity first.';
 const room=s.rooms?.find(r=>r.players.some(p=>p.id===me));if(room&&(!m.custom||room.matchId!==m.id))return 'Leave your current room first.';
 if(!m.rematch.ready.includes(index))m.rematch.ready.push(index);m.players[index].seen=now;return '';
}
export function advanceRematches(s:State,now=Date.now()){
 for(const m of [...s.matches]){
  const consent=m.rematch;if(!consent||consent.nextId||m.winner===null||m.practice)continue;
  const room=m.custom?s.rooms?.find(r=>r.matchId===m.id):undefined;
  consent.ready=consent.ready.filter(i=>{const p=m.players[i];return p&&now-p.seen<12000&&!s.queue.some(q=>q.id===p.id)&&!s.matches.some(x=>x.winner===null&&x.players.some(q=>q.id===p.id))&&(m.custom?!!room?.players.some(q=>q.id===p.id):!s.rooms?.some(r=>r.players.some(q=>q.id===p.id)))});
  if(consent.ready.length<2){delete consent.startAt;continue;}
  consent.startAt??=now+10000;
  if(consent.ready.length===m.players.length)consent.startAt=Math.min(consent.startAt,now+3000);
  if(now<consent.startAt)continue;
  const players=consent.ready.map(i=>{const p=m.players[i],profile=s.profiles?.[p.id];return {...p,name:profile?.name||p.name,avatar:profile?.avatar||p.avatar,rating:profile?.rating??p.rating,seen:now}});
  const next=createGroupMatch(players,false,m.mode||'ranked',!!m.custom);next.rematchOf=m.id;s.matches.push(next);consent.nextId=next.id;
  if(room)room.matchId=next.id;
 }
}
export type DailyPlayStreak={enabled:boolean,count:number,best:number,lastDay?:number,grace:boolean};
export function enablePlayStreak(profile:RankedProfile,enabled:boolean){profile.playStreak??={enabled:false,count:0,best:0,grace:true};profile.playStreak.enabled=enabled;}
export function recordPlayDay(profile:RankedProfile,now=Date.now()){
 const streak=profile.playStreak;if(!streak?.enabled)return;
 const day=Math.floor(now/86400000),gap=streak.lastDay===undefined?Infinity:day-streak.lastDay;if(gap<=0)return;
 if(gap===1)streak.count++;else if(gap===2&&streak.grace){streak.count++;streak.grace=false;}else{streak.count=1;streak.grace=true;}
 streak.lastDay=day;streak.best=Math.max(streak.best,streak.count);if(streak.count%7===0)streak.grace=true;
}
export function playStreakSummary(profile?:RankedProfile,now=Date.now()){
 const s=profile?.playStreak||{enabled:false,count:0,best:0,grace:true},gap=s.lastDay===undefined?Infinity:Math.floor(now/86400000)-s.lastDay;
 return {enabled:s.enabled,count:gap>(s.grace?2:1)?0:s.count,best:s.best,grace:s.grace,lastDay:s.lastDay};
}
export type GrowthDay={firstCompletions:number,waitMs:number,waitPlayers:number,rematches:number};
export function recordGrowthMetrics(s:State,before:{id:string,winner:number|null}[],now:number){
 const previous=new Map(before.map(m=>[m.id,m.winner])),day:GrowthDay={firstCompletions:0,waitMs:0,waitPlayers:0,rematches:0};
 for(const m of s.matches){
  if(m.mode==='agents'||m.players.some(p=>p.agent))continue;
  if(!previous.has(m.id)){if(m.rematchOf)day.rematches++;else if(!m.practice&&!m.custom)for(const p of m.players){day.waitPlayers++;day.waitMs+=Math.max(0,Math.min(900000,m.created-(p.queuedAt??m.created)));}}
  if(m.winner!==null&&(!previous.has(m.id)||previous.get(m.id)===null))for(let i=0;i<m.players.length;i++){
   const p=s.profiles?.[m.players[i].id];if(!p||m.players[i].id==='bot'||p.firstCompletionTracked||m.forfeited===i||m.forfeitedPlayers?.includes(i))continue;
   if(!p.history?.length||(p.history.length===1&&p.history[0].id===m.id))day.firstCompletions++;p.firstCompletionTracked=true;
  }
 }
 s.analytics??={since:now,days:{}};s.analytics.growthDays??={};
 if(day.firstCompletions||day.waitPlayers||day.rematches){const date=new Date(now).toISOString().slice(0,10),entry=s.analytics.growthDays[date]??={firstCompletions:0,waitMs:0,waitPlayers:0,rematches:0};for(const key of Object.keys(day) as (keyof GrowthDay)[])entry[key]+=day[key];}
 const cutoff=new Date(now-90*86400000).toISOString().slice(0,10);for(const date of Object.keys(s.analytics.growthDays))if(date<cutoff)delete s.analytics.growthDays[date];
}
export type ReconnectPause={player:number,startedAt:number,until:number,remaining:number,choice:boolean};
// A missed heartbeat may pause the shared turn clock once per player, for at most 8s.
export function updateConnection(m:Match,visitor:string,now=Date.now()){
 if(m.winner!==null)return false;
 m.connection??={seen:m.players.map(()=>now),used:m.players.map(()=>false)};
 const member=m.players.findIndex(p=>p.id===visitor),current=m.letterChoice?.chooser??m.turn,phaseStart=m.letterChoice?.startsAt??m.turnStartsAt??m.created;
 const pause=m.reconnect;
 if(pause){
  if(member===pause.player||now>=pause.until){const refund=member===pause.player?Math.max(0,pause.until-now):0;m.deadline-=refund;if(pause.choice&&m.letterChoice)m.letterChoice.deadline-=refund;delete m.reconnect;}
 }else if(m.players[current].id!=='bot'&&!m.connection.used[current]&&now>=phaseStart){
  const startedAt=Math.max(m.connection.seen[current],phaseStart)+4000,until=startedAt+8000;
  if(now>=startedAt&&m.deadline>=startedAt){
   m.connection.used[current]=true;const remaining=Math.max(0,m.deadline-startedAt),extension=member===current?Math.min(8000,now-startedAt):8000;
   m.deadline+=extension;if(m.letterChoice)m.letterChoice.deadline+=extension;
   if(member!==current&&now<until)m.reconnect={player:current,startedAt,until,remaining,choice:!!m.letterChoice};
  }
 }
 if(member>=0)m.connection.seen[member]=now;
 return !!m.reconnect&&now<m.reconnect.until;
}
