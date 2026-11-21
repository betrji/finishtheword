import {getDefinition,lookupTarget} from '../../../lib/definitions';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const target=lookupTarget(params.get('word')||'',params.get('language')||undefined,params.get('spelling')||undefined);
 if(!target)return Response.json({error:'Choose a word from the game’s word list.'},{status:400,headers:{'Cache-Control':'no-store'}});
 const result=await getDefinition(target);
 return Response.json(result,{headers:{'Cache-Control':result.status==='unavailable'?'no-store':'public, max-age=300, s-maxage=3600','X-Content-Type-Options':'nosniff'}});
}
