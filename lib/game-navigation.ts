const tabs=['menu','arena','community','guide','ranks','history'];
export function gameTab(path:string,search=''){
 if(path.replace(/\/$/,'')==='/arena')return 'arena';
 const view=new URLSearchParams(search).get('view');
 return view&&tabs.includes(view)?view:'menu';
}
export function gamePath(tab:string,current:string){
 const url=new URL(current,'https://finishtheword.com');
 url.pathname=tab==='arena'?'/arena':'/';url.searchParams.delete('view');
 if(tab!=='menu'&&tab!=='arena')url.searchParams.set('view',tab);
 return url.pathname+url.search+url.hash;
}
