import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {isAnalyticsOwner} from '../../../../lib/analytics-access';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await getChatGPTUser();
 return Response.json({owner:isAnalyticsOwner(user,(env as unknown as Record<string,unknown>).FTW_ANALYTICS_OWNER_EMAIL)},{headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
