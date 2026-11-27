import {makeTransportContact,transportContactDuration} from './breach-transport-contact.ts';
import {prepareHandsFree} from './breach-weapon-retention-live.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
/** Stage 8: deterministic medical supply recovery, treatment and
 * physical casualty transport. Neutral bodies remain on shared frame arbiter.
 */
import {type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {deployedEquipmentAccess} from './equipment-unified-deployed.ts';
import {kitMedicalSupplies,transferMedicalSupply,spendMedicalSupply}
 from './equipment-medical-supplies.ts';
import {treatmentSupplyForWound,treatmentDuration}
 from './breach-medical-treatment.ts';
import {stabilizeWound} from './breach-medical-wounds.ts';
import {acquireTransport,releaseTransport} from './breach-transport-custody.ts';
import {dropCivilianCustody,takeCivilianCustody}
 from './breach-civilian-transport.ts';
import {captureTargetTransportEligible}
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
    if(patient.carriedById){failCurrentOrder(s,a,n,'SET DOWN CASUALTY BEFORE RECOVERING SUPPLIES');return true;}
    if(!near(a.p,patient.p,27)){
      const dir=angle(patient.p,a.p);
      approach(a,{x:patient.p.x+Math.cos(dir)*21,
        y:patient.p.y+Math.sin(dir)*21},dt,s,.66);return true;
    }
    // Reaching a casualty's pouch and stowing the recovered item each
    // incur the actual kit container access time; no instant inventory swap.
    const fromTime=deployedEquipmentAccess(patient,'medical');
    const toTime=deployedEquipmentAccess(a,'medical');
    if(!Number.isFinite(fromTime)||!Number.isFinite(toTime)){
      failCurrentOrder(s,a,n,'MEDICAL STORAGE UNAVAILABLE');return true;
    }
    if(!prepareHandsFree(a,dt,s))return true;
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
      else if(a.carryingId===n.patientId)releaseTransport(a,friendly);
      pop(a);return true;
    }
    // A stale queued pickup must never overwrite a different reciprocal
    // custody link acquired by an earlier order or restored from replay.
    if(a.carryingId&&a.carryingId!==patient.id){
      failCurrentOrder(s,a,n,'ALREADY TRANSPORTING A CASUALTY');return true;
    }
    if(patient.carriedById&&patient.carriedById!==a.id){
      failCurrentOrder(s,a,n,'CASUALTY ALREADY IN TRANSPORT');return true;
    }
    const mode=n.transportMode??'drag';
    if(a.carryingId!==patient.id){
      if(!near(a.p,patient.p,24)){
        a.actionTimer=0;a.transportContact=undefined;
        const theta=angle(patient.p,a.p);
        const goal={x:patient.p.x+Math.cos(theta)*19,
          y:patient.p.y+Math.sin(theta)*19};
        approach(a,goal,dt,s,.70);return true;
      }
      // Opposing downed capture targets need the same observed contact and
      // full-body swept reach as neutral rescue casualties. No remote pickup.
      if(((civil||friendly?.side==='red')&&!liveVisibility(s,patient.p))||
         ((n.transportPickup||civil||friendly?.side==='red')&&
          !sweptBodyClear(a.p,patient.p,s.doors,5.5,
             sessionWorldGeometry(s)))){
        a.transportContact=undefined;
        failCurrentOrder(s,a,n,'CASUALTY NOT IN PHYSICAL REACH');return true;
      }
      a.velocity=0;
      if(s.seconds-a.lastHitAt<.35){a.actionTimer=0;a.transportContact=undefined;return true;}
      if(!rotate(a,angle(a.p,patient.p),dt,s))return true;
      if(!prepareHandsFree(a,dt,s))return true;
      a.actionTimer+=dt;
      a.transportContact=makeTransportContact(n.id,patient,mode,'pickup',a.actionTimer);
      if(a.actionTimer>=transportContactDuration(mode,'pickup')){
        if(civil){
          if(!takeCivilianCustody(civil,a,mode)){
            failCurrentOrder(s,a,n,'CASUALTY TRANSPORT UNAVAILABLE');return true;
          }
          if(civil.rescueTarget&&s.rescue){
            s.rescue.following=null;s.rescue.p=clone(civil.p);
          }
        }else{
          if(!acquireTransport(a,patient,mode)){
            failCurrentOrder(s,a,n,'CASUALTY TRANSPORT UNAVAILABLE');return true;
          }
        }
        a.transportContact=undefined;
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
        // A drag no longer drifts while stopped. Continue inside the gate
        // until the actual patient also enters, rather than waiting forever.
        if(!near(patient.p,s.scenario.extract,37)&&!near(a.p,s.scenario.extract,5))
          approach(a,s.scenario.extract,dt,s);
        else a.velocity=0;
        return true;
      }
      a.velocity=0;a.actionTimer+=dt;
      a.transportContact=makeTransportContact(n.id,patient,mode,'release',a.actionTimer);
      if(a.actionTimer<transportContactDuration(mode,'release'))return true;
      if(civil)dropCivilianCustody(civil,a);
      else releaseTransport(a,patient);
      notify(s,('name' in patient?patient.name:'CIVILIAN')+' RELEASED');
      pop(a);return true;
    }
    approach(a,destination,dt,s);
    // Both neutral and operator casualties commit in shared motion phase.
    return true;
  }
  if(n.kind==='treat'){
    const patient=s.operators.find(o=>o.id===n.patientId&&
      (o.side===a.side||a.side==='blue'&&
        o.side==='red'&&o.health<=0));
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
    if(patient.carriedById){failCurrentOrder(s,a,n,'SET DOWN CASUALTY BEFORE TREATMENT');return true;}
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
    if(!prepareHandsFree(a,dt,s))return true;
    if(a.actionTimer===0){
      a.lastTreatmentAt=s.seconds;a.lastTreatmentTargetId=patient.id;
    }
    const access=deployedEquipmentAccess(a,'medical');
    if(a.unifiedCarry&&!Number.isFinite(access)){failCurrentOrder(s,a,n,'MEDICAL STORAGE UNAVAILABLE');return true;}
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
