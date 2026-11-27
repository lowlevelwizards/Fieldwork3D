import {advanceAutomaticDoors,automaticDoorPowered} from './breach-door-operating-modes.ts';
/** Authoritative first phase: medical deterioration then door state.
 * Runs after the clock advances, before all awareness, movement and fire.
 * Includes real opening-yield movement; no presentation or replay ownership.
 */
import {type Pt,OPERATOR_RADIUS} from './breach-core.ts';
import {advanceMedicalCondition} from './breach-medical-wounds.ts';
import {sampleBleedingEvidence} from './breach-blood-evidence.ts';
import {releaseDownedSuspectWeapons} from './breach-suspect-weapons.ts';
import {advanceDownedVitals,recordActualDown} from './breach-capture-vitals.ts';
import {releaseTransport} from './breach-transport-custody.ts';
import {dropCivilianCustody} from './breach-civilian-transport.ts';
import {wallSafeFall} from './breach-ground-geometry.ts';
import {advanceDoor,doorReachable,initialOpeningYieldCandidate} from './breach-door.ts';
import {maintainDoorHandContact} from './breach-door-hand-contact.ts';
import {noteQueueMotion} from './breach-queue-trace.ts';
import {openingYieldBudget,commitOpeningYield} from './breach-passage-yield.ts';
import {allowOpeningYieldAtCompletedEntry}
 from './breach-completed-entry-leaf-yield.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import type {BattleEvent} from './breach-combat.ts';
import type {Session,TeamActor} from './breach-game.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});
export type MedicalDoorPhasePort={
 notify:(s:Session,message:string)=>void;
 battleEvent:(s:Session,kind:BattleEvent['kind'],actor:TeamActor|null,
   p:Pt,text:string,meta?:BattleEvent['meta'])=>void;
};
/** Live bodies that can resist any door swing. Updated only after a
 * physical opening-yield changes a position during this door phase.
 * No stale position or actor is ever reused across simulation ticks. */
function liveDoorOccupants(s:Session):Pt[]{
  const positions:Pt[]=[];
  for(const operator of s.operators)
    if(operator.health>0||operator.carriedById)positions.push(operator.p);
  for(const civilian of s.civilians)
    if(civilian.health>0||civilian.carriedById)positions.push(civilian.p);
  return positions;
}

export function advanceMedicalDoorPhase(s:Session,h:number,
  {notify,battleEvent}:MedicalDoorPhasePort):void{
  for(const operator of s.operators)operator.treatmentActive=false;
  // Medical state advances on the authoritative fixed tick only.
  for(const casualty of s.operators){
    if(casualty.carryingId&&(casualty.health<=0||casualty.surrendered)){
      const civil=s.civilians.find(c=>c.id===casualty.carryingId);
      if(civil)dropCivilianCustody(civil,casualty);
      else releaseTransport(casualty,s.operators.find(o=>o.id===casualty.carryingId));
    }
    if(casualty.health<=0){
      casualty.transportContact=undefined;
      releaseDownedSuspectWeapons(s,casualty);
      if(advanceDownedVitals(casualty,h,s.seconds)){
        // A living extraction is no longer possible. Release reciprocal
        // custody so a carrier cannot become stuck in transport mode.
        if(casualty.carriedById){
          const carrier=s.operators.find(o=>o.id===casualty.carriedById);
          if(carrier?.carryingId===casualty.id){
            releaseTransport(carrier,casualty);
          }
        }
        s.deaths++;
        if(casualty.lastDownById){
          const responsible=s.operators.find(o=>o.id===casualty.lastDownById);
          if(responsible)responsible.kills++;
        }
        // Never reveal a red casualty death through global fog.
        if(casualty.side==='blue')
          notify(s,casualty.name+' DECEASED — UNCONTROLLED BLOOD LOSS');
      }
      continue;
    }
    const loss=advanceMedicalCondition(casualty.medical,h);
    if(loss<=0)continue;
    casualty.injuryStage=Math.min(3,casualty.injuryStage+loss);
    casualty.health=Math.max(0,4-casualty.injuryStage);
    if(casualty.health<=0){
      if(casualty.carryingId){
        const civil=s.civilians.find(c=>c.id===casualty.carryingId);
        if(civil)dropCivilianCustody(civil,casualty);
        else releaseTransport(casualty,s.operators.find(o=>o.id===casualty.carryingId));
      }
      casualty.transportContact=undefined;
      recordActualDown(casualty,s.seconds);
      releaseDownedSuspectWeapons(s,casualty);
      casualty.lastDownAt=s.seconds;
      const fall=wallSafeFall(casualty.p,casualty.heading,'slump',sessionWorldGeometry(s).walls);
      casualty.downPose=fall.pose;casualty.downClearance=fall.space;
      casualty.plan=[];casualty.nav=[];casualty.path=[];casualty.velocity=0;
      notify(s,casualty.name+' DOWN — UNCONTROLLED BLEEDING');
      battleEvent(s,'down',casualty,casualty.p,casualty.name+' DOWN');
    }else battleEvent(s,'wound',casualty,casualty.p,
      casualty.name+' WOUND DETERIORATING');
  }
  sampleBleedingEvidence(s,h);
  // Only attached/releasing hands need D4 reach checks. A valid
  // grip can request a wider opening, but the exact hinge/body sweep
  // below remains the sole authority to move the panel.
  for(const actor of s.operators)
    if(actor.doorHandContact)maintainDoorHandContact(s,actor);
  // Door leaves sample all live bodies, but normal ticks do not move any
  // body during the door phase. Build the positions once per fixed tick,
  // refreshing only if a real opening-yield actually relocated an operator.
  let doorOccupants=liveDoorOccupants(s);
  // Sensors also protect stationary/downed bodies, without manufacturing a
  // character interaction or granting an exception to physical collision.
  const hasAutomatic=s.doors.some(d=>d.operatingMode==='automatic');
  if(hasAutomatic)advanceAutomaticDoors(s.doors,
    [...s.operators.map(a=>a.p),...s.civilians.map(c=>c.p)],
    s.seconds,automaticDoorPowered(s));
  for(const door of s.doors){
    if(door.operatingMode==='automatic'&&!door.latchBroken&&
       (!automaticDoorPowered(s)||door.jammed))continue;
    if(door.heldBy){
      const holder=s.operators.find(a=>a.id===door.heldBy);
      if(!holder||holder.health<=0||holder.plan.length>0||
         holder.nav.length>0||!doorReachable(holder.p,door))
        door.heldBy=null;
    }
    let yielded=false;
    // An operator just inside the initial sweep may yield a small REAL
    // step before the leaf advances. This is not an actor-collision bypass:
    // static geometry, other leaves and opposing bodies must all remain solid.
    if(door.open&&(door.openFraction??0)<.96&&
       (door.pushTarget??1)<=1.01){
      for(const actor of s.operators){
        if(actor.health<=0||actor.carryingId)continue;
        const budget=openingYieldBudget(s,door,actor.id);
        if(budget<.03)continue;
        const candidate=initialOpeningYieldCandidate(door,actor.p,
          Math.min(1.25,budget));
        // A finished generated entry may physically hold its sector when
        // the same opening leaf would otherwise push it out of arrival range.
        // Never move the leaf through the stationary body: ordinary hinge
        // collision blocks it until the space is genuinely clear.
        if(!candidate||!allowOpeningYieldAtCompletedEntry(actor,door.id,candidate)||
           !sweptBodyClear(actor.p,candidate,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s))||
           s.operators.some(other=>{
             if(other===actor||other.health<=0)return false;
             const before=d(other.p,actor.p),after=d(other.p,candidate);
             // Friendly passage allows shoulder contact, but auto-yield
             // must never deepen an existing shared-body overlap.
             if(other.side===actor.side)
               return after<16&&after<before-.01;
             return after<11;
           }))continue;
        commitOpeningYield(s,door,actor.id,actor.p,candidate);
        noteQueueMotion(s,actor,'opening-leaf-yield',actor.p,candidate,door.id);
        actor.priorP=clone(actor.p);
        actor.p=candidate;
        yielded=true;
      }
    }
    if(yielded)doorOccupants=liveDoorOccupants(s);
    advanceDoor(door,h,doorOccupants,sessionWorldGeometry(s));
  }
  // Hinge motion occurs AFTER the initial hand reach check. Revalidate
  // only attached hands at the newly rotated panel position, otherwise a
  // fast leaf can leave a one-frame grip beyond actual reach.
  for(const actor of s.operators)
    if(actor.doorHandContact?.releasedAt===null)
      maintainDoorHandContact(s,actor);
}
