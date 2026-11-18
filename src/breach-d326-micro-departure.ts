/** D3.26C: recover a grid/world route whose *whole leg* passes the
 * coarse collision samples but whose FIRST real 0.3-unit motor stride does
 * not. No movement is performed here. All short departures and the next
 * route leg are rechecked at the real motor stride resolution, and the
 * existing authored world GO stays the final destination.
 *
 * This is a COLD proposal after measured blockage, never a per-tick planner.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import {fullBodyMotorStrideClear}
 from './breach-stack-micro-corner.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});

export function selectColdMotorMicroDeparture(
 from:Pt,goal:Pt,first:Pt,
 sweep:(from:Pt,to:Pt)=>boolean,
 bodyClear:(p:Pt)=>boolean,
 routeTo:(from:Pt,to:Pt)=>Pt[]
):Pt[]{
 const leg=dist(from,first),remaining=dist(from,goal);
 // Only an actual discrepancy: an apparently safe grid chord whose
 // first real motor-sized steps are physically impossible. Full-body
 // blocked route legs and normal motion retain their existing recovery.
 if(!Number.isFinite(leg)||leg<6||leg>96||
    !Number.isFinite(remaining)||remaining<18||remaining>720||
    !bodyClear(from)||!bodyClear(goal)||
    !sweep(from,first)||
    fullBodyMotorStrideClear(from,first,sweep))return [];
 let best:Pt[]=[],bestCost=Infinity;
 // 16 fixed options at most. Tiny steps only: never search an unsafe
 // remote point or pick a new arbitrary landing position.
 for(const radius of [2,5]){
  for(let i=0;i<8;i++){
   const theta=Math.PI*i/4;
   const stage={x:from.x+Math.cos(theta)*radius,
     y:from.y+Math.sin(theta)*radius};
   if(!bodyClear(stage)||
      !fullBodyMotorStrideClear(from,stage,sweep))continue;
   const tail=routeTo(stage,goal);
   if(!tail.length||dist(tail.at(-1)!,goal)>3||
      !fullBodyMotorStrideClear(stage,tail[0],sweep))continue;
   let cost=radius,at=stage;
   for(const point of tail){cost+=dist(at,point);at=point;}
   if(!Number.isFinite(cost)||cost>=bestCost||
      cost>remaining*2+90)continue;
   best=[clone(stage),...tail.map(clone)];bestCost=cost;
  }
 }
 return best;
}

type Claim={id:number;goal:Pt;attempts:number;last:number};
const claims=new WeakMap<TeamActor,Claim>();
/** One attempt per 3.5 seconds, at most two per unchanged MOVE/GO. */
export function claimColdMotorMicroDeparture(
 actor:TeamActor,goal:Pt,seconds:number
):boolean{
 const n=actor.plan[0];
 if(n?.kind!=='move')return false;
 let state=claims.get(actor);
 if(!state||state.id!==n.id||dist(state.goal,goal)>.5){
  state={id:n.id,goal:clone(goal),attempts:0,last:-Infinity};
  claims.set(actor,state);
 }
 if(state.attempts>=2||seconds-state.last<3.5)return false;
 state.attempts++;state.last=seconds;
 return true;
}
