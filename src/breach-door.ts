/** Physical hinges, handles, and deterministic door clearance. */
import {doorCenter,passable,route,pointToSegment,
  doorYaw,doorLeafSegment,type Door,type Pt} from './breach-core.ts';
export {doorYaw,doorLeafSegment};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const DOOR_REACH=39;
export function handlePoint(d:Door):Pt{
  const a=d.hinge==='b'?d.b:d.a,b=d.hinge==='b'?d.a:d.b;
  return {x:a.x+(b.x-a.x)*.82,y:a.y+(b.y-a.y)*.82};
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
  return {...d,hinge:d.hinge??(i%3===0?'b':'a'),
    swing:d.swing??(i%2===0?1:-1),
    openFraction:d.open?1:0,angularVelocity:0,resistance:1};
}
/** A small fixed-step hinge motor with damped impulses; no renderer physics. */
export function pushDoor(d:Door,force:number):boolean{
 if(!d.open&&(d.openFraction??0)<.08)return false;
 d.angularVelocity=Math.max(-3.5,Math.min(3.5,
   (d.angularVelocity??0)+force/Math.max(.35,d.resistance??1)));
 d.open=true;
 return true;
}
export function advanceDoor(d:Door,dt:number){
  // Fixed internal substeps prevent a paused or coarse test tick from
  // overshooting a hinge and keep old half-second door timings intact.
  let remaining=Math.max(0,Math.min(dt,.5));
  while(remaining>1e-8){
    const h=Math.min(1/60,remaining);
    const target=d.open?1:0,current=d.openFraction??target;
    const v=d.angularVelocity??0;
    const acceleration=(target-current)*64-v*12;
    const velocity=Math.max(-5,Math.min(5,v+acceleration*h));
    const next=Math.max(0,Math.min(1,current+velocity*h));
    d.openFraction=next;
    d.angularVelocity=next===0||next===1?0:velocity;
    remaining-=h;
  }
}
export const doorClear=(d:Door)=>!!d.open&&(d.openFraction??1)>=.72;
