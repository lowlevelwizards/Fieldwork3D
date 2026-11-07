/** Build 150: the last check before ignition uses the same physical
 * muzzle and 2.5D material heights that actual projectiles use. Sight
 * from the eyes is not permission to fire through waist-high furniture. */
import {segmentsCross,doorLeafSegment,type Door,type Obstacle,
  type Segment,type Pt} from './breach-core.ts';
import {coverImpactFraction} from './breach-cover-height.ts';
export type FireBlock='clear'|'wall'|'door'|'cover'|'friendly';
export type FireLane={blocker:FireBlock;point?:Pt};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function assessFireLane(from:Pt,muzzleHeight:number,to:Pt,
  targetHeight:number,cover:readonly Obstacle[],walls:readonly Segment[],
  doors:readonly Door[],friends:readonly Pt[]=[],
  purpose:'projectile'|'weapon'='projectile'):FireLane{
  const ray={a:from,b:to};
  if(walls.some(w=>segmentsCross(ray,w)))return {blocker:'wall'};
  if(doors.some(d=>
    (purpose==='weapon'||!['glazed','french','mesh-gate','screen'].includes(d.style??'wood'))&&
    segmentsCross(ray,doorLeafSegment(d))))
    return {blocker:'door'};
  if(cover.some(c=>(purpose==='weapon'||c.fixture!=='glass-barrier')&&
    coverImpactFraction(from,to,muzzleHeight,targetHeight,c)!==null))
    return {blocker:'cover'};
  const dx=to.x-from.x,dy=to.y-from.y;
  const total=distance(from,to);
  if(total>0.0001){
    const ux=dx/total,uy=dy/total;
    for(const p of friends){
      const px=p.x-from.x,py=p.y-from.y;
      const along=px*ux+py*uy;
      const across=Math.abs(px*uy-py*ux);
      // The first 12 world units after the muzzle used to be a blind
      // zone: a teammate immediately ahead of the barrel could occupy the
      // actual outgoing shot corridor without vetoing ignition. The shooter
      // is already excluded by the caller; protect the whole forward ray,
      // including point-blank overlapping squad positions. Teammates behind
      // the muzzle or outside the physical corridor do not block a shot.
      if(along>=0&&along<total-8&&across<10.5)
        return {blocker:'friendly',point:p};
    }
  }
  return {blocker:'clear'};
}

/** Acquisition and ignition must agree on whether actual cover can be
 * defeated by the current projectile. Only COVER can be penetrated by this
 * decision; walls, doors and teammates remain hard target-selection vetoes.
 * The caller supplies an immutable preview from authoritative ballistics.
 */
export function fireLaneReachable(lane:FireLane,
 preview:{end:Pt;remaining:number}|null,target:Pt):boolean{
 if(lane.blocker==='clear')return true;
 if(lane.blocker!=='cover'||!preview)return false;
 return preview.remaining>.015&&distance(preview.end,target)<.5;
}
