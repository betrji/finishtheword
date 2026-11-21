import type {Avatar} from '../lib/avatar';

// Simple, consistent silhouettes for the cosmetic each rank unlocks.
export default function RewardEmblem({accessory,size=64}:{accessory:Avatar['accessory'],size?:number}){
 return <svg className={'reward-art reward-art-'+accessory} width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
  <rect className="reward-stamp" x="2" y="2" width="60" height="60" rx="9"/><g transform="translate(6 6) scale(.8125)"><g className="reward-artwork">
   {accessory==='band'&&<><path className="reward-metal" d="M13 25q19-7 38 0v15q-19-7-38 0z"/><path className="reward-gem" d="m32 23 5 8-5 8-5-8z"/></>}
   {accessory==='visor'&&<><path className="reward-metal" d="M12 24q20-6 40 0l-4 17-12-2-4-5-4 5-12 2z"/><path d="m19 28 2 7 6-1 5-5 5 5 6 1 2-7"/></>}
   {accessory==='laurel'&&<><path d="M29 48C16 43 13 30 20 17M35 48c13-5 16-18 9-31"/><path className="reward-metal" d="M18 26q-8-2-7-9 8 1 7 9Zm1 11q-9 0-10-7 8-1 10 7Zm7 9q-8 4-12-2 6-5 12 2ZM46 26q8-2 7-9-8 1-7 9Zm-1 11q9 0 10-7-8-1-10 7Zm-7 9q8 4 12-2-6-5-12 2Z"/></>}
   {accessory==='halo'&&<><ellipse className="reward-metal" cx="32" cy="32" rx="21" ry="8" transform="rotate(-20 32 32)"/><circle className="reward-gem" cx="50" cy="25" r="3"/></>}
   {accessory==='crystal'&&<><path className="reward-metal" d="m13 25 10 8 9-17 9 17 10-8-5 20H18z"/><path d="M32 16v29M20 49h24"/></>}
   {accessory==='wings'&&<><path className="reward-metal" d="M20 40h-2a10 10 0 0 1-2-20 13 13 0 0 1 24-2 11 11 0 0 1 6 22h-3"/><path className="reward-gem" d="m35 24-13 16h10l-3 13 14-18H33z"/></>}
   {accessory==='flame'&&<><path className="reward-metal" d="M32 51c-18 0-23-15-12-28l2 10c8-6 11-14 10-22 19 15 26 40 0 40Z"/><path d="M32 44c-7-2-7-7 1-14 4 6 6 11-1 14Z"/></>}
   {accessory==='void'&&<><ellipse className="reward-metal" cx="32" cy="32" rx="16" ry="23" transform="rotate(25 32 32)"/><ellipse cx="32" cy="32" rx="10" ry="17" transform="rotate(25 32 32)"/><path className="reward-gem" d="m32 26 4 6-4 6-4-6z"/></>}
  </g></g>
 </svg>;
}
