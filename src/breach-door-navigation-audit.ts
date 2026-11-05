/** DNav-A: retrospective door obstruction evidence for deterministic QA.
 * This module does not alter orders, door motors, pathfinding or fog of war.
 * It must be used in offline audit only: real door positions are privileged.
 */
import {doorLeafSegment,doorCenter,pointToSegment,OPERATOR_RADIUS,
 type Pt,type Door} from './breach-core.ts';
type ObserveActor={
 id:string;p:Pt;nav:readonly Pt[];
 plan:readonly {p:Pt;kind?:string;doorId?:string;method?:string}[];
 blockedTime:number;lastBlocker:string;motorPause:string|null;
 recoveryAttempts:number;velocity:number;
};
const rounded=(n:number)=>Math.round(n*100)/100;
const point=(p:Pt)=>({x:rounded(p.x),y:rounded(p.y)});
export type DoorBlockSnapshot={
 actorId:string;blockedSeconds:number;cause:string;pause:string;
 orderKind:string|null;orderDoorId:string|null;orderMethod:string|null;
 at:Pt;next:Pt|null;goal:Pt|null;velocity:number;repairs:number;
 doorId:string|null;leafGap:number|null;frameDistance:number|null;
 fraction:number|null;open:boolean|null;locked:boolean|null;
 wedged:boolean|null;held:boolean|null;hinge:string|null;
 swing:number|null;nearPhysicalContact:boolean;nearFrame:boolean;
};
export function sampleDoorBlock(actor:ObserveActor,
 doors:readonly Door[]):DoorBlockSnapshot{
 const candidates=doors.map(door=>({
  door,gap:pointToSegment(actor.p,doorLeafSegment(door)),
  centerDist:Math.hypot(actor.p.x-doorCenter(door).x,
    actor.p.y-doorCenter(door).y)
 })).sort((a,b)=>a.gap-b.gap||a.door.id.localeCompare(b.door.id));
 const candidate=candidates[0];
 const d=candidate?.door;
 const close=!!candidate&&candidate.gap<OPERATOR_RADIUS+25;
 return {
  actorId:actor.id,blockedSeconds:rounded(actor.blockedTime),
  cause:actor.lastBlocker,pause:actor.motorPause??'none',
  orderKind:actor.plan[0]?.kind??null,
  orderDoorId:actor.plan[0]?.doorId??null,
  orderMethod:actor.plan[0]?.method??null,
  at:point(actor.p),next:actor.nav.length?point(actor.nav[0]):null,
  goal:actor.plan.length?point(actor.plan[0].p):null,
  velocity:rounded(actor.velocity),repairs:actor.recoveryAttempts,
  doorId:close&&d?d.id:null,
  leafGap:close?rounded(candidate.gap):null,
  frameDistance:close?rounded(candidate.centerDist):null,
  fraction:close&&d?rounded(d.openFraction??(d.open?1:0)):null,
  open:close&&d?!!d.open:null,
  locked:close&&d?!!d.locked:null,
  wedged:close&&d?!!d.wedged:null,
  held:close&&d?!!d.heldBy:null,
  hinge:close&&d?(d.hinge??null):null,
  swing:close&&d?(d.swing??null):null,
  nearPhysicalContact:close&&candidate.gap<OPERATOR_RADIUS+1,
  nearFrame:!!candidate&&candidate.centerDist<45
 };
}
