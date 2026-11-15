/** D3.17E2: only a cold collision recovery gate, not a motor physics gate.
 * A different route is not genuine progress until the feet relocate.
 * Keep distinct witness per actor and material door/cover revision.
 */
import type {TeamActor} from './breach-game.ts';
import type {Door,Pt} from './breach-core.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
type Stationary={
 orderId:number;anchor:Pt;goal:Pt;revision:number;doorKey:string;
 probes:number;lastAt:number;firstAt:number;
};
const witnesses=new WeakMap<TeamActor,Stationary>();
/** Only hinge state near this actor affects its present collision. Do not
 * freeze a valid route after a real door swing, lock change, or leaf motion.
 */
export function physicalDoorPoseKey(from:Pt,doors:readonly Door[]):string{
 let result='';
 for(const door of doors){
  const center={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
  if(distance(from,center)>100)continue;
  result+=door.id+':'+Math.round((door.openFraction??0)*20)+
   ':'+(door.open?1:0)+':'+(door.locked?1:0)+
   ':'+(door.jammed?1:0)+':'+(door.wedged?1:0)+
   ':'+(door.heldBy??'-')+'|';
 }
 return result;
}
/** Allow three cold search episodes; then one re-probe every ~4 seconds.
 * Changed body anchor, PlanNode/GO, actual cover, or real hinge pose resets.
 * This never blocks an actor's footstep, pressure, glide, squeeze or door.
 */
export function shouldProbeStationaryCollisionRoute(
 actor:TeamActor,goal:Pt,seconds:number,worldRevision:number,
 doors:readonly Door[]
):boolean{
 const order=actor.plan[0];
 if(actor.side!=='blue'||order?.kind!=='move')return true;
 const pose=physicalDoorPoseKey(actor.p,doors);
 const prior=witnesses.get(actor);
 const same=!!prior&&prior.orderId===order.id&&
  distance(prior.goal,goal)<.5&&
  distance(prior.anchor,actor.p)<3&&
  prior.revision===worldRevision&&prior.doorKey===pose&&
  seconds-prior.firstAt<24;
 if(!same){
  witnesses.set(actor,{orderId:order.id,anchor:{...actor.p},
   goal:{...goal},revision:worldRevision,doorKey:pose,
   probes:1,lastAt:seconds,firstAt:seconds});
  return true;
 }
 if(prior.probes<3){
  prior.probes++;prior.lastAt=seconds;return true;
 }
 if(seconds-prior.lastAt<3.8)return false;
 prior.lastAt=seconds;
 return true;
}
