/** VIS-01: Read-only reasons for displayed fog / spatial knowledge.
 * A diagnostic query must never mutate sight, intelligence, or rendering.
 */
import type {Pt} from './breach-core.ts';
import type {Session} from './breach-game.ts';
import {liveVisibility} from './breach-game.ts';
import {exteriorAt,intelFogLevel} from './breach-intel.ts';
import {occupiedFogRooms} from './breach-fog-mask.ts';
export type FogReason='currently-visible'|'occupied-structure'|
  'explored'|'briefed'|'unknown';
export function inspectFogPoint(s:Session,p:Pt){
  const currentlyVisible=liveVisibility(s,p);
  const explored=s.seenGround.has('fine:'+Math.floor(p.x/20)+','+
      Math.floor(p.y/20))||
    s.seenGround.has('micro:'+Math.floor(p.x/10)+','+Math.floor(p.y/10));
  const occupied=occupiedFogRooms(s).some(r=>p.x>=r.x&&
    p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
  const level=intelFogLevel(s.intel,s.site,p,currentlyVisible,explored);
  const reason:FogReason=currentlyVisible?'currently-visible':
    occupied?'occupied-structure':explored?'explored':
    level===1?'briefed':'unknown';
  return {reason,level,currentlyVisible,explored,occupied,
    exterior:exteriorAt(s.site,p),mode:s.intel.mode};
}
