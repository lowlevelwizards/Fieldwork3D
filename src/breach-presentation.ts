import {COVER,WALLS,type Pt,doorCenter,type Door} from './breach-core.ts';
import {type Session,type ShotEvent,liveVisibility,knownAt,team} from './breach-game.ts';

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
  const o=COVER[index];
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
 'visible'|'occupied-structure';
export function spatialSurfaceState(s:Session,kind:SpatialSurfaceKind,
 key:number|string,omniscient=false):SpatialSurfaceState{
 if(omniscient||s.intel.mode==='full-view')return 'visible';
 if(kind==='cover')return coverPresentation(s,Number(key),omniscient);
 if(kind==='room'){
  const room=s.site?.rooms.find(r=>r.id===key);
  if(room&&team(s).some(a=>a.health>0&&
    a.p.x>room.x+4&&a.p.x<room.x+room.w-4&&
    a.p.y>room.y+4&&a.p.y<room.y+room.h-4))
    return 'occupied-structure';
  if(!s.intel.rooms.has(String(key)))return 'unknown';
  if(!room)return 'remembered';
  const p={x:room.x+room.w/2,y:room.y+room.h/2};
  if(liveVisibility(s,p))return 'visible';
  return s.intel.mode==='floor-plan'?'briefed':'remembered';
 }
 if(kind==='wall'){
  const i=Number(key);
  if(!s.intel.walls.has(i))return 'unknown';
  const wall=WALLS[i];
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
