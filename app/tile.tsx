import type {CSSProperties} from 'react';
const values:Record<string,number>={A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};
// Corner values are decorative board-game details, not this game's scoring system.
export default function Tile({letter,className='',style}:{letter:string,className?:string,style?:CSSProperties}){return <span className={'game-tile '+className} style={style} aria-label={letter.toUpperCase()}><b>{letter.toUpperCase()}</b><small aria-hidden="true">{values[letter.toUpperCase()]||1}</small></span>}
