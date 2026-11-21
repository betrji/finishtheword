'use client';
import {cleanName} from '../lib/game';
export const validRoomCode=(code:string)=>/^[a-z0-9]{4}$/i.test(code);
export function canAutoJoinInvite({code,ready,hasProfile,name,active,queued,inRoom}:{code:string,ready:boolean,hasProfile:boolean,name:string,active:boolean,queued:boolean,inRoom:boolean}){return validRoomCode(code)&&ready&&hasProfile&&!!cleanName(name)&&!active&&!queued&&!inRoom}
export default function RoomInvite({code,name,setName,busy,ready,onJoin,onCancel}:{code:string,name:string,setName:(name:string)=>void,busy:boolean,ready:boolean,onJoin:()=>void,onCancel:()=>void}){
 return <section className="invite-panel"><h2>Your friends are in room <b>{code}</b></h2><p>Choose your player name and go straight to their room.</p><form onSubmit={e=>{e.preventDefault();onJoin()}}><label htmlFor="name">Player name</label><input id="name" maxLength={18} value={name} onChange={e=>setName(e.target.value)} autoComplete="nickname" aria-describedby="invite-name-hint"/><small id="invite-name-hint">{cleanName(name)?'Your name must be unique.':'Enter a name to join your friends.'}</small><button className="primary" disabled={busy||!ready}>{busy?'Joining your friends…':'Join room '+code}</button></form><button className="text-button" onClick={onCancel}>Back to main menu</button></section>
}
