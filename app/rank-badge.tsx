import type {CSSProperties} from 'react';
import {Trophy} from 'lucide-react';
import {rankFor} from '../lib/game';

export default function RankBadge({rating}:{rating:number}){
 const rank=rankFor(rating);
 return <span className="rank-badge" style={{'--rank-color':rank.color} as CSSProperties}><Trophy size={12} aria-hidden="true"/> {rank.name} <b>{rating}</b></span>;
}
