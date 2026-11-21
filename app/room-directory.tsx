'use client';
import {useEffect,useRef,useState} from 'react';
import {Globe,Lock,RefreshCw,Users} from 'lucide-react';
import Tile from './tile';
import type {RoomAction,RoomDirectoryData} from '../lib/room-directory';

import {clientId} from '../lib/client-id';


export function RoomPrivacy({value,onChange,disabled=false}:{value:'private'|'public',onChange:(value:'private'|'public')=>void,disabled?:boolean}){
 return <fieldset className="room-privacy" disabled={disabled}><legend>Room privacy</legend><div>
  <button type="button" aria-pressed={value==='private'} onClick={()=>onChange('private')}><Lock size={15} aria-hidden="true"/> Private</button>
  <button type="button" aria-pressed={value==='public'} onClick={()=>onChange('public')}><Globe size={15} aria-hidden="true"/> Public</button>
 </div><p>{value==='private'?'Hidden from Open rooms. Friends join with your invite link or code.':'Listed in Open rooms. You approve join requests; invite links still work.'}</p></fieldset>;
}

function useRooms(sessionId:string|null){
 const [data,setData]=useState<RoomDirectoryData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const alive=useRef(true),reading=useRef(false),generation=useRef(0),mutating=useRef(false);
 async function refresh(signal?:AbortSignal){
  if(reading.current||mutating.current)return;reading.current=true;const version=generation.current;
  try{
   const response=await fetch('/api/rooms',{credentials:'same-origin',cache:'no-store',headers:sessionId?{'X-Arena-Session':sessionId}:{},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});
   const result=await response.json() as RoomDirectoryData & {error?:string};if(!response.ok)throw Error(result.error||'Could not load open rooms.');
   if(alive.current&&!signal?.aborted&&version===generation.current){setData(result);setError('');}
  }catch(e){if(alive.current&&!signal?.aborted&&version===generation.current)setError((e as Error).message)}
  finally{reading.current=false;if(alive.current)setLoading(false)}
 }
 useEffect(()=>{alive.current=true;generation.current++;setData(null);setLoading(true);const controller=new AbortController();void refresh(controller.signal);const tick=()=>{if(!document.hidden)void refresh(controller.signal)};const timer=setInterval(tick,5000);document.addEventListener('visibilitychange',tick);return()=>{alive.current=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',tick)}},[sessionId]);
 async function mutate(input:RoomAction,currentSession=sessionId){
  if(mutating.current)return false;mutating.current=true;generation.current++;setBusy(true);setError('');
  try{
   const response=await fetch('/api/rooms',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(currentSession?{'X-Arena-Session':currentSession}:{})},body:JSON.stringify(input),signal:AbortSignal.timeout(10000)});
   const result=await response.json() as RoomDirectoryData & {error?:string,retryAfter?:number};if(!response.ok){if(response.status===429&&result.retryAfter)setData(old=>old?{...old,retryAt:Date.now()+result.retryAfter!*1000,now:Date.now()}:old);throw Error(result.error||'Please try again.');}
   if(alive.current)setData(result);return true;
  }catch(e){if(alive.current)setError((e as Error).message);return false}
  finally{mutating.current=false;if(alive.current)setBusy(false)}
 }
 return {data,error,busy,loading,refresh,mutate};
}

export default function RoomDirectory({sessionId,ready,blocked,onPrepare,onJoined,onHost}:{sessionId:string|null,ready:boolean,blocked:string,onPrepare:()=>Promise<string|null>,onJoined:()=>void,onHost:()=>void}){
 const {data,error,busy,loading,refresh,mutate}=useRooms(sessionId),[now,setNow]=useState(Date.now()),[preparing,setPreparing]=useState(false),[requestError,setRequestError]=useState('');
 const nonce=useRef<{roomId:string,id:string}|null>(null),joined=useRef(''),pendingId=useRef(''),clockOffset=useRef(0);
 useEffect(()=>{if(data)clockOffset.current=data.now-Date.now()},[data]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(!data)return;const key='ftw-pending-room:'+sessionId;try{if(!pendingId.current)pendingId.current=sessionStorage.getItem(key)||''}catch{}if(data.request?.state==='pending'){pendingId.current=data.request.id;try{sessionStorage.setItem(key,data.request.id)}catch{}}if(data.request?.state==='accepted'&&pendingId.current===data.request.id&&data.joinedRoomId===data.request.roomId&&joined.current!==data.joinedRoomId){joined.current=data.joinedRoomId!;pendingId.current='';try{sessionStorage.removeItem(key)}catch{}onJoined()}},[data,onJoined,sessionId]);
 const seconds=Math.min(60,Math.max(0,Math.ceil(((data?.retryAt||0)-now-clockOffset.current)/1000))),pending=data?.request?.state==='pending',locked=busy||preparing||!ready;
 async function request(roomId:string){
  if(locked||blocked||pending||seconds)return;setPreparing(true);setRequestError('');
  try{const token=await onPrepare();if(!token)return;if(nonce.current?.roomId!==roomId)nonce.current={roomId,id:clientId()};if(await mutate({action:'request',roomId,requestId:nonce.current.id},token))nonce.current=null;}catch(e){setRequestError((e as Error).message)}finally{setPreparing(false)}
 }
 return <section className="open-rooms" aria-labelledby="open-rooms-title">
  <header><div><h2 id="open-rooms-title">Open rooms</h2><p>Find a table. Meet your next word rival.</p></div><div className="open-rooms-tools"><span className="rooms-live">{error?'Connection interrupted':loading?'Loading rooms…':'Updates automatically'}</span><button type="button" className="room-refresh" aria-label="Refresh open rooms" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/></button><button type="button" className="secondary" disabled={!!blocked||locked} onClick={onHost}>Host a room</button></div></header>
  <p className="room-directory-note">Public rooms only · Host approval · Unrated games</p>
  {(error||requestError)&&<p className="error" role="alert">{error||requestError}</p>}
  {blocked&&<p className="room-directory-note">{blocked}</p>}
  {pending?<div className="room-request-status" role="status"><span>Request sent. Waiting for the host… <small>Requests expire after two minutes.</small></span><button type="button" className="text-button" disabled={busy} onClick={()=>void mutate({action:'cancel',requestId:data!.request!.id})}>Cancel request</button></div>:data?.request?.state==='declined'?<p role="status">The host declined this request. You can try another room when the cooldown ends.</p>:data?.request?.state==='expired'?<p role="status">Your request expired after two minutes. Choose an open room to try again.</p>:data?.request?.state==='accepted'?<p role="status">You’ve been accepted. Your room is ready.</p>:data?.request?.state==='closed'?<p className="room-directory-note">Your previous request has ended.</p>:null}
  {seconds>0&&<p className="room-request-clock" aria-live="off">Next request in <b>{seconds}s</b> · One request per minute across all rooms.</p>}
  <div className="open-room-list" role="list" aria-label="Open public rooms">{data?.rooms.map(room=><article role="listitem" className="open-room-row" key={room.id}><div className="open-room-host"><Tile letter={Array.from(room.host)[0]||'?'}/><div><h3>{room.host}</h3><small>Host · Waiting for players</small><small className="room-languages" aria-label="Accepted languages">English · Español · Deutsch</small></div></div><span className="open-room-seats" aria-label={`${room.players} of ${room.capacity} players`}><Users size={17} aria-hidden="true"/><b>{room.players} / {room.capacity}</b><small>players</small></span><button type="button" className="primary" disabled={locked||!!blocked||!!pending||seconds>0} onClick={()=>void request(room.id)}>{pending&&data?.request?.roomId===room.id?'Requested':preparing?'Preparing…':'Request to join'}</button></article>)}</div>
  {!loading&&!error&&!data?.rooms.length&&<div className="open-rooms-empty"><Users size={26} aria-hidden="true"/><div><h3>No open rooms just yet.</h3><p>Host a public room and give someone a seat.</p></div></div>}
 </section>;
}

export function HostRoomControls({roomId,visibility,sessionId,onChanged}:{roomId:string,visibility:'private'|'public',sessionId:string|null,onChanged:()=>void}){
 const {data,error,busy,loading,mutate}=useRooms(sessionId);
 async function update(input:RoomAction){if(await mutate({...input,roomId}))onChanged()}
 return <div className="host-room-controls"><RoomPrivacy value={visibility} disabled={busy} onChange={value=>void update({action:'privacy',visibility:value})}/>
  {error&&<p className="error" role="alert">{error}</p>}
  {visibility==='public'&&<section className="room-join-requests" aria-label="Room join requests"><h3>Join requests <span>{data?.requests.length||0}</span></h3>{loading?<p role="status">Checking join requests…</p>:data?.requests.length?data.requests.map(request=><div className="room-join-request" key={request.id}><b>{request.name}</b><div><button type="button" className="secondary" disabled={busy} aria-label={`Decline ${request.name}`} onClick={()=>void update({action:'decline',requestId:request.id})}>Decline</button><button type="button" className="primary" disabled={busy} aria-label={`Accept ${request.name}`} onClick={()=>void update({action:'accept',requestId:request.id})}>Accept</button></div></div>):<p>Your room is listed while it has space. Requests will appear here.</p>}</section>}
 </div>;
}
