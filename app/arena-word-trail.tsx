import {memo} from 'react';
import {ArrowRight,Zap} from 'lucide-react';
import WordMeaning from './word-meaning';

// Unchanged history should not rerender on every local or remote keystroke.
export default memo(function ArenaWordTrail({matchId,words,you,active}:{matchId:string,words:{word:string,player:number}[],you:number,active:boolean}){
 return <section className="trail panel"><div className="side-title"><span><Zap size={16}/> WORD TRAIL</span><span>{words.length||0}</span></div><p className="trail-learning-hint">Tap any word to explore its meaning.</p>{words.length?<div className="word-list">{words.slice().reverse().map(w=><WordMeaning key={`${matchId}:${w.word}`} word={w.word} live={active}><span className={w.player===you?'word-you':'word-them'}>{w.player===you?'YOU':'RIVAL'}</span><b>{w.word.slice(0,-1)}<em>{w.word.slice(-1)}</em></b></WordMeaning>)}</div>:<div className="trail-empty"><div className="sample-word">appl<span>e</span><ArrowRight size={14}/><span>e</span>cho</div><p>Accepted words will appear here.</p></div>}<div className="trail-foot"><span className="purple-dot"/> You <span className="coral-dot"/> Opponent</div></section>;
});
