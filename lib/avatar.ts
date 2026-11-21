// Stored palette keys stay stable; the inks now belong to the paper-and-board theme.
export const palettes={purple:['#626f76','#36464e','#e4e9e7'],coral:['#ad6550','#713d2f','#f1ded3'],mint:['#52745f','#294d38','#e0e8db'],blue:['#547c8c','#315669','#e0e9e9'],gold:['#a67d37','#705017','#f1e6c8'],pink:['#9b5b55','#663830','#eedbd3']};
export const paletteNames={purple:'Slate',coral:'Clay',mint:'Forest',blue:'Ocean',gold:'Ochre',pink:'Rose'};
export type Avatar={color:keyof typeof palettes,shape:'cat'|'bear'|'bunny',accessory:'none'|'glasses'|'crown'|'cap'|'band'|'visor'|'laurel'|'halo'|'crystal'|'wings'|'flame'|'void'};
export const defaultAvatar:Avatar={color:'mint',shape:'cat',accessory:'none'};
export function sanitizeAvatar(value:unknown):Avatar{const a=(value&&typeof value==='object'?value:{}) as Partial<Avatar>;return {color:a.color&&Object.hasOwn(palettes,a.color)?a.color:defaultAvatar.color,shape:['cat','bear','bunny'].includes(a.shape||'')?a.shape!:'cat',accessory:['none','glasses','crown','cap',...rankRewards.map(r=>r.accessory)].includes(a.accessory||'')?a.accessory!:'none'}};

export const rankRewards:{rank:string,min:number,accessory:Avatar['accessory'],name:string,symbol:string}[]=[
{rank:'Bronze',min:0,accessory:'band',name:'Contender band',symbol:'≋'},
{rank:'Silver',min:900,accessory:'visor',name:'Silver visor',symbol:'▰'},
{rank:'Gold',min:1100,accessory:'laurel',name:'Golden laurels',symbol:'♛'},
{rank:'Platinum',min:1300,accessory:'halo',name:'Orbit halo',symbol:'◯'},
{rank:'Diamond',min:1500,accessory:'crystal',name:'Crystal crown',symbol:'♢'},
{rank:'Elite',min:1800,accessory:'wings',name:'Storm seal',symbol:'ϟ'},
{rank:'Champion',min:2100,accessory:'flame',name:'Phoenix seal',symbol:'♨'},
{rank:'Unreal',min:2400,accessory:'void',name:'Eclipse seal',symbol:'✦'}];
export function earnedAvatar(value:unknown,peakRating:number):Avatar{const a=sanitizeAvatar(value),reward=rankRewards.find(r=>r.accessory===a.accessory);return reward&&peakRating<reward.min?{...a,accessory:'none'}:a;}
