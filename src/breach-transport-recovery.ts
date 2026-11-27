/** CT6: choose a bounded, swept alternate to a denied pair step.
 * Never mutate authored routes; final movement arbitration still owns commit. */
import type {Pt} from './breach-core.ts';
export function chooseTransportStep<T>(from:Pt,intended:Pt,
 propose:(point:Pt)=>T|null,clear:(a:Pt,b:Pt)=>boolean,allowAlternate=true):
 {carrier:Pt;body:T;adjusted:boolean}|null{
 const direct=propose(intended);
 if(direct)return {carrier:intended,body:direct,adjusted:false};
 const dx=intended.x-from.x,dy=intended.y-from.y;
 if(!allowAlternate||Math.hypot(dx,dy)<.0001)return null;
 for(const [scale,angle] of [[.5,0],[1,Math.PI/6],[1,-Math.PI/6],
  [.7,Math.PI/3],[.7,-Math.PI/3],[.35,0]]){
  const c=Math.cos(angle),s=Math.sin(angle);
  const p={x:from.x+scale*(dx*c-dy*s),y:from.y+scale*(dx*s+dy*c)};
  if(!clear(from,p))continue;
  const body=propose(p);
  if(body)return {carrier:p,body,adjusted:true};
 }
 return null;
}
