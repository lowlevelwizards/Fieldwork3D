/** R7A: ballistic exposure is different from being visible.
 * Tests are the same 2.5D height/footprint intersections used by the
 * authoritative combat model. This is a seed-stable offline diagnostic,
 * not an actor-visibility override or a generator of artificial barricades.
 */
import type {Site,Room} from '../breach-site.ts';
import {type Pt,type Obstacle,segmentsCross} from '../breach-core.ts';
import {coverImpactFraction,eyeHeight,aimHeight} from '../breach-cover-height.ts';

type Portal={a:Pt;b:Pt};
const at=(a:Pt,b:Pt):Pt=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const inRoom=(r:Room,p:Pt)=>p.x>=r.x&&p.x<=r.x+r.w&&
 p.y>=r.y&&p.y<=r.y+r.h;
const nearThreshold=(r:Room,p:Pt)=>p.x>=r.x-9&&p.x<=r.x+r.w+9&&
 p.y>=r.y-9&&p.y<=r.y+r.h+9&&
 Math.min(Math.abs(p.x-r.x),Math.abs(p.x-r.x-r.w),
  Math.abs(p.y-r.y),Math.abs(p.y-r.y-r.h))<9;
const occupies=(p:Pt,o:Obstacle,margin=7)=>
 Math.abs(p.x-o.x)<o.w/2+margin&&Math.abs(p.y-o.y)<o.h/2+margin;

/** Up to four grounded threat angles from actual doors and pass-throughs.
 * Sample just INSIDE the room at each aperture. Do not count impossible
 * phantom attackers standing outside a wall as a cover opportunity. */
export function roomThreatPoints(site:Site,room:Room):Pt[]{
 const middle={x:room.x+room.w/2,y:room.y+room.h/2};
 const points:Pt[]=[];
 for(const opening of [...site.doors,...(site.openings??[])] as Portal[]){
  const p=at(opening.a,opening.b);
  if(!nearThreshold(room,p))continue;
  const length=distance(p,middle);
  const from=length<1?p:{
   x:p.x+(middle.x-p.x)*Math.min(12/length,.22),
   y:p.y+(middle.y-p.y)*Math.min(12/length,.22)
  };
  if(inRoom(room,from)&&!points.some(q=>distance(q,from)<8))
   points.push(from);
  if(points.length>=4)break;
 }
 return points;
}
export type BallisticPosition={
 attackAngles:number;standingBlocked:number;crouchedBlocked:number;
 firingAngles:number;
};
/** Height-consistent directional protection and ability to fire back.
 * A near desk can stop a shot at a crouched target while allowing a standing
 * eye line or a 26-unit-high muzzle to see over it. */
export function assessBallisticPosition(site:Site,room:Room,p:Pt,
 props:readonly Obstacle[]=site.cover,threats:readonly Pt[]=roomThreatPoints(site,room)):
 BallisticPosition{
 let attackAngles=0,standingBlocked=0,crouchedBlocked=0,firingAngles=0;
 for(const threat of threats){
  if(distance(p,threat)<9||site.walls.some(w=>segmentsCross({a:threat,b:p},w)))
   continue;
  attackAngles++;
  const hit=(from:Pt,to:Pt,fromHeight:number,toHeight:number)=>
   props.some(o=>coverImpactFraction(from,to,fromHeight,toHeight,o)!==null);
  if(hit(threat,p,eyeHeight(false),aimHeight(false)))standingBlocked++;
  if(hit(threat,p,eyeHeight(false),aimHeight(true)))crouchedBlocked++;
  if(!hit(p,threat,26,32))firingAngles++;
 }
 return {attackAngles,standingBlocked,crouchedBlocked,firingAngles};
}
export type RoomBallisticQuality={
 roomId:string;approaches:number;sampledPositions:number;
 protectedStanding:number;protectedCrouched:number;
 crouchOnlyPositions:number;fullyProtectedCrouched:number;
 unprotectedPositions:number;usableFiringCoverPositions:number;
 blockedStandingFraction:number;blockedCrouchedFraction:number;
};
/** 4×4 bounded standing grid, ignoring cells occupied by real furniture.
 * Count only possible shots across the architectural threshold; walls
 * cannot be misreported as "good furniture cover". */
export function assessRoomBallisticCover(site:Site,room:Room,
 additions:readonly Obstacle[]=[]):RoomBallisticQuality{
 const props=[...site.cover,...additions];
 const threats=roomThreatPoints(site,room);
 let sampledPositions=0,protectedStanding=0,protectedCrouched=0;
 let crouchOnlyPositions=0,fullyProtectedCrouched=0,unprotectedPositions=0;
 let usableFiringCoverPositions=0,blockingStanding=0,blockingCrouched=0,angles=0;
 for(const fx of [.22,.42,.62,.82])for(const fy of [.22,.42,.62,.82]){
  const p={x:room.x+room.w*fx,y:room.y+room.h*fy};
  if(props.some(o=>occupies(p,o)))continue;
  const sample=assessBallisticPosition(site,room,p,props,threats);
  if(!sample.attackAngles)continue;
  sampledPositions++;
  angles+=sample.attackAngles;
  blockingStanding+=sample.standingBlocked;
  blockingCrouched+=sample.crouchedBlocked;
  if(sample.standingBlocked)protectedStanding++;
  if(sample.crouchedBlocked)protectedCrouched++;
  if(!sample.standingBlocked&&sample.crouchedBlocked)crouchOnlyPositions++;
  if(sample.crouchedBlocked===sample.attackAngles)fullyProtectedCrouched++;
  if(!sample.crouchedBlocked)unprotectedPositions++;
  if(sample.crouchedBlocked&&sample.firingAngles)
   usableFiringCoverPositions++;
 }
 return {roomId:room.id,approaches:threats.length,sampledPositions,
  protectedStanding,protectedCrouched,crouchOnlyPositions,
  fullyProtectedCrouched,unprotectedPositions,usableFiringCoverPositions,
  blockedStandingFraction:angles?Math.round(blockingStanding/angles*100)/100:0,
  blockedCrouchedFraction:angles?Math.round(blockingCrouched/angles*100)/100:0};
}
