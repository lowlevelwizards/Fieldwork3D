import {sessionWorldGeometry} from './breach-world-context.ts';
/** Stage 8: deterministic medical supply recovery, treatment and
 * physical casualty transport. Neutral bodies remain on shared frame arbiter.
 */
import {type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {equipmentRetrievalSeconds} from './equipment-carry-placement.ts';
import {initialEquipmentLoadout} from './equipment-loadouts.ts';
import {kitMedicalSupplies,transferMedicalSupply,spendMedicalSupply}
 from './equipment-medical-supplies.ts';
import {treatmentSupplyForWound,treatmentDuration}
 from './breach-medical-treatment.ts';
import {stabilizeWound} from './breach-medical-wounds.ts';
import {dropCivilianCustody,takeCivilianCustody,proposedCivilianTransportStep}
 from './breach-civilian-transport.ts';
import {captureTargetTransportEligible,designatedDownedCaptureTarget}
 from './breach-capture-transport-policy.ts';
import {captureVitalStatus} from './breach-capture-vitals.ts';

import {sweptBodyClear} from './breach-navigation.ts';
import {completeOrder,rotate,clearCurrentOrderIssue,
 failCurrentOrder as failOrder} from './breach-order-lifecycle.ts';
import type {OrderExecutionPort} from './breach-order-execution-port.ts';
import {targetAngle} from './breach-plan.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a:Pt,b:Pt,range:number)=>d(a,b)<=range;
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);
const clone=(p:Pt):Pt=>({...p});
const pop=completeOrder;
export function createMedicalOrderHandler(port:OrderExecutionPort){
 const {approach,notify,battleEvent,liveVisibility}=port;
 const failCurrentOrder=(s:Session,a:TeamActor,n:PlanNode,reason:string)=>
  failOrder(s,a,n,reason,port.notify);
 return function executeMedicalOrder(s:Session,a:TeamActor,n:PlanNode,dt:number):boolean{
  if(n.kind==='recover-medical'){
    const patient=s.operators.find(o=>o.id===n.patientId&&o.side===a.side);
    if(!patient||patient.health>0){pop(a);return true;}
    if(!near(a.p,patient.p,27)){
      const dir=angle(patient.p,a.p);
      approach(a,{x:patient.p.x+Math.cos(dir)*21,
        y:patient.p.y+Math.sin(dir)*21},dt,s,.66);return true;
    }
    // Reaching a casualty's pouch and stowing the recovered item each
    // incur the actual kit container access time; no instant inventory swap.
    const fromTime=equipmentRetrievalSeconds(
      patient.equipment??initialEquipmentLoadout(patient.weapon),
      patient.spareMagazines,'medical');
    const toTime=equipmentRetrievalSeconds(
      a.equipment??initialEquipmentLoadout(a.weapon),
      a.spareMagazines,'medical');
    if(!Number.isFinite(fromTime)||!Number.isFinite(toTime)){
      failCurrentOrder(s,a,n,'MEDICAL STORAGE UNAVAILABLE');return true;
    }
    clearCurrentOrderIssue(a);a.velocity=0;a.actionTimer+=dt;
    if(a.actionTimer>=1.35+fromTime+toTime){
      const transferred=transferMedicalSupply(patient.medicalSupplies,
        a.medicalSupplies,kitMedicalSupplies(a.equipment));
      if(transferred){
        notify(s,a.name+' RECOVERED '+transferred.toUpperCase());
        battleEvent(s,'interaction',a,patient.p,
          a.name+' RECOVERED '+transferred.toUpperCase());
      }
      pop(a);
    }
    return true;
  }
  if(n.kind==='evacuate'){
    const civil=s.civilians.find(c=>c.id===n.patientId);
    const friendly=s.operators.find(o=>o.id===n.patientId&&
      (o.side===a.side||captureTargetTransportEligible(s,o,a)||
       (n.transportPickup&&a.side==='blue'&&o.side==='red'&&o.health<=0)||
       (a.carryingId===o.id&&o.carriedById===a.id)));
    const patient=friendly??civil;
    if(!patient||patient===a||patient.health>0||
       (friendly&&captureVitalStatus(friendly)==='deceased')||
       (friendly&&friendly.side===a.side&&friendly.surrendered)){
      if(civil&&civil.carriedById===a.id)dropCivilianCustody(civil,a);
      else if(friendly?.carriedById===a.id){
        friendly.carriedById=null;friendly.transportMode=null;
      }
      if(a.carryingId===n.patientId){a.carryingId=null;a.transportLatched=false;}
      pop(a);return true;
    }
    if(patient.carriedById&&patient.carriedById!==a.id){
      failCurrentOrder(s,a,n,'CASUALTY ALREADY IN TRANSPORT');return true;
    }
    const mode=n.transportMode??'drag';
    if(a.carryingId!==patient.id){
      if(!near(a.p,patient.p,24)){
        const theta=angle(patient.p,a.p);
        const goal={x:patient.p.x+Math.cos(theta)*19,
          y:patient.p.y+Math.sin(theta)*19};
        approach(a,goal,dt,s,.70);return true;
      }
      // Opposing downed capture targets need the same observed contact and
      // full-body swept reach as neutral rescue casualties. No remote pickup.
      if((civil||friendly?.side==='red')&&
         (!liveVisibility(s,patient.p)||
          !sweptBodyClear(a.p,patient.p,s.doors,5.5,
             sessionWorldGeometry(s)))){
        failCurrentOrder(s,a,n,'CASUALTY NOT IN PHYSICAL REACH');return true;
      }
      a.velocity=0;a.actionTimer+=dt;
      if(a.actionTimer>=(mode==='drag'?.85:1.45)){
        if(civil){
          if(!takeCivilianCustody(civil,a,mode)){
            failCurrentOrder(s,a,n,'CASUALTY TRANSPORT UNAVAILABLE');return true;
          }
          if(civil.rescueTarget&&s.rescue){
            s.rescue.following=null;s.rescue.p=clone(civil.p);
          }
        }else{
          a.carryingId=patient.id;patient.carriedById=a.id;
          patient.transportMode=mode;
        }
        a.actionTimer=0;clearCurrentOrderIssue(a);
        notify(s,a.name+' '+(mode==='drag'?'DRAGGING':'CARRYING')+' '+
          ('name' in patient?patient.name:'CIVILIAN'));
        if(n.transportPickup){a.transportLatched=true;pop(a);}
      }
      return true;
    }
    if(n.transportPickup){a.transportLatched=true;pop(a);return true;}
    // Follow each user-drawn bend while maintaining this exact reciprocal
    // casualty attachment. No intermediate MOVE order may release the body.
    const destination=n.transportPath?.[0]??n.p;
    if(near(a.p,destination,8)){
      if(n.transportPath?.length){
        n.transportPath.shift();a.nav=[];a.velocity=0;return true;
      }
      // Keep valid custody until the objective can acknowledge extraction.
      if((civil?.rescueTarget||
          friendly?.id===s.captureTarget&&s.missionType==='capture')&&
         s.mission==='extract'&&near(a.p,s.scenario.extract,37)){
        // Keep custody until the physically trailing body enters extraction.
        a.velocity=0;return true;
      }
      if(civil)dropCivilianCustody(civil,a);
      else {patient.carriedById=null;patient.transportMode=null;}
      a.carryingId=null;
      notify(s,('name' in patient?patient.name:'CIVILIAN')+' RELEASED');
      pop(a);return true;
    }
    const before=clone(a.p);
    approach(a,destination,dt,s,mode==='drag'?.48:.38);
    if(civil)return true; // Neutral body motion commits with the carrier later.
    // Apply the same bounded, swept physical body step as civilian rescue.
    // An operator casualty must never snap 9–16 units across a threshold
    // on the first pickup tick, even if the carrier has barely moved.
    const people:Pt[]=[];
    for(const o of s.operators)if(o!==a&&o!==patient)people.push(o.p);
    for(const c of s.civilians)people.push(c.p);
    const attached=proposedCivilianTransportStep(patient.p,before,a.p,
      a.heading,mode,
      (from,to)=>sweptBodyClear(from,to,s.doors,8,sessionWorldGeometry(s)),
      people,dt*36);
    if(!attached){
      a.p=before;a.velocity=0;a.nav=[];return true;
    }
    patient.priorP=clone(patient.p);patient.p=attached;
    patient.velocity=0;return true;
  }
  if(n.kind==='treat'){
    const patient=s.operators.find(o=>o.id===n.patientId&&
      (o.side===a.side||a.side==='blue'&&
        designatedDownedCaptureTarget(s,o)));
    const hostile=!!patient&&patient.side!==a.side;
    const wound=patient?.medical.wounds.find(w=>w.id===n.woundId);
    if(!patient||!wound||wound.stabilized||wound.bleeding<=0||
      captureVitalStatus(patient)==='deceased'){
      pop(a);return true;
    }
    if(hostile&&(!liveVisibility(s,patient.p)||
       !sweptBodyClear(a.p,patient.p,s.doors,5.5,
          sessionWorldGeometry(s)))){
      failCurrentOrder(s,a,n,'CAPTIVE NOT IN PHYSICAL MEDICAL REACH');return true;
    }
    const supply=treatmentSupplyForWound(wound,a.medicalSupplies);
    if(!supply){
      failCurrentOrder(s,a,n,'MEDICAL SUPPLY UNAVAILABLE');return true;
    }
    clearCurrentOrderIssue(a);
    if(!near(a.p,patient.p,27)){
      const direction=angle(patient.p,a.p);
      const destination={x:patient.p.x+Math.cos(direction)*21,
        y:patient.p.y+Math.sin(direction)*21};
      a.actionTimer=0;approach(a,destination,dt,s,.58);return true;
    }
    a.velocity=0;rotate(a,angle(a.p,patient.p),dt);
    if(s.seconds-a.lastHitAt<.35){a.actionTimer=0;return true;}
    if(a.actionTimer===0){
      a.lastTreatmentAt=s.seconds;a.lastTreatmentTargetId=patient.id;
    }
    const access=equipmentRetrievalSeconds(
      a.equipment??initialEquipmentLoadout(a.weapon),a.spareMagazines,'medical');
    const duration=treatmentDuration(supply)+(Number.isFinite(access)?access:0);
    a.actionTimer+=dt;
    a.treatmentActive=true;
    a.treatmentProgress=Math.min(1,a.actionTimer/duration);
    if(a.actionTimer>=duration){
      if(stabilizeWound(patient.medical,wound.id)){
        spendMedicalSupply(a.medicalSupplies,supply);
        battleEvent(s,'interaction',a,patient.p,
          a.name+' STABILIZED '+patient.name);
        notify(s,a.name+' STABILIZED '+patient.name);
      }
      pop(a);
    }
    return true;
  }

 return false;
 };
}
