'use client';
import {useEffect,useState} from 'react';
import AdminBadge from '../admin-badge';
import FeedbackInbox from '../analytics/feedback-inbox';
import type {moderationSnapshot} from '../../lib/moderation';
type Data=ReturnType<typeof moderationSnapshot>;
export default function ModerationDashboard(){
 const [data,setData]=useState<Data|null>(null),[query,setQuery]=useState(''),[reason,setReason]=useState(''),[target,setTarget]=useState<Data['players'][number]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(action='read',targetId?:string,search=query){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/moderation',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,targetId,query:search,reason}),signal:AbortSignal.timeout(10000)});const d=await r.json() as Data & {error?:string};if(!r.ok)throw Error(d.error||'Please retry.');setData(d);if(action!=='read'){setTarget(null);setReason('');setNotice(action==='ban'?'Player banned.':action==='unban'?'Ban removed.':action==='claim_badge'?'':'Message deleted.');}}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 useEffect(()=>{void load('claim_badge')},[]);
 return <main className="moderation-shell"><div className="moderation-heading"><div><a href="/">← Back to game</a><h1>Moderation</h1><p>Public chat and player access. Only your verified owner account using the saved vecaid profile can use these controls.</p></div><a className="secondary" href="/analytics">Analytics</a></div>
  <p className="fine">Your Admin badge is visible to everyone on the linked vecaid profile. Other profiles cannot use these controls. Bans apply to saved player profiles; a ban also removes the player from queues and rooms and forfeits their active match.</p>
  {error&&<p role="alert" className="error">{error}</p>}<p role="status">{!data&&busy?'Loading admin tools…':notice}</p>
  {data&&<dl className="moderation-overview">{Object.entries({Players:data.overview.profiles,'Online now':data.overview.online,Queue:data.overview.queued,'Active matches':data.overview.matches,Banned:data.overview.banned,'Open reports':data.overview.openReports}).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value.toLocaleString()}</dd></div>)}</dl>}
  <FeedbackInbox moderation onFindPlayer={id=>{setQuery(id);void load('read',undefined,id);document.getElementById('player-search')?.focus()}}/>
  <div className="moderation-grid"><section><h2>Public chat</h2><button className="secondary" disabled={busy} onClick={()=>void load()}>Refresh</button><div className="moderation-messages">{data?.messages.slice().reverse().map(m=><article key={m.id}><div><b>{m.name}</b><AdminBadge admin={m.admin}/><time>{new Date(m.at).toLocaleString()}</time></div><p>{m.text}</p><button disabled={busy} className="text-button" onClick={()=>{if(confirm(`Delete this public message from ${m.name}?`))void load('delete_message',m.id)}}>Delete message</button></article>)}{data&&!data.messages.length&&<p>No recent public messages.</p>}</div></section>
  <section><h2>Players</h2><form className="moderation-search" onSubmit={e=>{e.preventDefault();void load()}}><label htmlFor="player-search">Find a player by name</label><div><input id="player-search" value={query} maxLength={80} onChange={e=>setQuery(e.target.value)}/><button className="secondary" disabled={busy}>Search</button></div></form>{data&&<p className="fine">Showing {data.players.length} of {data.total}. Search to narrow the list.</p>}
   {target&&<form className="moderation-confirm" onSubmit={e=>{e.preventDefault();void load('ban',target.publicId)}}><h3>Ban {target.name}?</h3><p>They will lose access to play and chat on this profile. You can lift the ban here.</p><label htmlFor="ban-reason">Reason</label><input id="ban-reason" required maxLength={200} value={reason} onChange={e=>setReason(e.target.value)}/><div><button className="primary" disabled={busy||!reason.trim()}>Confirm ban</button><button type="button" className="secondary" disabled={busy} onClick={()=>setTarget(null)}>Cancel</button></div></form>}
   <div className="moderation-players">{data?.players.map(p=><article key={p.publicId}><div><b>{p.name}</b><AdminBadge admin={p.admin}/><small>{p.banned?'Banned':'Active'}</small>{p.reason&&<p>{p.reason}</p>}</div>{!p.admin&&<button className="secondary" disabled={busy} onClick={()=>{if(p.banned){if(confirm(`Lift the ban for ${p.name}?`))void load('unban',p.publicId)}else{setTarget(p);setReason('')}}}>{p.banned?'Lift ban':'Ban player'}</button>}</article>)}</div>
  </section></div><details className="moderation-log"><summary>Recent moderation actions</summary>{data?.log.map((entry,i)=><p key={`${entry.at}:${i}`}>{new Date(entry.at).toLocaleString()} · {entry.action.replaceAll('_',' ')} · {entry.targetId}{entry.reason?` · ${entry.reason}`:''}</p>)}</details>
 </main>;
}
