/** Physical hinges, handles, and deterministic door clearance. */
import {doorCenter,passable,route,pointToSegment,type Door,type Pt} from './breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const DOOR_REACH=59;
export function handlePoint(d:Door):Pt{
  const a=d.hinge==='b'?d.b:d.a,b=d.hinge==='b'?d.a:d.b;
  return {x:a.x+(b.x-a.x)*.82,y:a.y+(b.y-a.y)*.82};
}
export function doorReachable(p:Pt,d:Door):boolean{
  return (dist(p,handlePoint(d))<DOOR_REACH||pointToSegment(p,d)<48)&&
    dist(p,doorCenter(d))<DOOR_REACH+27;
}
export function doorApproach(from:Pt,d:Door):Pt|null{
  const m=doorCenter(d),len=dist(d.a,d.b)||1;
  const t={x:(d.b.x-d.a.x)/len,y:(d.b.y-d.a.y)/len};
  const n={x:-t.y,y:t.x};
  const side=Math.sign((from.x-m.x)*n.x+(from.y-m.y)*n.y)||1;
  const candidates:Pt[]=[];
  for(const point of [handlePoint(d),m])
    for(const outward of [24,30,38])
      for(const along of [0,-12,12])
        candidates.push({x:point.x+n.x*outward*side+t.x*along,
          y:point.y+n.y*outward*side+t.y*along});
  return candidates.filter(p=>passable(p)&&doorReachable(p,d)&&
    route(from,p).length).sort((a,b)=>dist(a,from)-dist(b,from))[0]??null;
}
export function initDoor(d:Door,i:number):Door{
  return {...d,hinge:d.hinge??(i%3===0?'b':'a'),
    swing:d.swing??(i%2===0?1:-1),
    openFraction:d.open?1:0};
}
export function advanceDoor(d:Door,dt:number){
  const target=d.open?1:0,at=d.openFraction??target;
  d.openFraction=Math.max(0,Math.min(1,
    at+Math.sign(target-at)*Math.min(Math.abs(target-at),dt*(d.open?2.2:3))));
}
export const doorClear=(d:Door)=>!!d.open&&(d.openFraction??1)>=.72;
export const doorYaw=(d:Door)=>(d.swing??-1)*
  (d.openFraction??(d.open?1:0))*1.36;
