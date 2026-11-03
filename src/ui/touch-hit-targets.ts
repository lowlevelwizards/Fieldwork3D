/** Pointer-specific tolerances in CSS pixels, independent of world zoom.
 * Keep mouse precision, but accept the wider contact footprint of a finger.
 * This only adjusts UI hit tests, not navigation or line-of-sight rules. */
export type TacticalPointerKind='touch'|'pen'|'mouse'|string;
export type TacticalHitProfile={
  waypoint:number;route:number;reachableDoor:number;dragStart:number;
};
const MOUSE_PROFILE:TacticalHitProfile=Object.freeze({
  waypoint:27,route:14,reachableDoor:28,dragStart:9
});
const PEN_PROFILE:TacticalHitProfile=Object.freeze({
  waypoint:30,route:17,reachableDoor:29,dragStart:11
});
const TOUCH_PROFILE:TacticalHitProfile=Object.freeze({
  waypoint:34,route:20,reachableDoor:31,dragStart:13
});
export function tacticalHitProfile(kind:TacticalPointerKind):TacticalHitProfile{
  return kind==='touch'?TOUCH_PROFILE:kind==='pen'?PEN_PROFILE:MOUSE_PROFILE;
}

/** Use the same finger-sized screen-space tolerance regardless of map zoom. */
export type ScreenHitCandidate={owner:string;distancePx:number};
export function preferSelectedHit<T extends ScreenHitCandidate>(
  hits:readonly T[],selectedOwner:string,selectionSlackPx=7):T|null{
  if(!hits.length)return null;
  const ordered=[...hits].sort((a,b)=>a.distancePx-b.distancePx);
  const closest=ordered[0];
  const selected=ordered.find(hit=>hit.owner===selectedOwner);
  return selected&&selected.distancePx<=closest.distancePx+selectionSlackPx?
    selected:closest;
}
/** Sampling gesture points in screen pixels prevents zoom from changing stroke density. */
export function shouldAppendStrokePoint(
  last:{x:number;y:number},current:{x:number;y:number},stepPx=12):boolean{
  return Math.hypot(last.x-current.x,last.y-current.y)>=stepPx;
}
