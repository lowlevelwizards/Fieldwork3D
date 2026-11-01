/** Post-route movement friction: reuse an already-computed A* objective
 * route rather than performing another expensive site-wide search. Scores
 * are warnings for awkward movement, not hard gameplay rejection gates.
 */
import type {Pt} from '../breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type RouteFriction={
 reachable:boolean;distanceUnits:number;directUnits:number;
 detourRatio:number;narrowFraction:number;
 sampledPoints:number;warnings:readonly ('excessive-detour'|'sustained-tightness'|'unreachable')[];
};
export function measureRouteFriction(
 start:Pt,goal:Pt,waypoints:readonly Pt[],
 comfortablyPassable:(p:Pt)=>boolean):RouteFriction{
 if(!waypoints.length)return {reachable:false,distanceUnits:0,
  directUnits:Math.round(dist(start,goal)),detourRatio:0,
  narrowFraction:0,sampledPoints:0,warnings:['unreachable']};
 const points=[start,...waypoints];
 const straight=dist(start,goal);
 let travel=0,narrow=0,samples=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=dist(a,b);
  travel+=length;
  const divisions=Math.max(1,Math.ceil(length/8));
  for(let step=1;step<=divisions;step++){
   const t=step/divisions;
   if(!comfortablyPassable({x:a.x+(b.x-a.x)*t,
     y:a.y+(b.y-a.y)*t}))narrow++;
   samples++;
  }
 }
 const ratio=travel/Math.max(1,straight);
 const fraction=samples?narrow/samples:0;
 const warnings:('excessive-detour'|'sustained-tightness')[]=[];
 if(straight>60&&ratio>2.4)warnings.push('excessive-detour');
 if(samples>=8&&fraction>.45)warnings.push('sustained-tightness');
 return {reachable:true,distanceUnits:Math.round(travel),
  directUnits:Math.round(straight),
  detourRatio:Math.round(ratio*100)/100,
  narrowFraction:Math.round(fraction*100)/100,
  sampledPoints:samples,warnings};
}
