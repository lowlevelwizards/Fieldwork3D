/** A reproducible Quick Play recipe; this is NOT a second site generator.
 * UI choices are resolved before the worker starts, using separate hash lanes
 * so selecting one dimension cannot unexpectedly reroll another.
 */
import type {BuildingArchetype,SiteScale} from './breach-site.ts';
import type {OperationKind} from './breach-operations.ts';
import {BUILDING_ARCHETYPES} from './breach-archetypes.ts';

export type QuickPlaySize='random'|'small'|'medium'|'large';
export type QuickPlayMission='random'|OperationKind;
export type QuickPlayPresence='random'|'light'|'typical'|'heavy';
export type QuickPlayCivilians='scenario'|'on'|'off';
export type QuickPlaySettings={
 seed:number|null;size:QuickPlaySize;
 buildings:BuildingArchetype[];
 mission:QuickPlayMission;
 presence:QuickPlayPresence;
 civilians:QuickPlayCivilians;
};
export type ResolvedQuickPlay={
 seed:number;scale:SiteScale;archetype:BuildingArchetype;
 mission:OperationKind;presence:Exclude<QuickPlayPresence,'random'>;
 civilians:QuickPlayCivilians;
};
export const QUICK_PLAY_BUILDINGS:readonly BuildingArchetype[]=BUILDING_ARCHETYPES;
export const QUICK_PLAY_MISSIONS:readonly OperationKind[]=
 ['clear','intel','rescue','hold','capture'];
export function defaultQuickPlaySettings():QuickPlaySettings{
 return {seed:null,size:'random',buildings:[...QUICK_PLAY_BUILDINGS],
   mission:'random',presence:'random',civilians:'scenario'};
}
function pick(seed:number,salt:number,count:number):number{
 let x=(seed^salt)>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d)>>>0;
 x=Math.imul(x^(x>>>15),0x846ca68b)>>>0;
 return ((x^(x>>>16))>>>0)%count;
}
export function resolveQuickPlaySettings(
 settings:QuickPlaySettings,randomSeed:number
):ResolvedQuickPlay{
 const seed=settings.seed??randomSeed;
 if(!Number.isInteger(seed)||seed<1||seed>0xffffffff)
   throw new Error('Seed must be an integer from 1 to 4294967295');
 const enabled=QUICK_PLAY_BUILDINGS.filter(b=>settings.buildings.includes(b));
 if(!enabled.length)throw new Error('Select at least one building type');
 const size=settings.size==='random'?
  (['small','medium','large'] as const)[pick(seed,0x17c2,3)]:settings.size;
 const mission=settings.mission==='random'?
  QUICK_PLAY_MISSIONS[pick(seed,0xa001,QUICK_PLAY_MISSIONS.length)]:
  settings.mission;
 const presence=settings.presence==='random'?
  (['light','typical','heavy'] as const)[pick(seed,0x9f57,3)]:
  settings.presence;
 return {seed,scale:size,
   archetype:enabled[pick(seed,0x30e3,enabled.length)],
   mission,presence,civilians:settings.civilians};
}
