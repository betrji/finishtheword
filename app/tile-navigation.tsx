import Tile from './tile';

const destinations=[
 {id:'menu',letter:'M',label:'Main menu'},
 {id:'arena',letter:'A',label:'Arena'},
 {id:'community',letter:'C',label:'Community'},
 {id:'guide',letter:'H',label:'How to play'},
 {id:'ranks',letter:'L',label:'Leaderboard'},
 {id:'history',letter:'H',label:'History'},
] as const;
export type NavigationTab=typeof destinations[number]['id'];

export default function TileNavigation({current,onNavigate,requests=0,compact=false}:{current:string,onNavigate:(tab:NavigationTab)=>void,requests?:number,compact?:boolean}){
 return <nav className={'tile-navigation'+(compact?' tile-navigation-compact':'')} aria-label={compact?'Mobile navigation':'Main navigation'}>{destinations.map(({id,letter,label})=>{
  const count=id==='community'?requests:0;
  return <button key={id} type="button" className={'tile-nav-item'+(current===id?' selected':'')} aria-current={current===id?'page':undefined} aria-label={count?`${label}, ${count} friend requests`:label} onClick={e=>{onNavigate(id);if(compact)e.currentTarget.closest('details')?.removeAttribute('open')}}>
   <span className="tile-nav-art" aria-hidden="true"><Tile letter={letter} className="nav-letter"/>{count>0&&<span className="tile-nav-count">{count>9?'9+':count}</span>}</span>
   <span className="tile-nav-label">{label}</span>
  </button>;
 })}</nav>
}
