import type {State} from './game';
export type GameFeedback={resolvedAt?:number,id:string,at:number,reporter:string,kind:'word'|'bug'|'player',matchId:string,details:string,word?:string,targetId?:string,reason?:string};
export function submitFeedback(state:State,me:string,input:{id?:unknown,kind?:unknown,matchId?:unknown,details?:unknown,word?:unknown,targetId?:unknown,reason?:unknown},now=Date.now()){
 const p=state.profiles?.[me];if(!p?.publicId||p.agent)return 'Save your player profile first.';
 if(typeof input.id!=='string'||!/^[a-f0-9-]{36}$/i.test(input.id)||!['word','bug','player'].includes(String(input.kind))||(input.kind!=='player'&&typeof input.matchId!=='string'))return 'Choose a report type.';
 const match=state.matches.find(m=>m.id===input.matchId&&m.winner!==null&&m.players.some(p=>p.id===me)),daily=Object.values(p.daily||{}).find(r=>r?.id===input.matchId&&r.finished);
 const playerReport=input.kind==='player',target=Object.values(state.profiles||{}).find(t=>t.publicId===input.targetId&&!t.agent);
 if(playerReport&&(!target||target.publicId===p.publicId||!['harassment','name','cheating','other'].includes(String(input.reason))))return 'Choose another player and a reason.';
 if(!playerReport&&!match&&!daily)return 'Only your completed matches or daily attempts can be reported here.';
 const details=typeof input.details==='string'?input.details.trim():'',word=typeof input.word==='string'?input.word.trim():'';
 if(details.length<5||details.length>500||word.length>60)return 'Describe the issue in 5–500 characters; a word can have at most 60 characters.';
 state.feedback=(state.feedback||[]).filter(r=>now-r.at<30*86400000);
 if(state.feedback.some(r=>r.id===input.id&&r.reporter===p.publicId))return '';
 if(state.feedback.some(r=>r.reporter===p.publicId&&now-r.at<30000))return 'Please wait 30 seconds before sending another report.';
 state.feedback.push({id:input.id,at:now,reporter:p.publicId,kind:input.kind as GameFeedback['kind'],matchId:playerReport?'':input.matchId as string,details,...(playerReport?{targetId:target!.publicId,reason:input.reason as string}:{}),...(input.kind==='word'&&word?{word}:{})});state.feedback=state.feedback.slice(-500);return '';
}
