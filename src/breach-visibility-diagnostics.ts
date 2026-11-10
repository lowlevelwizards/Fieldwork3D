/** VIS-01: Read-only reasons for displayed fog / spatial knowledge.
 * A diagnostic query must never mutate sight, intelligence, or rendering.
 */
import type {Pt} from './breach-core.ts';
import type {Session} from './breach-game.ts';
import {liveVisibility} from './breach-game.ts';
import {exteriorAt} from './breach-intel.ts';
import {preciseGroundEvidenceAt,groundKnowledgeAt,groundFogLevel}
 from './breach-ground-knowledge.ts';
import {occupiedFogRooms} from './breach-fog-mask.ts';
export type FogReason='currently-visible'|'explored'|'briefed'|'unknown';
export function inspectFogPoint(s:Session,p:Pt){
  const currentlyVisible=liveVisibility(s,p);
  const explored=preciseGroundEvidenceAt(s.seenGround,p);
  const occupied=occupiedFogRooms(s).some(r=>p.x>=r.x&&
    p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
  // Occupancy cuts away a roof for a camera, but NEVER reveals the floor.
  const knowledge=groundKnowledgeAt(s.intel.mode,s.site,p,
    currentlyVisible,explored);
  const level=groundFogLevel(knowledge);
  const reason:FogReason=knowledge==='visible'?'currently-visible':
    knowledge==='discovered'?'explored':
    knowledge==='briefed'?'briefed':'unknown';
  return {reason,level,currentlyVisible,explored,occupied,
    exterior:exteriorAt(s.site,p),mode:s.intel.mode};
}
