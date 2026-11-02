/** Shared fixed-tick movement commit. Individual movement orders may propose
 * positions, but no actor is committed through hard geometry or an opposing
 * body. Friendly traffic is intentionally soft: passing is not a combat rule.
 *
 * This pure resolver never mutates authored paths, targets, or facing orders.
 * Its inputs are captured before the actor loop, so iteration order cannot
 * silently make an already-moved opponent disappear from a collision check.
 */
import type {Pt,Side} from './breach-core.ts';
export type MotionProposal={
 id:string;side:Side;from:Pt;to:Pt;alive:boolean;
 /** An incapacitated carried actor is positioned by the carrier. */
 carried?:boolean;
};
export type MotionDecision={id:string;point:Pt;blocked:'geometry'|'actor'|null};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const moved=(a:MotionProposal)=>dist(a.from,a.to)>.0001;
const crosses=(a:MotionProposal,b:MotionProposal)=>{
 // A collision is meaningful only when the proposed final positions
 // converge. Fixed ticks bound travel; retain clearance during swaps.
 const final=dist(a.to,b.to);
 const initial=dist(a.from,b.from);
 if(final<11&&final<initial-.001)return true;
 const ux=a.to.x-a.from.x-(b.to.x-b.from.x);
 const uy=a.to.y-a.from.y-(b.to.y-b.from.y);
 const ox=a.from.x-b.from.x,oy=a.from.y-b.from.y;
 const sq=ux*ux+uy*uy;
 if(sq<1e-7)return false;
 const t=Math.max(0,Math.min(1,-(ox*ux+oy*uy)/sq));
 const at=Math.hypot(ox+ux*t,oy+uy*t);
 return at<10&&at<initial-.001;
};
/** Determine hard-body right of way in a stable pre-movement snapshot.
 * A stationary defender wins. Moving-vs-moving conflicts are broken by ID.
 * Teammates always retain permissive cooperative passing. */
export function resolveMovementFrame(
 proposals:readonly MotionProposal[],
 physicallyClear:(proposal:MotionProposal)=>boolean
):MotionDecision[]{
 const draft=new Map<string,MotionDecision>();
 const candidates=proposals.filter(p=>p.alive&&!p.carried);
 for(const p of proposals){
  const blocked=moved(p)&&p.alive&&!p.carried&&!physicallyClear(p);
  draft.set(p.id,{id:p.id,point:blocked?p.from:p.to,
    blocked:blocked?'geometry':null});
 }
 // Sorted, deterministic pairs. Never change player-authored queue order
 // or a resting actor's position to clear a path.
 const ordered=[...candidates].sort((a,b)=>a.id.localeCompare(b.id));
 for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
  const a=ordered[i],b=ordered[j];
  if(a.side===b.side)continue;
  const pa=draft.get(a.id)!,pb=draft.get(b.id)!;
  const da={...a,to:pa.point},db={...b,to:pb.point};
  if(!crosses(da,db))continue;
  const movingA=dist(a.from,pa.point)>.0001;
  const movingB=dist(b.from,pb.point)>.0001;
  // Opposing stationary body stays. If both moved, ID order grants passage
  // to one. This is not an automatic push/bash (those have separate rules).
  const loser=!movingA?b:!movingB?a:b;
  const result=draft.get(loser.id)!;
  result.point=loser.from;result.blocked='actor';
  // Recheck the winner against the *stationary* loser's original position.
  // Otherwise a moving-versus-moving conflict could still leave both body
  // centers overlapping after only one proposal is rejected.
  const winner=loser===a?b:a,winning=draft.get(winner.id)!;
  if(dist(winning.point,loser.from)<11&&
     dist(winner.from,loser.from)>dist(winning.point,loser.from)+.001){
    winning.point=winner.from;winning.blocked='actor';
  }
 }
 return proposals.map(p=>draft.get(p.id)!);
}
