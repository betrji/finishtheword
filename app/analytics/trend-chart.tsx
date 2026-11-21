'use client';
import {useId} from 'react';
type Point={at:number,label:string,value:number|null};
export default function TrendChart({title,points,maxGap=129600000}:{title:string,points:Point[],maxGap?:number}){
 const id=useId(),values=points.filter(p=>p.value!==null),max=Math.max(1,...values.map(p=>p.value!)),first=points[0]?.at||0,last=points.at(-1)?.at||first;
 const x=(p:Point)=>48+(last===first?286:(p.at-first)/(last-first)*572),y=(p:Point)=>174-p.value!/max*144;
 let previous:Point|undefined;
 const path=points.map(p=>{if(p.value===null){previous=undefined;return '';}const gap=previous&&p.at-previous.at>maxGap,command=!previous||gap?'M':'L';previous=p;return `${command}${x(p)},${y(p)}`}).join(' ');
 return <div className="analytics-trend"><h2 id={id}>{title}</h2>{values.length?<><svg viewBox="0 0 640 210" role="img" aria-labelledby={id}><desc>Line chart. Exact values are available in the data table below.</desc>{[0,.5,1].map(t=><g key={t}><line x1="48" x2="620" y1={174-t*144} y2={174-t*144} stroke="var(--line)"/><text x="40" y={178-t*144} textAnchor="end">{Math.round(max*t*10)/10}</text></g>)}<path d={path} fill="none" stroke="var(--green)" strokeWidth="3"/>{values.map(p=><circle key={p.at} cx={x(p)} cy={y(p)} r="3" fill="var(--green)"><title>{`${p.label}: ${p.value}`}</title></circle>)}<text x="48" y="202">{points[0]?.label}</text><text x="620" y="202" textAnchor="end">{points.at(-1)?.label}</text></svg><details><summary>View exact values</summary><div className="analytics-table"><table><thead><tr><th>Time (UTC)</th><th>{title}</th></tr></thead><tbody>{points.map(p=><tr key={p.at}><th scope="row">{p.label}</th><td>{p.value??'Not recorded'}</td></tr>)}</tbody></table></div></details></>:<p className="analytics-empty">No samples recorded yet.</p>}</div>;
}
