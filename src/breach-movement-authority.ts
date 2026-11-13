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
 id:string;side:Side|'neutral';from:Pt;to:Pt;alive:boolean;
 /** An incapacitated carried actor is positioned by the carrier. */
 carried?:boolean;
};
export type MotionDecision={id:string;point:Pt;blocked:'geometry'|'actor'|null};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const moved=(a:MotionProposal)=>dist(a.from,a.to)>.0001;
/** Conservative swept-body AABB reject. When *all* possible positions
 * of one body stay more than the collision envelope away from the other,
 * the expensive exact relative-trajectory test cannot register a contact.
 * No collision decision is made here; near pairs retain crosses unchanged. */
export const sweptPairMayTouch=(af:Pt,at:Pt,bf:Pt,bt:Pt,envelope:number)=>
 Math.max(af.x,at.x)+envelope>Math.min(bf.x,bt.x)&&
 Math.max(bf.x,bt.x)+envelope>Math.min(af.x,at.x)&&
 Math.max(af.y,at.y)+envelope>Math.min(bf.y,bt.y)&&
 Math.max(bf.y,bt.y)+envelope>Math.min(af.y,at.y);
const crosses=(a:MotionProposal,b:MotionProposal)=>{
 // A collision is meaningful only when the proposed final positions
 // converge. Fixed ticks bound travel; retain clearance during swaps.
 const final=dist(a.to,b.to);
 const initial=dist(a.from,b.from);
 const envelope=a.side==='neutral'||b.side==='neutral'?20:11;
 if(final<envelope&&final<initial-.001)return true;
 const ux=a.to.x-a.from.x-(b.to.x-b.from.x);
 const uy=a.to.y-a.from.y-(b.to.y-b.from.y);
 const ox=a.from.x-b.from.x,oy=a.from.y-b.from.y;
 const sq=ux*ux+uy*uy;
 if(sq<1e-7)return false;
 const t=Math.max(0,Math.min(1,-(ox*ux+oy*uy)/sq));
 const at=Math.hypot(ox+ux*t,oy+uy*t);
 return at<(envelope===20?19:10)&&at<initial-.001;
};
/** Determine hard-body right of way in a stable pre-movement snapshot.
 * A stationary defender wins. Moving-vs-moving conflicts are broken by ID.
 * Teammates always retain permissive cooperative passing. */
export function resolveMovementFrame(
 proposals:readonly MotionProposal[],
 physicallyClear:(proposal:MotionProposal)=>boolean
):MotionDecision[]{
 // No admissible body proposed movement: no geometry sweep or relative
 // trajectory can reject a step. Preserve original order and destination
 // references, including dead/carried bodies, without sorting all pairs.
 // Use the SAME moved() predicate as the regular arbitration path.
 if(!proposals.some(p=>p.alive&&!p.carried&&moved(p)))
  return proposals.map(p=>({id:p.id,point:p.to,blocked:null}));
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
  if(a.side===b.side&&a.side!=='neutral')continue;
  // An unarmed, ambulatory civilian is soft traffic to the friendly squad.
  // Normal civilian navigation still avoids occupied space, and armed
  // opponents plus neutral-vs-neutral encounters retain hard collision.
  // Carried bodies are reconciled separately as physical custody.
  if((a.side==='blue'&&b.side==='neutral')||
     (b.side==='blue'&&a.side==='neutral'))continue;
  const pa=draft.get(a.id)!,pb=draft.get(b.id)!;
  // Most 16v16v16 actor pairs are spatially distant. Reject them with
  // arithmetic before allocating temporary proposals or calculating sqrt.
  if(!sweptPairMayTouch(a.from,pa.point,b.from,pb.point,
    a.side==='neutral'||b.side==='neutral'?20:11))continue;
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
  if(dist(winning.point,loser.from)<
      (winner.side==='neutral'||loser.side==='neutral'?20:11)&&
     dist(winner.from,loser.from)>dist(winning.point,loser.from)+.001){
    winning.point=winner.from;winning.blocked='actor';
  }
 }
 return proposals.map(p=>draft.get(p.id)!);
}
