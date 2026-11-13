/** Q2: one deterministic doorway convoy authority per Session/GO schedule.
 * Ranks are attached to individual threshold crossings, not permanently to
 * characters. This unit never edits a PlanNode, door hinge or actor position.
 */
import {doorCenter,OPERATOR_RADIUS,type Door,type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PassageSchedule,PassageSlot} from './breach-passage-plan.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';

export const QUEUE_CENTER_GAP=20;
export const QUEUE_WAIT_DEPTH=OPERATOR_RADIUS+11;
export const QUEUE_ENTRY_RADIUS=142;
export type QueueDecision={move:Pt;hold:boolean;
 reason:'free'|'sequence'|'spacing'|'opposing'|'occupied';
 doorId:string|null;rank:number|null};
type Member={actor:TeamActor;slot:PassageSlot};
type Lane={door:Door;side:-1|1;members:Member[]};
type Owner={id:string;side:-1|1;lastAt:Pt;lastProgress:number};
type Context={schedule:PassageSchedule;byDoor:Map<string,Door>;
 lanes:Map<string,Lane>;owners:Map<string,Owner>;
 promotions:Map<string,string>;nextPromotionProbe:Map<string,number>};
const contexts=new WeakMap<Session,Context>();
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const normalDepth=(p:Pt,d:Door)=>{
 const dx=d.b.x-d.a.x,dy=d.b.y-d.a.y;
 const len=Math.hypot(dx,dy)||1;
 return ((p.x-d.a.x)*-dy+(p.y-d.a.y)*dx)/len;
};
const alongDoor=(p:Pt,d:Door)=>{
 const dx=d.b.x-d.a.x,dy=d.b.y-d.a.y;
 return ((p.x-d.a.x)*dx+(p.y-d.a.y)*dy)/
  (Math.hypot(dx,dy)||1);
};
const laneKey=(doorId:string,side:number)=>doorId+'|'+side;
function context(s:Session,schedule:PassageSchedule):Context{
 const cached=contexts.get(s);
 if(cached?.schedule===schedule)return cached;
 const byDoor=new Map(s.doors.map(d=>[d.id,d]));
 const actors=new Map(s.operators.map(a=>[a.id,a]));
 const lanes=new Map<string,Lane>();
 for(const [actorId,slots] of schedule){
  const actor=actors.get(actorId);
  if(!actor)continue;
  for(const slot of slots){
   const door=byDoor.get(slot.doorId);
   if(!door||dist(door.a,door.b)>60)continue;
   const key=laneKey(slot.doorId,slot.fromSide);
   let lane=lanes.get(key);
   if(!lane){lane={door,side:slot.fromSide,members:[]};lanes.set(key,lane);}
   lane.members.push({actor,slot});
  }
 }
 for(const lane of lanes.values())lane.members.sort((a,b)=>
  a.slot.rank-b.slot.rank||a.actor.id.localeCompare(b.actor.id));
 const value:Context={schedule,byDoor,lanes,owners:new Map(),
  promotions:new Map(),nextPromotionProbe:new Map()};
 contexts.set(s,value);
 return value;
}
function pending(actor:TeamActor,schedule:PassageSchedule,
 byDoor:ReadonlyMap<string,Door>):PassageSlot|null{
 for(const slot of schedule.get(actor.id)??[]){
  const door=byDoor.get(slot.doorId);
  if(door&&normalDepth(actor.p,door)*slot.fromSide>=-18)
   return slot;
 }
 return null;
}
function ready(member:Member,context:Context):boolean{
 const a=member.actor,d=context.byDoor.get(member.slot.doorId);
 if(!d||a.health<=0||a.side!=='blue')return false;
 const order=a.plan[0];
 if(!order||(order.kind!=='move'&&order.kind!=='pie'))return false;
 // A deliberately authored WAIT, STACK, SYNC, DOOR OPEN or DOOR TOOL
 // does not steal the threshold from the first actual crossing MOVE.
 if(normalDepth(order.p,d)*member.slot.fromSide>=-4)return false;
 if(normalDepth(a.p,d)*member.slot.fromSide< -18)return false;
 return pending(a,context.schedule,context.byDoor)===member.slot;
}
const throat=(p:Pt,door:Door):boolean=>
 Math.abs(normalDepth(p,door))<OPERATOR_RADIUS+7&&
 alongDoor(p,door)>-OPERATOR_RADIUS&&
 alongDoor(p,door)<dist(door.a,door.b)+OPERATOR_RADIUS;
const forwardTravel=(from:Pt,to:Pt,door:Door,side:-1|1)=>
 (normalDepth(from,door)-normalDepth(to,door))*side;
function capStep(from:Pt,to:Pt,door:Door,side:-1|1,
 minimumDepth:number,reason:QueueDecision['reason'],
 rank:number):QueueDecision{
 const before=normalDepth(from,door)*side;
 const forward=forwardTravel(from,to,door,side);
 if(forward<=.025||before-forward>=minimumDepth-.01)
  return {move:to,hold:false,reason:'free',doorId:door.id,rank};
 const available=Math.max(0,before-minimumDepth);
 const fraction=Math.min(1,available/forward);
 if(fraction>.04)return {move:{
  x:from.x+(to.x-from.x)*fraction,
  y:from.y+(to.y-from.y)*fraction},
  hold:false,reason,doorId:door.id,rank};
 // Holding position NEVER produces a reverse or lateral drift vector.
 return {move:from,hold:true,reason,doorId:door.id,rank};
}
function ownerFor(ctx:Context,s:Session,door:Door):Owner|null{
 const old=ctx.owners.get(door.id);
 if(old){
  const actor=s.operators.find(a=>a.id===old.id);
  const slot=actor&&pending(actor,ctx.schedule,ctx.byDoor);
  const active=!!actor&&!!slot&&slot.doorId===door.id&&
    ready({actor,slot},ctx);
  if(active){
   if(dist(old.lastAt,actor.p)>.7){
    old.lastAt={...actor.p};old.lastProgress=s.seconds;
   }
   if(throat(actor.p,door)||s.seconds-old.lastProgress<1.8)
    return old;
  }
  ctx.owners.delete(door.id);
 }
 // Choose once from ready crossing approachers, not each actor tick.
 let best:Member|null=null;
 for(const side of [-1,1] as const){
  for(const m of ctx.lanes.get(laneKey(door.id,side))?.members??[]){
   if(!ready(m,ctx)||dist(m.actor.p,doorCenter(door))>80)continue;
   if(!best||m.slot.eta<best.slot.eta-.001||
      Math.abs(m.slot.eta-best.slot.eta)<=.001&&
       m.actor.id.localeCompare(best.actor.id)<0)best=m;
  }
 }
 if(!best)return null;
 const result:Owner={id:best.actor.id,side:best.slot.fromSide,
  lastAt:{...best.actor.p},lastProgress:s.seconds};
 ctx.owners.set(door.id,result);
 return result;
}
/** Only genuinely blocked UNCOMMITTED leads may yield one rank turn.
 * This is a rare physical candidate test, never a 60-Hz global route search.
 * A lead intentionally doing a WAIT is not ready and needs no promotion.
 */
function maybePromote(ctx:Context,s:Session,lane:Lane,
 waiting:Member,leader:Member,move:Pt):boolean{
 const key=laneKey(lane.door.id,lane.side);
 if(ctx.promotions.has(key)||s.seconds<(ctx.nextPromotionProbe.get(key)??0))
  return false;
 const lead=leader.actor;
 const leadDepth=normalDepth(lead.p,lane.door)*lane.side;
 const waitDepth=normalDepth(waiting.actor.p,lane.door)*lane.side;
 if(throat(lead.p,lane.door)||leadDepth<=QUEUE_WAIT_DEPTH||
    dist(waiting.actor.p,doorCenter(lane.door))>70)return false;
 // A WAITING follower never outranks the lead solely because it is
 // physically closer or has waited longer. Promotion is a deliberately
 // rare response to a confirmed *physical movement* stall.
 if(lead.blockedTime<1.7||waitDepth+8<leadDepth)return false;
 ctx.nextPromotionProbe.set(key,s.seconds+.8);
 if(dist(waiting.actor.p,move)<.05||
    !sweptBodyClear(waiting.actor.p,move,s.doors,OPERATOR_RADIUS,
      sessionWorldGeometry(s)))return false;
 ctx.promotions.set(key,waiting.actor.id);
 s.events.push('PASSAGE PROMOTION '+lane.door.id+' · '+
  waiting.actor.id+' ahead of delayed '+lead.id);
 return true;
}
/** Single Q2 entry point. Does not change positions or order authority.
 * Motor-passage applies a full stop or the returned bounded stride.
 */
export function coordinatePassage(s:Session,a:TeamActor,
 move:Pt,schedule:PassageSchedule):QueueDecision{
 const free:QueueDecision={move,hold:false,reason:'free',
  doorId:null,rank:null};
 if(a.side!=='blue'||a.health<=0)return free;
 const ctx=context(s,schedule);
 const slot=pending(a,schedule,ctx.byDoor);
 if(!slot)return free;
 const door=ctx.byDoor.get(slot.doorId);
 if(!door||dist(door.a,door.b)>60||
    dist(a.p,doorCenter(door))>QUEUE_ENTRY_RADIUS||
    !ready({actor:a,slot},ctx))return free;
 const forward=forwardTravel(a.p,move,door,slot.fromSide);
 // Lateral corrective steps must still preserve real teammate body
 // spacing: the queue does not own the leaf, but it owns avoiding a
 // same-lane higher-rank person's capsule in any direction.
 // Only after the full body clears the exit plane is this
 // crossing outside the shared queue. Inside the throat, the leader may
 // go but a follower cannot ignore the body directly ahead.
 if(normalDepth(a.p,door)*slot.fromSide< -OPERATOR_RADIUS-10)
  return {...free,doorId:door.id,rank:slot.rank};
 const lane=ctx.lanes.get(laneKey(door.id,slot.fromSide));
 const occupants=s.operators.filter(other=>other!==a&&other.health>0&&
  throat(other.p,door));
 // Real occupants from either side outrank an approach reservation.
 const hostileThroat=occupants.some(other=>{
  const own=normalDepth(a.p,door)*slot.fromSide;
  const otherDepth=normalDepth(other.p,door)*slot.fromSide;
  return own>=0&&otherDepth<0;
 });
 if(hostileThroat&&forward>.025)return capStep(a.p,move,door,slot.fromSide,
  QUEUE_WAIT_DEPTH,'occupied',slot.rank);
 const otherSide=ownerFor(ctx,s,door);
 if(forward>.025&&otherSide&&otherSide.side!==slot.fromSide)
  return capStep(a.p,move,door,slot.fromSide,
   QUEUE_WAIT_DEPTH,'opposing',slot.rank);
 if(!lane)return {...free,doorId:door.id,rank:slot.rank};
 const candidates=lane.members.filter(m=>ready(m,ctx));
 const promoted=ctx.promotions.get(laneKey(door.id,lane.side));
 if(promoted){
  const i=candidates.findIndex(m=>m.actor.id===promoted);
  if(i>0)candidates.unshift(candidates.splice(i,1)[0]);
 }
 const index=candidates.findIndex(m=>m.actor.id===a.id);
 if(index<1)return {...free,doorId:door.id,rank:slot.rank};
 const leader=candidates[index-1];
 if(forward>.025&&maybePromote(ctx,s,lane,{actor:a,slot},leader,move))
  return {...free,doorId:door.id,rank:slot.rank};
 const leadDepth=normalDepth(leader.actor.p,door)*slot.fromSide;
 let safeDepth=Math.max(QUEUE_WAIT_DEPTH,leadDepth+QUEUE_CENTER_GAP);
 // Q2: retain spacing to *all* higher-priority ready bodies in this
 // lane, even as they move through the threshold. A nearer same-rank
 // member is not removed merely because another leader moved into the
 // room. For two different sides of a frame, leave naturally separated
 // flanks alone: only bodies in the same physical corridor limit advance.
 const ownLateral=alongDoor(a.p,door);
 const ownDepth=normalDepth(a.p,door)*slot.fromSide;
 for(let j=0;j<index;j++){
  const peer=candidates[j].actor;
  if(peer===a||peer.health<=0)continue;
  const peerDepth=normalDepth(peer.p,door)*slot.fromSide;
  if(peerDepth>=ownDepth-.01||peerDepth< -OPERATOR_RADIUS-10)continue;
  const peerLateral=alongDoor(peer.p,door);
  if(Math.abs(peerLateral-ownLateral)>OPERATOR_RADIUS*2+7)continue;
  safeDepth=Math.max(safeDepth,peerDepth+QUEUE_CENTER_GAP);
 }
 const longitudinal=forward>.025?
  capStep(a.p,move,door,slot.fromSide,
   safeDepth,'spacing',slot.rank):
  {move,hold:false,reason:'free' as const,doorId:door.id,rank:slot.rank};
 // Q2: independently maintain actual center-to-center spacing through the
 // throat, not just projected depth. Two operators may have staggered
 // sideways paths at the same depth; longitudinal spacing alone permits a
 // brief body-sized "accordion" when the lead changes lane.
 if(longitudinal.hold)return longitudinal;
 let fraction=1;
 const proposed=longitudinal.move;
 for(let j=0;j<index;j++){
  const peer=candidates[j].actor;
  if(peer.health<=0||!ready(candidates[j],ctx))continue;
  const fromGap=dist(a.p,peer.p);
  const toGap=dist(proposed,peer.p);
  if(toGap>=QUEUE_CENTER_GAP-.25||
     toGap>fromGap+.005)continue;
  if(fromGap<QUEUE_CENTER_GAP-.25){fraction=0;break;}
  // Fixed eight-step monotonic clamp; no route search or allocation.
  let lo=0,hi=fraction;
  for(let n=0;n<8;n++){
   const mid=(lo+hi)/2;
   const p={x:a.p.x+(proposed.x-a.p.x)*mid,
    y:a.p.y+(proposed.y-a.p.y)*mid};
   if(dist(p,peer.p)>=QUEUE_CENTER_GAP-.25)lo=mid;
   else hi=mid;
  }
  fraction=Math.min(fraction,lo);
 }
 if(fraction>=.999)return longitudinal;
 if(fraction<.04)return {move:a.p,hold:true,reason:'spacing',
  doorId:door.id,rank:slot.rank};
 return {move:{x:a.p.x+(proposed.x-a.p.x)*fraction,
  y:a.p.y+(proposed.y-a.p.y)*fraction},hold:false,
  reason:'spacing',doorId:door.id,rank:slot.rank};
}
