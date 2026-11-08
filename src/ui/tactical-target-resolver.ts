/** Tactical map picking. All distances are projected CSS pixels, not world units.
 * Keep this module pure: it chooses intent, never changes a plan or selection.
 * A precisely touched object beats a nearby selection halo. */
export type TacticalPickKind=
  'operator'|'node'|'watch'|'activeWatch'|'flash'|'problem'|'door'|'route';
export type TacticalPick={
  kind:TacticalPickKind;
  distancePx:number;
  corePx:number;
  haloPx?:number;
  owner?:string;
  nodeId?:number;
  routeIndex?:number;
  routePoint?:{x:number;y:number};
  doorId?:string;
};
const TIE_PX=5;
const kindRank:Record<TacticalPickKind,number>={
  problem:0,activeWatch:1,watch:2,flash:3,
  operator:4,node:5,door:6,route:7
};
/** Selection priority only breaks genuinely close geometric ties.
 * Selection history, hidden actors and world-unit proximity play no role. */
export function resolveTacticalPick(
  candidates:readonly TacticalPick[],selectedOwner:string,
):TacticalPick|null{
  const direct=candidates.filter(c=>Number.isFinite(c.distancePx)&&
    c.distancePx<=c.corePx);
  const eligible=direct.length?direct:candidates.filter(c=>
    c.haloPx!==undefined&&Number.isFinite(c.distancePx)&&
    c.distancePx<=c.haloPx);
  if(!eligible.length)return null;
  return [...eligible].sort((a,b)=>{
    // At an actual route crossing, the currently selected route retains
    // insertion rights. Tapping another route away from a crossing switches
    // selection only; it does not mutate the foreign plan.
    if(a.kind==='route'&&b.kind==='route'&&a.owner!==b.owner){
      if(a.owner===selectedOwner)return -1;
      if(b.owner===selectedOwner)return 1;
    }
    // An actual marker, miniature or door leaf cannot be stolen by a
    // movement line running underneath it. Both were direct hits.
    if(a.kind==='route'&&b.kind!=='route')return 1;
    if(b.kind==='route'&&a.kind!=='route')return -1;
    const delta=a.distancePx-b.distancePx;
    if(Math.abs(delta)>TIE_PX)return delta;
    // Direct object type breaks a near-tie before ownership. Otherwise a
    // selected route can swallow its own doorway or another direct handle.
    const rank=kindRank[a.kind]-kindRank[b.kind];
    if(rank!==0)return rank;
    if(a.owner!==b.owner){
      if(a.owner===selectedOwner)return -1;
      if(b.owner===selectedOwner)return 1;
    }
    if(delta!==0)return delta;
    // Stable regardless of actor array iteration order.
    const first=(a.owner??'')+':'+(a.nodeId??'')+':'+(a.doorId??'');
    const second=(b.owner??'')+':'+(b.nodeId??'')+':'+(b.doorId??'');
    return first.localeCompare(second);
  })[0];
}
/** Distance to the actual projected visible door leaf, not a cluster of
 * broad circles that can swallow floor taps around a doorway. */
export function screenSegmentDistance(
  point:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}
):number{
  const dx=b.x-a.x,dy=b.y-a.y,denom=dx*dx+dy*dy;
  const t=denom>1e-6?
    Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/denom)):0;
  return Math.hypot(point.x-(a.x+dx*t),point.y-(a.y+dy*t));
}
/** A tap can be slightly imprecise. A WATCH drag requires intentional travel. */
export function watchDragReady(displacementPx:number,pointerKind:string):boolean{
  return displacementPx>=(pointerKind==='touch'?20:pointerKind==='pen'?14:9);
}
