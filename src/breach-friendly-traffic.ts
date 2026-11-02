/** Cooperative operator traffic: avoid crowding where possible without making
 * friendlies impassable obstacles or displacing a deliberately held teammate.
 * This is a local steering preference, never a mutation of authored orders. */
import type {Pt} from './breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const minGap=(p:Pt,peers:readonly Pt[])=>
 peers.reduce((v,q)=>Math.min(v,dist(p,q)),Infinity);
export function friendlyPassingStep(from:Pt,desired:Pt,goal:Pt,
 peers:readonly Pt[],sweep:(a:Pt,b:Pt)=>boolean):Pt{
 const step=dist(from,desired);
 if(step<1e-6||!peers.some(p=>dist(p,desired)<21))return desired;
 const dx=(desired.x-from.x)/step,dy=(desired.y-from.y)/step;
 const gap=minGap(desired,peers);
 // Try short angled steps. A small per-tick sidestep accumulated over time
 // looks natural; it must not require one enormous impossible jump.
 let best=desired,bestScore=score(desired,goal,peers);
 for(const side of [-1,1]){
  for(const strength of [.45,.95,1.55]){
   const len=Math.hypot(1,strength),vx=(dx-dy*side*strength)/len;
   const vy=(dy+dx*side*strength)/len;
   const candidate={x:from.x+vx*step,y:from.y+vy*step};
   if(!sweep(from,candidate))continue;
   const separation=minGap(candidate,peers);
   if(separation<gap+.01)continue;
   const rating=score(candidate,goal,peers);
   if(rating<bestScore-1e-5){best=candidate;bestScore=rating;}
  }
 }
 return best;
}
function score(p:Pt,goal:Pt,peers:readonly Pt[]):number{
 const gap=minGap(p,peers);
 // Contact is a soft aesthetic cost, not a hard collision constraint.
 return dist(p,goal)+Math.max(0,17-gap)*2.2;
}
/** Two teammates should not settle on the same exact spot. Approaching an
 * occupied goal to within one body diameter counts as a practical arrival. */
export function nearOccupiedFriendlyGoal(at:Pt,goal:Pt,
 peers:readonly Pt[],canConnect:(a:Pt,b:Pt)=>boolean):boolean{
 return dist(at,goal)<=19&&dist(at,goal)>5&&
   peers.some(p=>dist(p,goal)<11&&dist(p,at)>=14)&&
   canConnect(at,goal);
}
