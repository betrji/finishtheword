import {normalize,play,roman,type Match} from './game';

export type WordSubmission={matchId?:string,turnId?:string,turnDeadline?:number,actionId?:string,word?:string};
export function wordTurnId(m:Match){return `${m.id}:${m.turn}:${m.turnStartsAt}:${m.letterChoice?.id||''}`}

// A retry must never consume another spelling attempt or land on a later turn.
// Keep only receipts, never an additional copy of the submitted text.
export function submitWordForTurn(m:Match|undefined,me:string,input:WordSubmission,valid:(word:string)=>boolean,previousDeadline?:number){
 if(!m||input.matchId!==m.id)return 'This match has ended. Return to your current game.';
 const player=m.players.findIndex(p=>p.id===me);
 if(player<0)return 'You are not playing in this match.';
 const id=typeof input.actionId==='string'&&/^[a-f0-9-]{36}$/i.test(input.actionId)?input.actionId:'';
 const receipt=id&&m.wordReceipts?.find(r=>r.id===id&&r.player===player);
 if(receipt)return receipt.message;
 if(m.winner!==null)return 'This match has ended.';
 const sameTurn=input.turnId!==undefined?input.turnId===wordTurnId(m):typeof input.turnDeadline==='number'&&(input.turnDeadline===m.deadline||input.turnDeadline===previousDeadline);
 if(!sameTurn)return 'That turn has ended. Wait for your next turn.';
 if(m.turn!==player)return 'Wait for your turn.';
 const word=normalize(String(input.word||'')).slice(0,60),message=play(m,word,valid(word)||roman(word));
 if(id)m.wordReceipts=[...(m.wordReceipts||[]),{id,player,message}].slice(-32);
 return message;
}
