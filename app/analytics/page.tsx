import {env} from 'cloudflare:workers';
import {requireChatGPTUser,chatGPTSignOutPath} from '../chatgpt-auth';
import {isAnalyticsOwner} from '../../lib/analytics-access';
import Dashboard from './dashboard';
export const dynamic='force-dynamic';
export const metadata={title:'Owner analytics | Finish the Word',robots:{index:false,follow:false},alternates:{canonical:'/analytics'}};
export default async function Analytics(){
  const user=await requireChatGPTUser('/analytics');
  if(!isAnalyticsOwner(user,(env as unknown as Record<string,unknown>).FTW_ANALYTICS_OWNER_EMAIL))return <main className="analytics-shell"><section className="panel analytics-card"><h1>Owner access only.</h1><p>Sign in with the ChatGPT account that owns Finish the Word.</p><a href={chatGPTSignOutPath('/analytics')} target="_top">Switch account</a> · <a href="/">Back to game</a></section></main>;
  return <Dashboard/>;
}
