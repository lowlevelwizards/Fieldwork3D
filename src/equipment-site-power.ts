/** L1.1: per-session electrical state. No interactive breaker UI here.
 * The current site and simulation own this data; renderers only read it.
 * All mutations are bounded and replace the small state object so replay
 * snapshots never alias later circuit/switch changes.
 */
import type {Site} from './breach-site.ts';
import type {Session} from './breach-game.ts';
import {siteLightingTopology,type LightingMode}
 from './equipment-site-lighting.ts';

export const MAIN_LIGHT_CIRCUITS=['mains:0','mains:1'] as const;
export const BACKUP_LIGHT_CIRCUIT='backup:emergency' as const;
export type SitePowerCircuit=typeof MAIN_LIGHT_CIRCUITS[number]|
 typeof BACKUP_LIGHT_CIRCUIT;
export type SitePowerState={
 /** Preset used to establish the initial physical supply; not a UI mode. */
 mode:LightingMode;
 revision:number;
 circuits:Record<SitePowerCircuit,boolean>;
 /** Includes dark fixtures; missing entries from old saves default ON. */
 switches:Record<string,boolean>;
};
const mainOn=(mode:LightingMode)=>mode!=='blackout'&&mode!=='emergency';
export function createSitePowerState(site:Site,
 mode:LightingMode='day'):SitePowerState{
 const fixtures=siteLightingTopology(site);
 return {
  mode,revision:0,
  circuits:{
   'mains:0':mainOn(mode),'mains:1':mainOn(mode),
   'backup:emergency':!mainOn(mode)
  },
  switches:Object.fromEntries(fixtures.map(f=>[f.id,true]))
 };
}
/** Deliberate mission preset selection resets *unexecuted* power state;
 * it does not mutate the site, fog, world geometry or an existing recording.
 */
export function setSessionLightingMode(s:Session,mode:LightingMode):void{
 if(s.lightingMode===mode&&s.sitePower?.mode===mode)return;
 s.lightingMode=mode;
 s.sitePower=s.site?createSitePowerState(s.site,mode):undefined;
 s.illuminationRevision=(s.illuminationRevision??0)+1;
}
/** In a restored legacy film, missing power fields mean preset-only lighting.
 * Never synthesize future power knowledge from a replay presentation state.
 */
export function copySitePowerState(state:SitePowerState|undefined){
 return state?{
  mode:state.mode,revision:state.revision,
  circuits:{...state.circuits},switches:{...state.switches}
 }:undefined;
}
/** L1.2's physical breaker actions will call this after reachability checks.
 * L1.1 supplies the same bounded authority for deterministic regression tests.
 */
export function setSiteCircuitPower(s:Session,
 id:SitePowerCircuit,on:boolean):boolean{
 if(!s.site||!s.sitePower||s.sitePower.mode!==s.lightingMode||
  !(id in s.sitePower.circuits)||typeof on!=='boolean'||s.sitePower.circuits[id]===on)
  return false;
 s.sitePower={...s.sitePower,revision:s.sitePower.revision+1,
  circuits:{...s.sitePower.circuits,[id]:on}};
 s.illuminationRevision=(s.illuminationRevision??0)+1;
 return true;
}
export function setSiteFixtureSwitch(s:Session,id:string,on:boolean):boolean{
 if(!s.site||!s.sitePower||s.sitePower.mode!==s.lightingMode||
  !Object.hasOwn(s.sitePower.switches,id)||typeof on!=='boolean'||
  s.sitePower.switches[id]===on)return false;
 s.sitePower={...s.sitePower,revision:s.sitePower.revision+1,
  switches:{...s.sitePower.switches,[id]:on}};
 s.illuminationRevision=(s.illuminationRevision??0)+1;
 return true;
}
