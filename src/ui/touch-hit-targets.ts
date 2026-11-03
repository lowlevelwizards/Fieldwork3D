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


/** Collapse finger samples into the few authored turns that describe the
 * stroke. Pixel-space deviation preserves its visible silhouette in both
 * orthographic and isometric cameras; the caller may veto a shortcut that
 * would cut through known furniture or walls. Endpoints are always retained.
 */
export function simplifyStrokePoints<T extends {x:number;y:number}>(
 points:readonly T[],project:(point:T)=>{x:number;y:number},
 tolerancePx=15,shortcutSafe?:(a:T,b:T)=>boolean):T[]{
 if(points.length<=2)return [...points];
 const projected=points.map(project);
 const keep=new Set<number>([0,points.length-1]);
 const lengthSquared=(a:{x:number;y:number},b:{x:number;y:number})=>
  (b.x-a.x)**2+(b.y-a.y)**2;
 const deviation=(point:{x:number;y:number},a:{x:number;y:number},
   b:{x:number;y:number})=>{
  const square=lengthSquared(a,b);
  if(square<.000001)return Math.hypot(point.x-a.x,point.y-a.y);
  const t=Math.max(0,Math.min(1,
   ((point.x-a.x)*(b.x-a.x)+(point.y-a.y)*(b.y-a.y))/square));
  return Math.hypot(point.x-(a.x+(b.x-a.x)*t),
   point.y-(a.y+(b.y-a.y)*t));
 };
 const visit=(from:number,to:number):void=>{
  if(to-from<=1)return;
  let peak=-1,split=Math.floor((from+to)/2);
  for(let i=from+1;i<to;i++){
   const error=deviation(projected[i],projected[from],projected[to]);
   if(error>peak){peak=error;split=i;}
  }
  if(peak<=tolerancePx&&(!shortcutSafe||
      shortcutSafe(points[from],points[to])))return;
  keep.add(split);visit(from,split);visit(split,to);
 };
 visit(0,points.length-1);
 return [...keep].sort((a,b)=>a-b).map(index=>points[index]);
}
