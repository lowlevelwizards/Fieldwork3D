import {sessionWorldGeometry} from './breach-world-context.ts';
import {type Pt,doorCenter,type Door} from './breach-core.ts';
import type {WideOpening} from './breach-site.ts';
import {preciseGroundEvidenceAt} from './breach-ground-knowledge.ts';
import {accessibleExteriorWall} from './breach-site-footprint.ts';
import {type Session,type ShotEvent,liveVisibility,knownAt} from './breach-game.ts';

/**
 * Shared tactical presentation policy.
 * It never determines hits, changes health or reveals hidden world state.
 * Both Canvas2D and Three.js must apply the same visibility decisions.
 */
/** Historical cover discovery is authoritative in live and team-sight replay.
 * A visible footprint is observed only after the simulation records it. */
export function coverPresentation(s:Session,index:number,omniscient=false):
  'unknown'|'remembered'|'visible'{
  if(omniscient)return 'visible';
  if(!s.intel.cover.has(index))return 'unknown';
  const o=s.coverState[index];
  if(!o)return 'unknown';
  const hx=o.w/2+2,hy=o.h/2+2;
  return [
    {x:o.x-hx,y:o.y},{x:o.x+hx,y:o.y},
    {x:o.x,y:o.y-hy},{x:o.x,y:o.y+hy},
  ].some(p=>liveVisibility(s,p))?'visible':'remembered';
}
/** VIS-04: One structural/object knowledge policy for both world renderers.
 * This returns a PRESENTATION state, never an AI or gameplay sight grant.
 */
export type SpatialSurfaceKind='wall'|'room'|'door'|'cover';
export type SpatialSurfaceState='unknown'|'briefed'|'remembered'|
 'visible';
/** Knowledge-only predicate for callers that merely gate scene geometry.
 * Unlike spatialSurfaceState(), this performs zero live LOS rays and never
 * upgrades an unknown surface into a known one. Exact same !unknown result.
 * Keep the full classification for code that needs visible vs remembered.
 */
export function spatialSurfaceKnown(s:Session,kind:SpatialSurfaceKind,
 key:number|string,omniscient=false):boolean{
 if(omniscient||s.intel.mode==='full-view')return true;
 if(kind==='cover')return s.intel.cover.has(Number(key))&&
   !!s.coverState[Number(key)];
 if(kind==='room')return s.intel.rooms.has(String(key));
 if(kind==='wall')return s.intel.walls.has(Number(key));
 return s.intel.doors.has(String(key));
}
export function spatialSurfaceState(s:Session,kind:SpatialSurfaceKind,
 key:number|string,omniscient=false):SpatialSurfaceState{
 if(omniscient||s.intel.mode==='full-view')return 'visible';
 if(kind==='cover')return coverPresentation(s,Number(key),omniscient);
 if(kind==='room'){
  const room=s.site?.rooms.find(r=>r.id===key);
  if(!s.intel.rooms.has(String(key)))return 'unknown';
  if(!room)return 'remembered';
  const p={x:room.x+room.w/2,y:room.y+room.h/2};
  if(liveVisibility(s,p))return 'visible';
  return s.intel.mode==='floor-plan'?'briefed':'remembered';
 }
 if(kind==='wall'){
  const i=Number(key);
  if(!s.intel.walls.has(i))return 'unknown';
  const wall=sessionWorldGeometry(s).walls[i];
  if(wall&&liveVisibility(s,{x:(wall.a.x+wall.b.x)/2,
    y:(wall.a.y+wall.b.y)/2}))return 'visible';
  return s.intel.mode==='floor-plan'||s.intel.mode==='exterior-known'?
    'briefed':'remembered';
 }
 if(!s.intel.doors.has(String(key)))return 'unknown';
 const door=s.doors.find(d=>d.id===key);
 if(door&&liveVisibility(s,doorCenter(door)))return 'visible';
 return s.intel.doorMemory.has(String(key))?'remembered':'briefed';
}
/** A wide arch or service counter is architecture, but is NOT a wall
 * index or a discovered room. Hide it until it is physically observed,
 * remembered locally, or legitimately included in the briefing. */
export function architecturalOpeningKnown(s:Session,opening:WideOpening,
 omniscient=false):boolean{
 if(omniscient||s.intel.mode==='full-view'||s.intel.mode==='floor-plan')
  return true;
 if(s.intel.mode==='exterior-known'&&
    accessibleExteriorWall(s.site,opening))return true;
 const dx=opening.b.x-opening.a.x,dy=opening.b.y-opening.a.y;
 const length=Math.hypot(dx,dy);
 if(length<.001)return false;
 const middle={x:(opening.a.x+opening.b.x)/2,
   y:(opening.a.y+opening.b.y)/2};
 const nx=-dy/length,ny=dx/length;
 // Sample both sides of the open threshold. The midpoint may coincide
 // with a ray/segment boundary and not itself register as visible.
 for(const sign of [-1,1]){
   const p={x:middle.x+nx*8*sign,y:middle.y+ny*8*sign};
   if(liveVisibility(s,p))return true;
   if(preciseGroundEvidenceAt(s.seenGround,p))return true;
 }
 return false;
}
export type ShotVisibility={flash:boolean;trace:boolean;impact:boolean};
export function shotVisibility(s:Session,shot:ShotEvent):ShotVisibility{
  const muzzleKnown=shot.side==='blue'||liveVisibility(s,shot.start);
  const endKnown=liveVisibility(s,shot.end);
  return {
    flash:muzzleKnown,
    trace:muzzleKnown&&endKnown,
    impact:endKnown,
  };
}
/** The board is allowed to show remembered architecture, not unseen updates. */
export function doorVisibility(s:Session,door:Door){
  const p=doorCenter(door);
  const live=liveVisibility(s,p);
  return {known:live||knownAt(s,p.x,p.y),live};
}
export function corpseVisible(s:Session,p:Pt,side:'blue'|'red'){
  return side==='blue'||liveVisibility(s,p);
}
export function contactFade(age:number,duration:number){
  return Math.max(0,Math.min(1,1-age/duration));
}
export function combatCue(shot:ShotEvent):'down'|'hit'|'miss'{
  return shot.down?'down':shot.hit?'hit':'miss';
}
