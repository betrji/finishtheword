import {isAnalyticsOwner} from './analytics-access';
import {isAdministratorProfile,type State} from './game';

type Owner={userId:string,email:string}|null;
export function adminSession(headers:Headers){
 const cookie=headers.get('cookie')?.match(/(?:^|;\s*)arena_player=([^;]*)/)?.[1];
 const valid=(value:string|null|undefined)=>!!value&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
 return valid(cookie)?cookie!:valid(headers.get('X-Arena-Session'))?headers.get('X-Arena-Session')!:'';
}

// Linking requires both the platform-authenticated owner and possession of the
// saved vecaid profile. Once linked, a rename can never transfer this role.
export function canLinkAdministrator(state:State,session:string,user:Owner,ownerEmail:unknown){
 if(!isAnalyticsOwner(user,ownerEmail))return false;
 const profile=state.profiles?.[session],link=state.administrator;
 if(!profile?.publicId||profile.agent||profile.ban||profile.name.trim().toLowerCase()!=='vecaid')return false;
 if(Object.values(state.profiles||{}).filter(p=>p.name.trim().toLowerCase()==='vecaid').length!==1)return false;
 return !link||(link.publicId===profile.publicId&&link.ownerUserId===user!.userId);
}

export function hasAdminAccess(state:State,session:string,user:Owner,ownerEmail:unknown){
 return isAnalyticsOwner(user,ownerEmail)&&state.administrator?.ownerUserId===user?.userId&&isAdministratorProfile(state,state.profiles?.[session]);
}
