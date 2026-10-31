/** Physical hinges, handles, and deterministic door clearance. */
import {doorCenter,passable,route,pointToSegment,
  doorYaw,doorLeafSegment,WALLS,COVER,activeSite,initialDoors,
  pointToSegment as distanceToWall,
  type Door,type Pt} from './breach-core.ts';
export {doorYaw,doorLeafSegment};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const DOOR_REACH=39;
export function handlePoint(d:Door):Pt{
  // Handle follows the actual rotated leaf, letting the support hand track
  // the contact point instead of reaching for an empty closed-door position.
  const leaf=doorLeafSegment(d);
  return {x:leaf.a.x+(leaf.b.x-leaf.a.x)*.82,
    y:leaf.a.y+(leaf.b.y-leaf.a.y)*.82};
}
export function doorReachable(p:Pt,d:Door):boolean{
  return (dist(p,handlePoint(d))<DOOR_REACH||pointToSegment(p,d)<31)&&
    dist(p,doorCenter(d))<DOOR_REACH+16;
}
export function doorApproach(from:Pt,d:Door):Pt|null{
  const m=doorCenter(d),len=dist(d.a,d.b)||1;
  const t={x:(d.b.x-d.a.x)/len,y:(d.b.y-d.a.y)/len};
  const n={x:-t.y,y:t.x};
  const side=Math.sign((from.x-m.x)*n.x+(from.y-m.y)*n.y)||1;
  const candidates:Pt[]=[];
  for(const point of [handlePoint(d),m])
    for(const outward of [20,24,29])
      for(const along of [0,-12,12])
        candidates.push({x:point.x+n.x*outward*side+t.x*along,
          y:point.y+n.y*outward*side+t.y*along});
  return candidates.filter(p=>passable(p)&&doorReachable(p,d)&&
    route(from,p).length).sort((a,b)=>dist(a,from)-dist(b,from))[0]??null;
}
export function initDoor(d:Door,i:number):Door{
 const prepared:Door={...d,hinge:d.hinge??(i%3===0?'b':'a'),
   swing:d.swing??(i%2===0?1:-1),openFraction:d.open?1:0,
   angularVelocity:0,resistance:d.resistance??1,
   latchIntegrity:d.latchIntegrity??1.05,frameIntegrity:d.frameIntegrity??2.5,
   kicks:d.kicks??0,forced:d.forced??false,heldBy:d.heldBy??null};
 if(doorSwingBlocked(prepared,.32)){
   const opposite=prepared.swing===1?-1:1;
   if(!doorSwingBlocked({...prepared,swing:opposite},.32))
     prepared.swing=opposite;
 }
 return prepared;
}
/** A small fixed-step hinge motor with damped impulses; no renderer physics. */
export function pushDoor(d:Door,force:number):boolean{
 if(d.heldBy||(!d.open&&(d.openFraction??0)<.08))return false;
 d.angularVelocity=Math.max(-5.5,Math.min(5.5,
   (d.angularVelocity??0)+force/Math.max(.35,d.resistance??1)));
 d.open=true;
 return true;
}
export function kickDoor(d:Door,from:Pt):{opened:boolean;pushSide:boolean}{
 const center=doorCenter(d);
 const leaf=doorLeafSegment({...d,openFraction:.62});
 const cross=(p:Pt)=>(d.b.x-d.a.x)*(p.y-center.y)-
   (d.b.y-d.a.y)*(p.x-center.x);
 const pushSide=cross(from)*cross(leaf.b)<0;
 const force=pushSide?1.2:.48,brace=d.heldBy?.75:0;
 d.kicks=(d.kicks??0)+1;
 d.latchIntegrity=Math.max(-1,(d.latchIntegrity??1.05)-force+brace);
 if(!pushSide)d.frameIntegrity=Math.max(0,(d.frameIntegrity??2.5)-.42);
 const opened=d.latchIntegrity<=0||d.frameIntegrity<=0;
 if(opened){
   d.heldBy=null;d.forced=true;d.open=true;d.kickImpulse=1;
   d.angularVelocity=Math.max(9,d.angularVelocity??0);
 }
 return {opened,pushSide};
}
/** Door leaf stops against architecture and furniture, not an arbitrary
 * renderer-only angle; sample away from the hinge itself. */
export function doorSwingBlocked(d:Door,next:number,actors:readonly Pt[]=[]){
 // Standalone door fixtures have no registered architecture; do not
 // collide them with an unrelated active level's walls or cover.
 const registered=activeSite()?.doors??initialDoors();
 if(!registered.some(real=>real.id===d.id))return false;
 const leaf=doorLeafSegment({...d,openFraction:next});
 for(const t of [.35,.55,.75,.94,.99]){
   const p={x:leaf.a.x+(leaf.b.x-leaf.a.x)*t,
     y:leaf.a.y+(leaf.b.y-leaf.a.y)*t};
   if(WALLS.some(w=>distanceToWall(p,w)<1.25))return true;
   if(COVER.some(o=>Math.abs(o.x-p.x)<o.w/2+1.25&&
     Math.abs(o.y-p.y)<o.h/2+1.25))return true;
 }
 if(!d.open){
   const segment=doorLeafSegment({...d,openFraction:next});
   if(actors.some(p=>pointToSegment(p,segment)<8.5))return true;
 }
 return false;
}
export function advanceDoor(d:Door,dt:number,actors:readonly Pt[]=[]){
  // Fixed internal substeps prevent a paused or coarse test tick from
  // overshooting a hinge and keep old half-second door timings intact.
  let remaining=Math.max(0,Math.min(dt,.5));
  while(remaining>1e-8){
    const h=Math.min(1/60,remaining);
    const target=d.open?1:0,current=d.openFraction??target;
    // Hinge orientation stays fixed throughout the mission.
    const v=d.angularVelocity??0;
    const kicked=(d.kickImpulse??0)>0;
    const acceleration=kicked?(target-current)*10-v*3:
      (target-current)*64-v*12;
    const velocity=Math.max(-4.5,Math.min(kicked?15:5.5,
      v+acceleration*h));
    const next=Math.max(0,Math.min(1,current+velocity*h));
    const blocked=Math.abs(next-current)>.0001&&
      (d.open?next>.12:next<current)&&doorSwingBlocked(d,next,actors);
    d.openFraction=blocked?current:next;
    d.angularVelocity=blocked||next===0||next===1?0:velocity;
    if(blocked||next>=.98)d.kickImpulse=0;
    remaining-=h;
  }
}
export const doorClear=(d:Door)=>!!d.open&&(d.openFraction??1)>=.72;
