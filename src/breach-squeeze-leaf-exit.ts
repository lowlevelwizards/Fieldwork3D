/** D3.14B: bounded, physically swept narrow-profile escape of an OPEN
 * leaf when the original known route repeatedly returns the body into it.
 *
 * Planning only. The ordinary 60 Hz motor executes EVERY step against
 * today's doors, static walls, oriented torso, collisions and actors.
 * Never edits player-authored GO, never manipulates doors and never
 * grants full-body clearance to a narrow profile.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
const gap=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt)=>({x:p.x,y:p.y});
/** A local physically legal narrow path back to the ORIGINAL first
 * disposable navigation node. Return stage waypoints only; the caller
 * appends the complete unmodified original nav ending at authored GO.
 * Search is fixed-size, one-shot, deterministic and never runs per tick.
 */
export function findBoundedNarrowLeafExit(
 from:Pt,authoredGoal:Pt,firstNav:Pt,
 narrow:(from:Pt,to:Pt)=>boolean,
 full:(from:Pt,to:Pt)=>boolean,
 maxNodes=96
):Pt[]{
 if(gap(from,firstNav)>65||gap(from,authoredGoal)<40||
    narrow(from,firstNav)||full(from,firstNav))return [];
 // A separately budgeted COLD probe may route around an entire long
 // outward-swing leaf tip. The 12 x 4 unit usual search cannot reach
 // around a 42-unit leaf. Normal motor calls keep their existing 96 budget.
 const extended=maxNodes>96;
 const step=extended?8:4;
 const radius=extended?120:52;
 const maxDepth=extended?22:12;
 const angles=Array.from({length:16},(_,i)=>i*Math.PI/8);
 const key=(p:Pt)=>Math.round(p.x/2)+':'+Math.round(p.y/2);
 const queue:{p:Pt;path:Pt[]}[]=[{p:clone(from),path:[]}];
 const visited=new Set<string>([key(from)]);
 let expanded=0;
 for(let index=0;index<queue.length&&expanded<maxNodes;index++){
  const {p,path}=queue[index];
  if(path.length>=2&&gap(p,firstNav)<56&&
     (full(p,firstNav)||narrow(p,firstNav)))return path;
  if(path.length>=maxDepth)continue;
  expanded++;
  for(const a of angles){
   const next={x:p.x+Math.cos(a)*step,y:p.y+Math.sin(a)*step};
   if(gap(next,from)>radius)continue;
   const tiny={x:p.x+(next.x-p.x)*.026/step,
    y:p.y+(next.y-p.y)*.026/step};
   if(!narrow(p,tiny))continue;
   const k=key(next);
   if(visited.has(k)||!narrow(p,next))continue;
   visited.add(k);
   queue.push({p:next,path:[...path,clone(next)]});
  }
 }
 return [];
}
/** Genuine changed leaf, authored order or >32-unit real displacement
 * can warrant another attempt. A repeated unchanged failed search cannot
 * consume every 60Hz frame or reacquire a cosmetic route indefinitely.
 */
type Probe={id:number;doorId:string;goal:Pt;fraction:number;anchor:Pt};
const probes=new WeakMap<TeamActor,Probe>();
const active=new WeakMap<TeamActor,Pt[]>();
export function claimNarrowLeafExitProbe(
 a:TeamActor,doorId:string,goal:Pt,fraction:number
):boolean{
 const order=a.plan[0];
 if(order?.kind!=='move'||order.entryDoorId!==doorId)return false;
 const prior=probes.get(a);
 if(prior&&prior.id===order.id&&prior.doorId===doorId&&
    gap(prior.goal,goal)<.25&&
    Math.abs(prior.fraction-fraction)<.14&&
    gap(prior.anchor,a.p)<32)return false;
 probes.set(a,{id:order.id,doorId,goal:clone(goal),
  fraction,anchor:clone(a.p)});
 return true;
}
export function ownNarrowExitWaypoints(a:TeamActor,stages:readonly Pt[]){
 active.set(a,stages.map(clone));
}
export function preciseNarrowExitWaypoint(a:TeamActor,next:Pt):boolean{
 const stage=active.get(a);if(!stage)return false;
 if(stage.some(p=>gap(p,next)<.25))return true;
 active.delete(a);return false;
}
