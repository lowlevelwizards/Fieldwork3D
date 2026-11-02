/** Normal routes win when available. Narrow fallback remains constrained
 * by the known map: never reveal hidden walls or furniture while planning. */
import {type Pt,route,passable,type Door,OPERATOR_RADIUS,
  pointToSegment,doorLeafSegment} from './breach-core.ts';
import {type IntelState,intelPassable,routeWithIntel} from './breach-intel.ts';
import {profileSamples,squeezeFacing,sweptProfileClear}
  from './breach-navigation.ts';

const narrowPassable=(at:Pt,canStand:(p:Pt,r:number)=>boolean)=>
  canStand(at,5.4);

function narrowRoute(from:Pt,to:Pt,
  canStand:(p:Pt,r:number)=>boolean):Pt[]{
  if(!narrowPassable(to,canStand))return [];
  const course=route(from,to,p=>narrowPassable(p,canStand));
  let prior=from;
  for(const point of course){
    const direction=Math.atan2(point.y-prior.y,point.x-prior.x);
    const angle=squeezeFacing(direction);
    const length=Math.hypot(point.x-prior.x,point.y-prior.y);
    const samples=Math.max(1,Math.ceil(length/2.5));
    for(let step=1;step<=samples;step++){
      const t=step/samples;
      const at={x:prior.x+(point.x-prior.x)*t,
        y:prior.y+(point.y-prior.y)*t};
      if(!profileSamples(at,angle,'squeeze').every(sample=>
        canStand(sample.position,sample.radius)))return [];
    }
    prior=point;
  }
  return course;
}
export function routeWithSqueezeIntel(intel:IntelState,from:Pt,to:Pt):Pt[]{
  const standard=routeWithIntel(intel,from,to);
  return standard.length?standard:
    narrowRoute(from,to,(p,r)=>intelPassable(p,intel,r));
}
/** Collision-truth replan after contact or a known obstruction.
 * Open door leaves use the same rule as the ordinary motor. */
export function routeWithSqueezeWorld(from:Pt,to:Pt,doors:Door[]):Pt[]{
 // A door being opened is an intentional, actionable obstruction; it must
 // remain routable so the motor can open it. A leaf already swung into a
 // walkway is different: a physical route needs to steer around the leaf.
 const canStand=(p:Pt,r:number)=>
   passable(p,r)&&!doors.some(d=>d.open&&(d.openFraction??0)>=.72&&
     pointToSegment(p,doorLeafSegment(d))<r+1);
 const standard=route(from,to,p=>canStand(p,OPERATOR_RADIUS));
 if(standard.length){
   // A grid path can still have a swept leaf collision near its origin.
   let previous=from,valid=true;
   for(const point of standard){
     if(!sweptProfileClear(previous,point,doors,0,'normal')){
       valid=false;break;
     }
     previous=point;
   }
   if(valid)return standard;
 }
 const narrow=narrowRoute(from,to,canStand);
 let previous=from;
 for(const point of narrow){
   const heading=squeezeFacing(Math.atan2(
     point.y-previous.y,point.x-previous.x));
   if(!sweptProfileClear(previous,point,doors,heading,'squeeze'))
     return [];
   previous=point;
 }
 return narrow;
}
