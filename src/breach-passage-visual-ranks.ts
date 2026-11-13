/** Q3: read-only doorway crossing rank previews, never movement authority.
 * The active GO schedule is already cached by breach-game. Planning
 * previews are invalidated with a cheap small-plan fingerprint; expensive
 * known route queries only run after an actual authoring change.
 */
import type {Pt,Door} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {livePassageSchedule} from './breach-game.ts';
import {planDoorSchedule,pendingPassageSlot,type PassageSchedule,
 type PassageSlot} from './breach-passage-plan.ts';
import {legalMoveRoute} from './breach-known-route-authoring.ts';
import {doorKnown} from './breach-intel.ts';

type Preview={signature:string;schedule:PassageSchedule};
const previews=new WeakMap<Session,Preview>();
/** Signature reads authored path intent, not position changes during GO.
 * This includes edits to existing points and undo/redo with reused IDs.
 */
function signature(s:Session):string{
 let key='';
 for(const a of s.operators){
  if(a.side!=='blue')continue;
  key+=a.id+':'+a.p.x+','+a.p.y+':'+a.pace+':'+a.posture+
   ':'+(a.loadMovementScale??1)+';';
  for(const n of a.plan){
   key+=n.id+':'+n.kind+':'+n.p.x+','+n.p.y+':'+
    (n.duration??'')+':'+(n.moveMode??'')+':'+
    (n.paceState??'')+':'+(n.doorId??'')+';';
   if(n.arc)for(const p of n.arc)key+=p.x+','+p.y+';';
  }
 }
 return key;
}
export function visiblePassageSchedule(s:Session):PassageSchedule{
 if(s.phase!=='planning')return livePassageSchedule(s);
 const next=signature(s),prior=previews.get(s);
 if(prior?.signature===next)return prior.schedule;
 const schedule=planDoorSchedule(s.operators,s.doors,
  (a,b)=>legalMoveRoute(s,a,b));
 previews.set(s,{signature:next,schedule});
 return schedule;
}
export type PassageRankMarker={
 actorId:string;doorId:string;rank:number;fromSide:-1|1;
 point:Pt;door:Door
};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
/** Each door owns independent ordering. Stagger the rank symbols behind
 * the approach plane and along the lintel to avoid overlapping badges.
 */
export function thresholdRankMarkers(
 s:Session,schedule:PassageSchedule,
 replaying=false
):PassageRankMarker[]{
 if(replaying)return [];
 const doors=new Map(s.doors.map(d=>[d.id,d]));
 const markers:PassageRankMarker[]=[];
 for(const [actorId,slots] of schedule){
  const actor=s.operators.find(o=>o.id===actorId);
  if(!actor||actor.health<=0||actor.side!=='blue')continue;
  const shown=s.phase==='planning'?slots:
   [pendingPassageSlot(actor.p,slots,s.doors)].filter(
    (x):x is PassageSlot=>x!==null);
  for(const slot of shown){
   const door=doors.get(slot.doorId);
   // UI may not disclose hidden doors just because the raw physical
   // schedule knows they exist. The motor continues using the full
   // immutable schedule; only presentation is filtered by player intel.
   if(!door||(s.intel&&!doorKnown(s.intel,door.id)))continue;
   const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
   const width=dist(door.a,door.b);
   if(width<=0)continue;
   const tx=dx/width,ty=dy/width,nx=-ty,ny=tx;
   const mid={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
   // One small numbered column immediately beyond the NON-hinge jamb,
   // instead of spreading four circles across the doorway/actor routes.
   const longitudinal=16+slot.rank*16;
   const lateral=(door.hinge==='b'?-1:1)*(width/2+15);
   markers.push({actorId,doorId:slot.doorId,rank:slot.rank,
    fromSide:slot.fromSide,door,
    point:{x:mid.x+nx*slot.fromSide*longitudinal+tx*lateral,
     y:mid.y+ny*slot.fromSide*longitudinal+ty*lateral}});
  }
 }
 return markers;
}
export function nextThresholdRank(a:TeamActor,
 s:Session,schedule:PassageSchedule):number|null{
 if(s.phase==='planning'){
  const slots=schedule.get(a.id);
  const first=slots?.[0];
  return first&&(!s.intel||doorKnown(s.intel,first.doorId))?
   first.rank+1:null;
 }
 const slot=pendingPassageSlot(a.p,schedule.get(a.id),s.doors);
 return slot&&(!s.intel||doorKnown(s.intel,slot.doorId))?
  slot.rank+1:null;
}
