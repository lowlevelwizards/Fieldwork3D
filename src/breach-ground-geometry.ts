/** Ground-space constraints shared by both renderers and deterministic collapse.
 * All walls are centerline segments with a visible ~9-unit thick solid mesh.
 * Cosmetic marks never expand across the wall volume or into the next room.
 */
import type {Pt,Segment} from './breach-core.ts';
import type {FallPose} from './breach-wounds.ts';

export function groundDistanceToSegment(p:Pt,wall:Pick<Segment,'a'|'b'>):number{
 const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y;
 const l2=dx*dx+dy*dy;
 const t=l2>1e-8?Math.max(0,Math.min(1,
  ((p.x-wall.a.x)*dx+(p.y-wall.a.y)*dy)/l2)):0;
 return Math.hypot(p.x-wall.a.x-t*dx,p.y-wall.a.y-t*dy);
}
export function confinedGroundRadius(p:Pt,radius:number,
 walls:readonly Pick<Segment,'a'|'b'>[],wallHalfWidth=4.5):number{
 let safe=Math.max(0,radius);
 const shell=wallHalfWidth+.5;
 for(const wall of walls){
  // Broad phase: most room walls are nowhere near a 4-unit stain.
  // Avoid expensive sqrt/distance math on all but local walls.
  const reach=safe+shell;
  if(p.x<Math.min(wall.a.x,wall.b.x)-reach||
     p.x>Math.max(wall.a.x,wall.b.x)+reach||
     p.y<Math.min(wall.a.y,wall.b.y)-reach||
     p.y>Math.max(wall.a.y,wall.b.y)+reach)continue;
  safe=Math.min(safe,Math.max(0,groundDistanceToSegment(p,wall)-shell));
  if(safe===0)break;
 }
 return safe;
}
/** Maximum head/shoulder sweep while lying down, not a new actor collider.
 * Measurements occur along the WORLD-space direction of the chosen fall,
 * including oblique walls, wall ends, and narrow corridors. */
export function fallFreeFraction(p:Pt,heading:number,pose:FallPose,
 walls:readonly Pick<Segment,'a'|'b'>[]):number{
 if(!walls.length)return 1;
 const offset=pose==='back'?Math.PI:
  pose==='left'?-Math.PI/2:pose==='right'?Math.PI/2:0;
 const angle=heading+offset,dx=Math.cos(angle),dy=Math.sin(angle);
 // The upper body/head spans ~42 units; 10 units protects wall thickness,
 // clothing and wide headgear. The first 4 units can be occupied already.
 const extent=pose==='slump'?25:42,clearance=10;
 for(let d=4;d<=extent+1;d+=2){
  const q={x:p.x+dx*Math.min(extent,d),y:p.y+dy*Math.min(extent,d)};
  if(walls.some(wall=>groundDistanceToSegment(q,wall)<clearance))
   return Math.max(0,Math.min(1,(d-4)/Math.max(1,extent-4)));
 }
 return 1;
}
/** Preserve authored impact direction where safe; redirect toward open floor
 * only when a nearby wall would swallow the fallen miniature. */
export function wallSafeFall(p:Pt,heading:number,preferred:FallPose,
 walls:readonly Pick<Segment,'a'|'b'>[]):{pose:FallPose;space:number}{
 const first=fallFreeFraction(p,heading,preferred,walls);
 if(first>=.95)return {pose:preferred,space:1};
 const candidates:FallPose[]=['forward','back','left','right','slump'];
 let winner=preferred,space=first;
 for(const candidate of candidates){
  const free=fallFreeFraction(p,heading,candidate,walls);
  if(free>space+.18){winner=candidate;space=free;}
 }
 return {pose:winner,space};
}
