/** Skip only disposable, shallow motor-grid corners. A valid full-radius
 * swept path authorizes feet to take the next segment. Never skip authored
 * PlanNode[] orders, entry choreography, WATCH/collision recovery, or doors.
 */
import type {Pt} from './breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function canSmoothMotorCorner(from:Pt,near:Pt,after:Pt,
 allowed:boolean,sweptClear:(a:Pt,b:Pt)=>boolean):boolean{
 if(!allowed)return false;
 const incoming=dist(from,near),outgoing=dist(near,after);
 if(incoming<3||incoming>17||outgoing<6)return false;
 const a={x:(near.x-from.x)/incoming,y:(near.y-from.y)/incoming};
 const b={x:(after.x-near.x)/outgoing,y:(after.y-near.y)/outgoing};
 // Shallow course continuation only; no sharp corner or reverse turn.
 if(a.x*b.x+a.y*b.y<.70)return false;
 // Entire rounded body must fit on the direct proposed chord.
 return sweptClear(from,after);
}

/** D3.11E: bounded lookahead through at most TWO existing disposable
 * grid bends. Each candidate is checked from the actor's ACTUAL body
 * position through the unchanged full-radius sweep. No passage/door
 * permissions, authored destinations, or motor steps are produced here.
 *
 * The second chord is capped to avoid a costly long-distance sweep in
 * the fixed-clock hot path. A rejected chord leaves the original route
 * exactly as-is. The caller decides whether route skipping is legal.
 */
export function boundedMotorCornerLookahead(
 from:Pt,route:readonly Pt[],allowed:boolean,
 sweptClear:(a:Pt,b:Pt)=>boolean
):number{
 if(!allowed||route.length<2)return 0;
 let skipped=0;
 const limit=Math.min(2,route.length-1);
 while(skipped<limit){
  const near=route[skipped],after=route[skipped+1];
  if(skipped>0&&dist(from,after)>48)break;
  if(!canSmoothMotorCorner(from,near,after,true,sweptClear))break;
  skipped++;
 }
 return skipped;
}
