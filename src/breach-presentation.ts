import {COVER,type Pt,doorCenter,type Door} from './breach-core.ts';
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
  const o=COVER[index];
  if(!o)return 'unknown';
  const hx=o.w/2+2,hy=o.h/2+2;
  return [
    {x:o.x-hx,y:o.y},{x:o.x+hx,y:o.y},
    {x:o.x,y:o.y-hy},{x:o.x,y:o.y+hy},
  ].some(p=>liveVisibility(s,p))?'visible':'remembered';
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
