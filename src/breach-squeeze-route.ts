/** Normal routes win when available. Narrow fallback remains constrained
 * by the known map: never reveal hidden walls or furniture while planning. */
import {type Pt,route,passable,type Door,OPERATOR_RADIUS,
  pointToSegment,doorLeafSegment} from './breach-core.ts';
import {type IntelState,intelPassable,routeWithIntel} from './breach-intel.ts';
import {profileSamples,squeezeFacing,sweptProfileClear,SQUEEZE_RADIUS}
  from './breach-navigation.ts';

const narrowPassable=(at:Pt,canStand:(p:Pt,r:number)=>boolean)=>
  canStand(at,SQUEEZE_RADIUS);
/** Preview a real, oriented continuous squeeze through a visible gap.
 * A shorter squeeze can beat a long normal detour; it isn't only a fallback
 * after every other path has failed. Still checks every torso sample.
 */
function directSqueeze(from:Pt,to:Pt,
  canStand:(p:Pt,r:number)=>boolean):boolean{
 const length=Math.hypot(to.x-from.x,to.y-from.y);
 if(length<20||length>310||!canStand(to,SQUEEZE_RADIUS))return false;
 const angle=squeezeFacing(Math.atan2(to.y-from.y,to.x-from.x));
 const steps=Math.max(1,Math.ceil(length/2.4));
 for(let i=0;i<=steps;i++){
   const t=i/steps,at={x:from.x+(to.x-from.x)*t,
     y:from.y+(to.y-from.y)*t};
   if(!profileSamples(at,angle,'squeeze').every(sample=>
     canStand(sample.position,sample.radius)))return false;
 }
 return true;
}
const courseLength=(from:Pt,points:readonly Pt[])=>{
 let length=0,prev=from;
 for(const p of points){length+=Math.hypot(p.x-prev.x,p.y-prev.y);prev=p;}
 return length;
};

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
 const canStand=(p:Pt,r:number)=>intelPassable(p,intel,r);
 const standard=routeWithIntel(intel,from,to);
 // Prefer ordinary walking if it is nearly as direct, but do not walk
 // all the way around a room when the operator can squeeze straight through.
 const direct=directSqueeze(from,to,canStand);
 if(direct&&(!standard.length||
   courseLength(from,standard)>Math.hypot(to.x-from.x,to.y-from.y)*1.22+10))
   return [{...to}];
 return standard.length?standard:narrowRoute(from,to,canStand);
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
