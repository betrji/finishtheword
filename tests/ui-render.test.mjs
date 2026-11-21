import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
// Check reconciliation identities as well as static HTML. Duplicate sibling keys can
// leave orphaned controls behind during updates even when an SSR snapshot is correct.
const jsxRuntime=require('react/jsx-runtime');let arenaKey;
for(const method of ['jsx','jsxs']){const original=jsxRuntime[method];jsxRuntime[method]=(type,props,key)=>{
 const children=Array.isArray(props?.children)?props.children:[];const keys=children.filter(child=>React.isValidElement(child)&&child.key!==null).map(child=>child.key);
 assert.equal(new Set(keys).size,keys.length,`Duplicate sibling keys in ${typeof type==='string'?type:'component'}: ${keys}`);
 if(props?.className==='arena-bottom')arenaKey=key;
 return original(type,props,key);
};}
const Home=require(path.resolve('app/page.tsx')).default,Tile=require(path.resolve('app/tile.tsx')).default;
const initialState=React.useState;let menu=false,explicitArena=false;let snapshot={match:null,queued:false,waiting:0,now:Date.now()};
React.useState=function(value){if(value==='home')return initialState(menu?'menu':explicitArena?'arena':'home');if(value&&typeof value==='object'&&'match' in value&&'queued' in value)return initialState(snapshot);return initialState(value)};
const render=()=>renderToStaticMarkup(React.createElement(Home));
let html=render();assert(html.includes('Who gets'));assert(html.includes('Play with friends'));assert(html.includes('Open navigation'));assert(html.includes('Use dark theme'));assert.equal((html.match(/id="name"/g)||[]).length,1);assert(!html.includes('Owner analytics'));assert(!html.includes('VOL. 01'));assert(!html.includes('FIND YOUR NEXT CHALLENGE'));assert(html.includes('aria-label="Game mode"'));assert(html.includes('Lobby chat'));assert(html.includes('Table Game X'));
explicitArena=true;html=render();assert(html.includes('Arena waiting table'));assert(html.includes('Choose a game'));assert(!html.includes('arena-welcome'));assert(!html.includes('id="name"'));assert(html.includes('aria-label="Arena"'));explicitArena=false;
const tile=renderToStaticMarkup(React.createElement(Tile,{letter:'E'}));assert(tile.includes('aria-label="E"'));assert(tile.includes('aria-hidden="true"'));
for(let count=2;count<=5;count++){
 const players=Array.from({length:count},(_,i)=>({publicId:'p'+i,name:'Player '+i,rating:1000}));
 snapshot={match:{id:'game',players,you:0,turn:1,hearts:Array(count).fill(2),mistakes:5,letter:'e',prefix:'e',words:[{word:'apple',player:0}],deadline:Date.now()+15000,winner:null,practice:false,drafts:Array(count).fill('ea')},queued:false,waiting:0,now:Date.now()};
 html=render();assert(html.includes('Your streak'));assert(html.includes('5+ letters'));assert(html.includes('Word Power'));assert(html.includes('clock-display'));assert(html.includes('bomb-timer'));assert(html.includes('animated-fuse'));assert(html.includes('fuse-rope'));assert(html.includes('aria-live=\"off\"'));assert(html.includes('aria-label="Your word"'));assert(html.includes('starting-tile'));assert(html.includes('word-feedback'));assert(!html.includes('arena-welcome'));if(count>2)assert.equal((html.match(/class="table-seat/g)||[]).length,count);
 assert.equal((html.match(/class="rank-badge"/g)||[]).length,count);
 for(const settings of [{mode:'casual'},{mode:'ranked',practice:true},{mode:'ranked',custom:true}]){Object.assign(snapshot.match,{mode:'ranked',practice:false,custom:false},settings);assert(!render().includes('class="rank-badge"'));assert(render().includes('Your streak'));assert(!render().includes('Combined boost / loss protection'));}
 Object.assign(snapshot.match,{mode:'ranked',practice:false,custom:false});
 snapshot.match.letterChoice={id:'choice',chooser:0,options:['a','e','r','s'],startsAt:Date.now()-100,deadline:Date.now()+8000};
 html=render();assert(html.includes('CHOOSE A LETTER'));assert(!html.includes('bomb-timer'));assert(html.includes('Starting letter choices'));assert(!html.includes('aria-label="Your word"'));assert.equal((html.match(/aria-label="Choose [A-Z]"/g)||[]).length,4);
 snapshot.match.letterChoice.chooser=1;html=render();assert(html.includes('IS CHOOSING'));assert.equal((html.match(/disabled="" aria-label="Choose [A-Z]"/g)||[]).length,4);
 delete snapshot.match.letterChoice;
 snapshot.match.prefix='ing';snapshot.match.prefixKind='suffix';snapshot.match.words=[{word:'running',player:1}];snapshot.match.streaks=[{current:5,best:5}];html=render();assert(html.includes('RUNNING → ING'));assert(html.includes('Streak 6%'));assert(!html.includes('aria-hidden="true">RUNNING'));
 snapshot.match.winner=0;snapshot.match.placements=Array.from({length:count},(_,i)=>i+1);html=render();assert(html.includes('Copy result'));assert(html.includes('aria-label="Rematch"'));assert(html.includes('Final word'));assert(html.includes('Report a word rejection or bug'));assert(html.includes('Your longest word'));assert(html.includes('Best word streak:'));assert(!html.includes('bomb-timer'));assert(html.includes('You won!'));
}
snapshot.match.winner=null;snapshot.match.turn=0;
html=render();assert(html.includes('Open keyboard · your turn'));assert(!html.match(/<input[^>]*aria-label="Your word"[^>]*readOnly/i));
snapshot.match.turn=1;html=render();assert(!html.includes('Open keyboard · your turn'));assert(html.match(/<input[^>]*aria-label="Your word"[^>]*readOnly/i));
snapshot.match.winner=0;html=render();
const finishedKey=arenaKey;
snapshot.match.winner=null;snapshot.match.mode='casual';snapshot.match.practice=false;
html=render();assert.notEqual(arenaKey,finishedKey);assert(!html.includes('aria-label="Rematch"'));assert(!html.includes('Play this bot again'));assert(!html.includes('Copy result'));assert(html.includes('Watch their word. Plan your next move.'));assert(!html.includes('Tap Send or press Enter'));
snapshot.match.winner=0;html=render();assert(html.includes('CASUAL ARENA'));assert(html.includes('5 PLAYERS'));assert.equal((html.match(/aria-label="Rematch"/g)||[]).length,1);
// A finished bot match has one replay action; queueing replaces the old result entirely.
snapshot.match.practice=true; snapshot.match.difficulty='easy';
html=render();assert.equal((html.match(/Play this bot again/g)||[]).length,1);
assert(html.indexOf('aria-label="Rematch"')<html.indexOf('aria-label="Result card"'));
snapshot.queued=true;snapshot.queuedMode='casual';snapshot.queuedCount=2;snapshot.waiting=1;
html=render();assert(html.includes('Finding your rival'));assert(html.includes('Cancel search'));
for(const stale of ['Play this bot again','aria-label="Rematch"','aria-label="Result card"','Report a word rejection or bug','EASY PRACTICE','class="table-seat'])assert(!html.includes(stale),stale);
assert(html.includes('WAITING FOR A PLAYER'));
snapshot={match:null,queued:false,waiting:0,now:Date.now(),room:{code:'AB12',capacity:2,isHost:true,inMatch:false,players:[{publicId:'p0',name:'Player 0',isHost:true}]}};html=render();assert(html.includes('Invite friends'));assert(html.includes('AB12'));assert(html.includes('profile and friendship options'));assert(html.includes('Select a player’s name'));assert(!html.includes('arena-welcome'));
snapshot={match:null,queued:true,queuedCount:2,waiting:1,now:Date.now()};html=render();assert(html.includes('Finding your rival'));assert(html.includes('Cancel search'));assert(html.includes('board-searching'));assert(html.includes('search-tiles'));assert(html.includes('WAITING FOR A PLAYER'));
menu=true;
html=render();assert(html.includes('arena-welcome'));assert(html.includes('Return to queue'));assert(!html.includes('Finding your rival'));
snapshot.queued=false;snapshot.match={id:'finished',players:[{name:'You'},{name:'Bot'}],you:0,turn:0,hearts:[2,0],words:[],winner:0,letter:'a'};
html=render();assert(html.includes('arena-welcome'));assert(html.includes('id="name"'));assert(!html.includes('You won!'));
snapshot.match.winner=null;html=render();assert(html.includes('Return to match'));assert(html.includes('timer keeps going'));assert(!html.includes('id="name"'));
snapshot.match=null;snapshot.room={code:'AB12',capacity:2,players:[]};html=render();assert(html.includes('Return to room'));
React.useState=initialState;
console.log('PASS: landing, theme/navigation controls, tile accessibility, two-to-five player layouts, result sharing, rooms, and queued-state rendering. No browser layout assertions.');

const CommunityBoard=require(path.resolve('app/community-board.tsx')).default;
const chatProps={sessionId:null,profileId:'you',saveProfile(){}};
for(const roomChannel of ['room:AB12:1','room:CD34:2']){
 const node=CommunityBoard({...chatProps,roomChannel,matchId:'match1'});assert.equal(node.key,roomChannel);
 const room=renderToStaticMarkup(React.createElement(CommunityBoard,{...chatProps,roomChannel,matchId:roomChannel.includes('AB12')?'match1':undefined}));
 assert(room.includes('aria-pressed="true" class="chosen">Room</button>'));
 assert(room.includes('Private · room members only'));assert(room.includes('aria-label="Private room message"'));assert(room.includes('Public lobby'));
}
const matchChat=renderToStaticMarkup(React.createElement(CommunityBoard,{...chatProps,matchId:'match1'}));assert(matchChat.includes('aria-pressed="true" class="chosen">Match</button>'));assert(matchChat.includes('Match participants only'));
const publicChat=renderToStaticMarkup(React.createElement(CommunityBoard,chatProps));
assert(publicChat.includes('aria-pressed="true" class="chosen">Public lobby</button>'));
assert(publicChat.includes('Public · visible to everyone'));assert(publicChat.includes('Message the public lobby'));
assert.equal(CommunityBoard(chatProps).key,'public');
console.log('PASS: private-room default with/without match, room-specific remount keys, public lobby default and explicit audience labels.');

const {default:CommunityHub,Spectator,FriendAction}=require(path.resolve('app/community-hub.tsx'));
let socialScreen='watch',mockSocial={canAddFriends:true,friends:[],incoming:[],outgoing:[],recent:[],games:[]};
React.useState=function(value){if(value===null)return initialState(mockSocial);if(value==='watch')return initialState(socialScreen);return initialState(value)};
const hubProps={sessionId:null,profileId:'you',openPlayer(){},onSetupRecovery(){}};
let community=renderToStaticMarkup(React.createElement(CommunityHub,hubProps));assert(community.includes('The tables are quiet'));assert(community.includes('Private rooms and practice stay private'));
mockSocial.games=[{id:'live',mode:'ranked',players:[{name:'Rival'}],words:5,alive:2}];
community=renderToStaticMarkup(React.createElement(CommunityHub,hubProps));assert(community.includes('Watch game'));assert(community.includes('5 words played'));
socialScreen='friends';mockSocial.friends=[{publicId:'friend',name:'Friend',rating:1000,online:true,watchId:'live'}];mockSocial.incoming=[{publicId:'request',name:'Requester',rating:1100}];mockSocial.outgoing=[{publicId:'sent',name:'Sent',rating:1000}];mockSocial.recent=[{publicId:'recent',name:'Recent',rating:1000}];
community=renderToStaticMarkup(React.createElement(CommunityHub,hubProps));for(const text of ['Accept','Decline','Cancel request','Played together','In a public match','Remove'])assert(community.includes(text));
let friendControl=renderToStaticMarkup(React.createElement(FriendAction,{...hubProps,targetId:'request'}));assert(friendControl.includes('Accept friend request'));
mockSocial.canAddFriends=false;
friendControl=renderToStaticMarkup(React.createElement(FriendAction,{...hubProps,targetId:'request'}));assert(friendControl.includes('Recovery key required'));assert(friendControl.includes('Set recovery key'));assert(/class="secondary" disabled=""/.test(friendControl));
community=renderToStaticMarkup(React.createElement(CommunityHub,hubProps));assert(community.includes('Set recovery key'));assert(/disabled=""[^>]*>[^]*?Accept<\/button>/.test(community));
friendControl=renderToStaticMarkup(React.createElement(FriendAction,{...hubProps,targetId:'sent'}));assert(friendControl.includes('Cancel friend request'));assert.match(friendControl,/<button class="secondary"[^>]*>(?:(?!<\/button>).)*Cancel friend request<\/button>/s);assert(!friendControl.split('</button>')[0].includes('disabled=""'));assert(!friendControl.includes('Recovery key required'));
mockSocial.canAddFriends=true;

for(let count=2;count<=5;count++){
 mockSocial={id:'live',mode:'ranked',players:Array.from({length:count},(_,i)=>({name:'P'+i,publicId:'p'+i,rating:1000})),turn:0,hearts:Array(count).fill(2),words:[{word:'apple',player:0}],deadline:Date.now()+15000,turnDuration:15000,turnStartsAt:0,completedTurns:1,prefix:'e',winner:null,drafts:['echo']};
 const watched=renderToStaticMarkup(React.createElement(Spectator,{id:'live',sessionId:null,openPlayer(){},onBack(){}}));
 assert.equal((watched.match(/class="watch-player /g)||[]).length,count);assert(watched.includes('Live player typing'));assert(watched.includes('Word trail'));assert(watched.includes('Spectating'));assert(!watched.includes('<input'));assert(!watched.includes('Forfeit'));assert(!watched.includes('Chat channel'));assert.equal((watched.match(/class="rank-badge"/g)||[]).length,count);mockSocial.mode='casual';assert(!renderToStaticMarkup(React.createElement(Spectator,{id:'live',sessionId:null,openPlayer(){},onBack(){}})).includes('class="rank-badge"'));
}
React.useState=initialState;
console.log('PASS: community empty/live lists, requests and friend controls, and 2–5 player spectator rendering without gameplay or chat inputs.');

const {default:FlameStreak,StreakBadges}=require(path.resolve('app/flame-streak.tsx'));
for(const best of [0,3,5,8]){const badges=renderToStaticMarkup(React.createElement(StreakBadges,{best}));assert.equal((badges.match(/streak-earned/g)||[]).length,[0,3,5,8].indexOf(best));assert(badges.includes('Personal best:'));}
const flame=renderToStaticMarkup(React.createElement(FlameStreak,{current:5,best:8}));assert(flame.includes('Inferno earned'));assert(flame.includes('aria-live="polite"'));assert(!flame.includes('Plus one.'));
const practiceFlame=renderToStaticMarkup(React.createElement(FlameStreak,{current:8,best:8,practice:true}));assert(practiceFlame.includes('Practice only'));assert(!practiceFlame.includes('Inferno earned'));assert(practiceFlame.includes('Bot practice does not unlock badges'));
console.log('PASS: streaks in every playing mode, ranked-only bonus summary, readable suffix handoff, results and permanent milestone badges.');

const {default:ResultCard,resultText}=require(path.resolve('app/result-card.tsx'));
const details={title:'Finish the Word',outcome:'You won!',count:12,finalWord:'apple',longestWord:'elephant'};const resultMarkup=renderToStaticMarkup(React.createElement(ResultCard,details));assert(resultMarkup.includes('apple'));assert(resultMarkup.includes('elephant'));assert(resultText(details).includes('https://finishtheword.com/?from=result'));assert(resultText(details).includes('Play with me'));
console.log('PASS: post-match card shows outcome, final and longest words, with share text and invitation link.');

const {default:RoomInvite,canAutoJoinInvite}=require(path.resolve('app/room-invite.tsx'));
const invite={code:'AB12',name:'Friend',ready:true,hasProfile:true,active:false,queued:false,inRoom:false};assert(canAutoJoinInvite(invite));for(const change of [{code:'bad'},{name:'   '},{ready:false},{hasProfile:false},{active:true},{queued:true},{inRoom:true}])assert(!canAutoJoinInvite({...invite,...change}));const invited=renderToStaticMarkup(React.createElement(RoomInvite,{...invite,busy:false,setName(){},onJoin(){},onCancel(){}}));assert(invited.includes('Join room AB12'));assert(invited.includes('id="name"'));assert(!invited.includes('Create room'));
console.log('PASS: direct invite CTA and name field, remembered-profile autojoin, and active-match/queue/room protection.');

const {queueOfferReady}=require(path.resolve('app/queue-options.tsx'));assert(!queueOfferReady(1000,30999,30));assert(queueOfferReady(1000,31000,30));assert(queueOfferReady(1000,16000,15));assert(!queueOfferReady(1000,31000,60));
console.log('PASS: configurable queue offer boundaries.');

const {default:Tutorial,tutorialAnswer}=require(path.resolve('app/first-game-tutorial.tsx'));const tutorial=renderToStaticMarkup(React.createElement(Tutorial,{onDone(){},onCancel(){}}));assert(tutorial.includes('role="dialog"'));assert(tutorial.includes('Skip &amp; play'));assert(tutorial.includes('Play ECHO'));assert(tutorial.includes('Fill ECHO'));assert(tutorial.includes('aria-live="polite"'));assert(tutorialAnswer(0,' echo ').startsWith('Accepted'));assert(tutorialAnswer(2,'ECHO').includes('Already played'));assert(tutorialAnswer(2,'EAGLE').startsWith('Accepted'));assert(tutorialAnswer(3,'AGAIN').startsWith('Accepted'));assert(!tutorialAnswer(3,'apple').startsWith('Accepted'));
const {trapDialogKey}=require(path.resolve('app/dialog-focus.ts'));let focused='',closed=false,prevented=false;const first={focus(){focused='first'}},last={focus(){focused='last'}};const key=(name,shift=false)=>({key:name,shiftKey:shift,preventDefault(){prevented=true},stopPropagation(){}});trapDialogKey(key('Tab'),[first,last],last,()=>{});assert.equal(focused,'first');trapDialogKey(key('Tab',true),[first,last],first,()=>{});assert.equal(focused,'last');trapDialogKey(key('Escape'),[first,last],first,()=>closed=true);assert(closed&&prevented);
console.log('PASS: interactive timer/repeat/prefix tutorial, skip option, and keyboard focus wrap/Escape behavior.');

const Rematch=require(path.resolve('app/rematch.tsx')).default;
for(const total of [2,3,4,5])for(const ready of [[],[0],Array.from({length:total},(_,i)=>i)]){const markup=renderToStaticMarkup(React.createElement(Rematch,{total,ready,you:0,busy:false,onReady(){},onCancel(){},startAt:ready.length===total?Date.now()+3000:undefined}));assert.equal((markup.match(/<button/g)||[]).length,1);assert(markup.includes('Rematch?'));assert(markup.includes(`${ready.length}/${total} ready`));assert(markup.includes(`aria-pressed="${ready.includes(0)}"`));if(ready.length===total)assert(markup.includes('Starting in 3'));}
console.log('PASS: one rematch toggle, ready counts for 2–5 players, and countdown display.');

const botReplay=renderToStaticMarkup(React.createElement(Rematch,{ready:[],you:0,total:2,practice:true,busy:false,onReady(){},onCancel(){}}));assert.equal((botReplay.match(/<button/g)||[]).length,1);assert(botReplay.includes('Play this bot again'));assert(!botReplay.includes('0/2'));assert(!botReplay.includes('Starting in'));
const soundModule=require(path.resolve('lib/sounds.ts')),originalCue=soundModule.rematchCountdownSound,originalEffect=React.useEffect,originalInterval=globalThis.setInterval,originalClear=globalThis.clearInterval,originalNow=Date.now;
try{for(const scenario of [{sound:true,ready:[0],practice:false,expected:3},{sound:false,ready:[0],practice:false,expected:0},{sound:true,ready:[],practice:false,expected:0},{sound:true,ready:[0],practice:true,expected:0}]){let time=10000,effects=[],timers=[],cues=[];Date.now=()=>time;globalThis.document={hidden:false};React.useEffect=fn=>effects.push(fn);globalThis.setInterval=fn=>{timers.push(fn);return timers.length};globalThis.clearInterval=()=>{};soundModule.rematchCountdownSound=n=>cues.push(n);renderToStaticMarkup(React.createElement(Rematch,{...scenario,you:0,total:2,startAt:13000,busy:false,onReady(){},onCancel(){}}));const cleanup=effects.map(fn=>fn());for(time=10000;time<13000;time+=100)timers.forEach(fn=>fn());assert.equal(cues.length,scenario.expected);if(scenario.expected)assert.deepEqual(cues,[3,2,1]);cleanup.forEach(fn=>fn?.());}}
finally{React.useEffect=originalEffect;Date.now=originalNow;globalThis.setInterval=originalInterval;globalThis.clearInterval=originalClear;soundModule.rematchCountdownSound=originalCue;delete globalThis.document;}
console.log('PASS: countdown cues occur once per beat, respect mute, and exclude bots and players who have not opted in.');

const TrendChart=require(path.resolve('app/analytics/trend-chart.tsx')).default;
const chart=renderToStaticMarkup(React.createElement(TrendChart,{title:'CCU',maxGap:600000,points:[{at:1,label:'00:00',value:2},{at:300001,label:'00:05',value:3},{at:1800001,label:'00:30',value:1}]}));assert(chart.includes('View exact values'));assert(chart.includes('role="img"'));assert.match(chart,/d="M[^"]+L[^"]+M/);assert(!chart.includes('NaN'));assert(renderToStaticMarkup(React.createElement(TrendChart,{title:'CCU',points:[]})).includes('No samples recorded yet'));
const About=require(path.resolve('app/about/page.tsx'));const about=renderToStaticMarkup(React.createElement(About.default));assert(about.includes('What is Finish the Word?'));assert(about.includes('apple → elephant → tiger'));assert(about.includes('not affiliated'));assert(about.includes('href="/how-to-play"'));assert.equal(About.metadata.alternates.canonical,'/about');const sitemap=fs.readFileSync('public/sitemap.xml','utf8');for(const route of ['/about','/how-to-play','/daily'])assert(sitemap.includes('https://finishtheword.com'+route));
console.log('PASS: server-rendered game definition, example chain, affiliation distinction, rules links, canonical and discovery sitemap.');
