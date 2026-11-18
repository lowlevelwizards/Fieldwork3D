/** D3.27E: COLD fully swept exact-grid route via an existing OPEN passage.
 *
 * A grid proposal is NOT physical clearance: every static body stride must
 * be verified at real 0.3-unit resolution. A blocked live-door leg is allowed
 * as a future *attempt* only if every panel blocking it is an independently
 * operable, unlocked real Door. The ordinary motor opens/contact-tests that
 * leaf in later ticks. No manual door is opened, no actor is translated,
 * no authored order, terminal goal, or window collision is modified here.
 */
import type {Door,Pt} from './breach-core.ts';
import {OPERATOR_RADIUS} from './breach-core.ts';
import {bodyClear,sweptBodyClear} from './breach-navigation.ts';
import {routeWithNormalWorld} from './breach-squeeze-route.ts';
import {fullBodyMotorRouteClear} from './breach-recovery-route-validation.ts';
import {fullBodyMotorStrideClear} from './breach-stack-micro-corner.ts';
import {coldExactMotorGridRoute} from './breach-d327-exact-motor-grid.ts';
import {canAutoOpenEnRoute} from './breach-door.ts';
import type {SessionWorldGeometry} from './breach-world-context.ts';
import type {TeamActor} from './breach-game.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});
type Opening={a:Pt;b:Pt;kind?:string;id?:string};
const claims=new WeakMap<TeamActor,{
 id:number;goal:Pt;last:number;attempts:number}>();
/** One 4-second-spaced retry at most twice per unchanged original GO. */
export function claimD327ColdPassage(
 actor:TeamActor,goal:Pt,seconds:number
):boolean{
 const node=actor.plan[0];
 if(actor.side!=='blue'||node?.kind!=='move'||
    node.entryDoorId||node.stackDoorId||actor.squeeze||
    actor.traversal||actor.traversalPending||actor.doorTraversal||
    actor.fireRetreatTarget||actor.blockedTime<5.5||
    !Number.isFinite(seconds)||dist(actor.p,goal)>780||
    dist(actor.p,goal)<18)return false;
 let prev=claims.get(actor);
 if(!prev||prev.id!==node.id||dist(prev.goal,goal)>.5){
  prev={id:node.id,goal:clone(goal),last:-Infinity,attempts:0};
  claims.set(actor,prev);
 }
 if(prev.attempts>=2||seconds-prev.last<4)return false;
 prev.attempts++;prev.last=seconds;
 return true;
}
function routeLength(from:Pt,points:readonly Pt[]){
 let total=0,at=from;
 for(const p of points){total+=dist(at,p);at=p;}
 return total;
}
/** Return only the full exact GO route or []; caller must limit invocation
 * to genuine cold motor stalls and must retain the ordinary door motor.
 */
export function coldExactPassageWorldRoute(
 from:Pt,goal:Pt,
 openings:readonly Opening[],doors:Door[],world:SessionWorldGeometry,
 known:(opening:Opening,entrance:Pt,inside:Pt)=>boolean=()=>true,
 budget=2400
):Pt[]{
 const staticSweep=(a:Pt,b:Pt)=>sweptBodyClear(
   a,b,[],OPERATOR_RADIUS,world);
 const liveSweep=(a:Pt,b:Pt)=>sweptBodyClear(
   a,b,doors,OPERATOR_RADIUS,world);
 const motorStatic=(a:Pt,b:Pt)=>
   fullBodyMotorStrideClear(a,b,staticSweep);
 if(!bodyClear(from,doors,OPERATOR_RADIUS,world)||
    !bodyClear(goal,doors,OPERATOR_RADIUS,world)||
    !Number.isFinite(goal.x+goal.y+from.x+from.y))return [];
 const ranked=openings.flatMap((op,i)=>{
  const width=dist(op.a,op.b);
  if(width<OPERATOR_RADIUS*2+12||width>200) return [];
  const mid={x:(op.a.x+op.b.x)/2,y:(op.a.y+op.b.y)/2};
  const nx=-(op.b.y-op.a.y)/width,
    ny=(op.b.x-op.a.x)/width;
  const side=Math.sign((goal.x-mid.x)*nx+(goal.y-mid.y)*ny);
  if(!side)return [];
  const approach={x:mid.x-nx*side*18,y:mid.y-ny*side*18},
    interior={x:mid.x+nx*side*18,y:mid.y+ny*side*18};
  if(!known(op,approach,interior)||
     !bodyClear(approach,doors,OPERATOR_RADIUS,world)||
     !bodyClear(interior,doors,OPERATOR_RADIUS,world)||
     !motorStatic(approach,interior)||!liveSweep(approach,interior))
    return [];
  return [{op,i,approach,interior,
    score:dist(from,approach)+dist(interior,goal)}];
 }).sort((a,b)=>a.score-b.score||a.i-b.i).slice(0,3);
 let best:Pt[]=[],bestCost=Infinity;
 for(const item of ranked){
  const remaining=dist(from,item.approach);
  const head=coldExactMotorGridRoute(from,item.approach,
    p=>bodyClear(p,[],OPERATOR_RADIUS,world),motorStatic,
    {step:4,maxExpansions:budget,padding:245,
     maxDistance:Math.min(1400,remaining*6+450),maxWaypoints:150});
  if(!head.length)continue;
  const tail=routeWithNormalWorld(item.interior,goal,[],world);
  if(!tail.length||dist(tail.at(-1)!,goal)>.05)continue;
  const combined=[...head,clone(item.interior),...tail.map(clone)];
  const cost=routeLength(from,combined),maxTravel=dist(from,goal)*6+450;
  if(cost>maxTravel||combined.length>150||cost>=bestCost||
     !fullBodyMotorRouteClear(from,combined,staticSweep,maxTravel))
    continue;
  // Closed doors can be approached ONLY if the stock motor could open
  // every panel they actually intersect. A blocked wall/window is never
  // ignored; static full-body certification above already vetoes it.
  let valid=true,at=from,blockedDoors=0;
  for(const point of combined){
   if(!fullBodyMotorStrideClear(at,point,liveSweep)){
    const obstructions=doors.filter(door=>
      !fullBodyMotorStrideClear(at,point,(a,b)=>
        sweptBodyClear(a,b,[door],OPERATOR_RADIUS,world)));
    if(!obstructions.length||obstructions.some(door=>
       door.locked||door.jammed||door.wedged||!!door.heldBy||
       !canAutoOpenEnRoute({kind:'move'},door.id))){
      valid=false;break;
    }
    blockedDoors+=obstructions.length;
    if(blockedDoors>4){valid=false;break;}
   }
   at=point;
  }
  // The first ACTUAL 0.3-unit motor step must be clear now. Never
  // hand the motor an unswept departure into a wall or a remote leaf.
  if(!valid||!fullBodyMotorStrideClear(from,head[0],liveSweep))
    continue;
  best=combined;bestCost=cost;
 }
 return best;
}
