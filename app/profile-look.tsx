import {Check,ArrowRight} from 'lucide-react';
import {palettes,paletteNames,rankRewards,type Avatar} from '../lib/avatar';
import CharacterToken from './character-token';
import GameIcon from './game-icon';

export default function ProfileLook({avatar,name,onChange,onRewards}:{avatar:Avatar,name:string,onChange:(value:Avatar)=>void,onRewards:()=>void}){
 const accessory=rankRewards.find(r=>r.accessory===avatar.accessory)?.name||avatar.accessory;
 return <div className="profile-look">
  <div className="look-showcase"><CharacterToken avatar={avatar}/><div><h3>{name.trim()||'Your game piece'}</h3><p>{avatar.shape} · {accessory==='none'?'No accessory':accessory}</p><small>Seen by the players at your table.</small></div></div>
  <div className="look-options">
   <fieldset><legend>Ink color</legend><div className="swatches">{Object.entries(palettes).map(([color,colors])=><button key={color} type="button" aria-label={paletteNames[color as Avatar['color']]} aria-pressed={avatar.color===color} className={avatar.color===color?'chosen':''} onClick={()=>onChange({...avatar,color:color as Avatar['color']})}><span style={{background:colors[0]}}>{avatar.color===color&&<Check size={16}/>}</span><small>{paletteNames[color as Avatar['color']]}</small></button>)}</div></fieldset>
   <fieldset><legend>Game piece</legend><div className="avatar-options shape-options">{(['cat','bear','bunny'] as const).map(shape=><button key={shape} type="button" aria-pressed={avatar.shape===shape} className={avatar.shape===shape?'chosen':''} onClick={()=>onChange({...avatar,shape})}><CharacterToken avatar={{...avatar,shape,accessory:'none'}}/><span>{shape}</span>{avatar.shape===shape&&<Check className="option-check" size={13} aria-hidden="true"/>}</button>)}</div></fieldset>
   <fieldset><legend>Accessory</legend><div className="avatar-options accessory-options">{(['none','glasses','crown','cap'] as const).map(value=><button key={value} type="button" aria-pressed={avatar.accessory===value} className={avatar.accessory===value?'chosen':''} onClick={()=>onChange({...avatar,accessory:value})}><GameIcon name={value}/><span>{value}</span></button>)}</div></fieldset>
   <button className="rewards-link" onClick={onRewards}>See your rank rewards <ArrowRight size={15}/></button>
  </div>
 </div>;
}
