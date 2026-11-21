import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {requireChatGPTUser,chatGPTSignOutPath} from '../chatgpt-auth';
import {isAnalyticsOwner} from '../../lib/analytics-access';
import {adminSession,canLinkAdministrator} from '../../lib/admin-access';
import type {State} from '../../lib/game';
import ModerationDashboard from './moderation-dashboard';
export const dynamic='force-dynamic';
export const metadata={title:'Moderation | Finish the Word',robots:{index:false,follow:false}};
export default async function Admin(){
 const user=await requireChatGPTUser('/admin');
 if(!isAnalyticsOwner(user,(env as unknown as Record<string,unknown>).FTW_ANALYTICS_OWNER_EMAIL))return <main className="moderation-shell"><h1>Owner access only.</h1><p>Sign in with the account that owns Finish the Word.</p><a href={chatGPTSignOutPath('/admin')} target="_top">Switch account</a> · <a href="/">Back to game</a></main>;
 try{
  const row=await env.DB!.prepare("SELECT data FROM arena WHERE id='lobby'").first<{data:string}>();
  const state:State=row?JSON.parse(row.data):{queue:[],matches:[]};
  if(canLinkAdministrator(state,adminSession(await headers()),user,(env as unknown as Record<string,unknown>).FTW_ANALYTICS_OWNER_EMAIL))return <ModerationDashboard/>;
 }catch{return <main className="moderation-shell"><h1>Admin access unavailable.</h1><p>We could not verify your saved profile. Please try again.</p><a href="/">Back to game</a></main>}
 return <main className="moderation-shell"><h1>Use your vecaid profile.</h1><p>Admin tools require your verified owner account and your saved vecaid game profile. Restore that profile in the game to continue.</p><a href="/">Back to game</a></main>;
}
