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
import {dropCivilianCustody,takeCivilianCustody} from './breach-civilian-transport.ts';
import {casualtyTrailingPosition,transportIsClear}
 from './breach-casualty-transport.ts';
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
    const friendly=s.operators.find(o=>o.id===n.patientId&&o.side===a.side);
    const patient=friendly??civil;
    if(!patient||patient===a||patient.health>0||
       (friendly&&friendly.surrendered)){
      if(civil&&civil.carriedById===a.id)dropCivilianCustody(civil,a);
      else if(friendly)friendly.carriedById=null;
      a.carryingId=null;pop(a);return true;
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
      if(civil&&(!liveVisibility(s,civil.p)||
         !sweptBodyClear(a.p,civil.p,s.doors,5.5))){
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
        }
        a.actionTimer=0;clearCurrentOrderIssue(a);
        notify(s,a.name+' '+mode.toUpperCase()+'ING '+
          ('name' in patient?patient.name:'CIVILIAN'));
      }
      return true;
    }
    if(near(a.p,n.p,8)){
      // Keep valid custody until the objective can acknowledge extraction.
      if(civil?.rescueTarget&&s.mission==='extract'&&
         near(a.p,s.scenario.extract,37)){
        // Keep custody until the physically trailing body enters extraction.
        a.velocity=0;return true;
      }
      if(civil)dropCivilianCustody(civil,a);
      else patient.carriedById=null;
      a.carryingId=null;
      notify(s,('name' in patient?patient.name:'CIVILIAN')+' RELEASED');
      pop(a);return true;
    }
    const before=clone(a.p);
    approach(a,n.p,dt,s,mode==='drag'?.48:.38);
    if(civil)return true; // Neutral body motion commits with the carrier later.
    const attached=casualtyTrailingPosition(before,a.p,a.heading,mode);
    const people=s.operators.filter(o=>o!==a&&o!==patient&&o.health>0)
     .map(o=>o.p);
    if(!transportIsClear(patient.p,attached,
      (from,to)=>sweptBodyClear(from,to,s.doors),people)){
      a.p=before;a.velocity=0;a.nav=[];return true;
    }
    patient.priorP=clone(patient.p);patient.p=attached;
    patient.velocity=0;return true;
  }
  if(n.kind==='treat'){
    const patient=s.operators.find(o=>o.id===n.patientId&&o.side===a.side);
    const wound=patient?.medical.wounds.find(w=>w.id===n.woundId);
    if(!patient||!wound||wound.stabilized||wound.bleeding<=0){pop(a);return true;}
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
