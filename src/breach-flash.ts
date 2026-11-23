/** Straight-line flashbang flights with explicit reach-only corner hooks
 * and at most one real wall reflection. The first segment of a 'doorway'
 * path is the operator's physical arm positioning, NOT airborne movement.
 * The timed simulation samples only flight segments.
 */
import type {SessionWorldGeometry} from './breach-world-context.ts';
import {doorBlocksRay,WALLS,segmentsCross,type Pt,type Door}
 from './breach-core.ts';
export type ThrowPath={points:Pt[];mode:'direct'|'doorway'|'bank';
 valid:boolean;reason?:string;via?:Pt};
type Segment={a:Pt;b:Pt};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(a:Pt,b:Pt):Pt=>{
 const gap=Math.max(.001,dist(a,b));
 return {x:(b.x-a.x)/gap,y:(b.y-a.y)/gap};
};
const move=(p:Pt,dir:Pt,n:number):Pt=>
 ({x:p.x+dir.x*n,y:p.y+dir.y*n});
const blocked=(from:Pt,to:Pt,doors:Door[],
 world?:Pick<SessionWorldGeometry,'walls'>)=>{
 const seg={a:from,b:to};
 return (world?.walls??WALLS).some(w=>segmentsCross(seg,w))||
   doorBlocksRay(doors,seg);
};
const reachableCorner=(from:Pt,to:Pt,corner:Pt,doors:Door[],
 world?:Pick<SessionWorldGeometry,'walls'>):boolean=>{
 if(dist(from,corner)>29||dist(from,corner)<4||dist(to,corner)<15)
   return false;
 const near=move(corner,unit(corner,from),1.6);
 const out=move(corner,unit(corner,to),2.5);
 // The arm reaches the actual same-side corner, and the grenade starts
 // beyond the edge on a physically clear outward ray. There is no curved
 // airborne path or third-segment auto-navigation through a door.
 return !blocked(from,near,doors,world)&&!blocked(out,to,doors,world);
};
const wallBank=(from:Pt,to:Pt,wall:Segment,doors:Door[],
 world?:Pick<SessionWorldGeometry,'walls'>):ThrowPath|null=>{
 const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y;
 const len=Math.hypot(dx,dy);
 if(len<10)return null;
 const nx=-dy/len,ny=dx/len;
 const a=(from.x-wall.a.x)*nx+(from.y-wall.a.y)*ny;
 const b=(to.x-wall.a.x)*nx+(to.y-wall.a.y)*ny;
 // Reflection, not penetration: source and landing must be on the SAME
 // unobstructed side of the reflecting wall.
 if(a*b<=0||Math.abs(a)<4||Math.abs(b)<4)return null;
 const mirror={x:to.x-2*b*nx,y:to.y-2*b*ny};
 const direction=unit(from,mirror);
 const denominator=direction.x*nx+direction.y*ny;
 if(Math.abs(denominator)<.0001)return null;
 const run=-a/denominator;
 if(run<=4||run>=dist(from,mirror)-4)return null;
 const hit=move(from,direction,run);
 const along=((hit.x-wall.a.x)*dx+(hit.y-wall.a.y)*dy)/(len*len);
 if(along<=.08||along>=.92)return null;
 const incoming=unit(from,hit),outgoing=unit(hit,to);
 const approach=move(hit,incoming,-2.1),exit=move(hit,outgoing,2.1);
 if(blocked(from,approach,doors,world)||blocked(exit,to,doors,world))
   return null;
 if(dist(from,hit)+dist(hit,to)>260)return null;
 return {points:[from,hit,to],via:hit,mode:'bank',valid:true};
};
export function validateThrow(from:Pt,to:Pt,doors:Door[],
 plannedOpen:string[]=[],world?:Pick<SessionWorldGeometry,'walls'>):ThrowPath{
 const range=dist(from,to);
 if(range<12||range>215)return {points:[from,to],mode:'direct',
   valid:false,reason:'OUT OF THROW RANGE'};
 const available=doors.map(door=>({...door,
   open:door.open||plannedOpen.includes(door.id),
   openFraction:plannedOpen.includes(door.id)?1:door.openFraction}));
 if(!blocked(from,to,available,world))
   return {points:[from,to],mode:'direct',valid:true};
 // A pivot is a REAL doorframe or wall endpoint within hand reach;
 // never the center of a doorway that the grenade magically visits.
 let hook:ThrowPath|null=null,score=Infinity;
 const corners:Pt[]=[];
 for(const door of available)if(door.open){
   corners.push(door.a,door.b);
 }
 for(const wall of world?.walls??WALLS)corners.push(wall.a,wall.b);
 for(const corner of corners){
  if(!reachableCorner(from,to,corner,available,world))continue;
  const length=dist(from,corner)+dist(corner,to);
  if(length>=score)continue;
  hook={points:[from,corner,to],via:corner,mode:'doorway',valid:true};
  score=length;
 }
 if(hook)return hook;
 // A single surface reflection is allowed only when its physical
 // incoming and outgoing straight legs are clear. No spline steering.
 let bank:ThrowPath|null=null;
 for(const wall of world?.walls??WALLS){
  const candidate=wallBank(from,to,wall,available,world);
  if(!candidate)continue;
  const cost=dist(from,candidate.via!)+dist(candidate.via!,to);
  if(cost<score){bank=candidate;score=cost;}
 }
 return bank??{points:[from,to],mode:'direct',valid:false,
   reason:'WALL OR CLOSED DOOR BLOCKS THROW'};
}
export function sampleThrow(path:ThrowPath,t:number):{p:Pt;height:number}{
 const alpha=Math.max(0,Math.min(1,t));
 // Pivot is an animation contact: once released, the grenade flies
 // straight OUT from that hand; it never flies in and turns midair.
 const points=path.mode==='doorway'?path.points.slice(1):path.points;
 const lengths=points.slice(1).map((p,i)=>dist(points[i],p));
 const total=lengths.reduce((a,b)=>a+b,0)||1;
 let travel=alpha*total;
 for(let i=0;i<lengths.length;i++){
  if(travel<=lengths[i]||i===lengths.length-1){
   const f=Math.min(1,travel/Math.max(.001,lengths[i]));
   const from=points[i],to=points[i+1];
   return {p:{x:from.x+(to.x-from.x)*f,
     y:from.y+(to.y-from.y)*f},
     height:2+28*4*alpha*(1-alpha)};
  }
  travel-=lengths[i];
 }
 return {p:points.at(-1)!,height:2};
}
