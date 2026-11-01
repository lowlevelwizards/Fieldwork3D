import test from 'node:test';import assert from 'node:assert/strict';
import {newSession,planRecoverMedical,stepSession} from '../src/breach-game.ts';
import {kitMedicalSupplies,medicalSupplyCount}
 from '../src/equipment-medical-supplies.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {equipmentRetrievalSeconds} from '../src/equipment-carry-placement.ts';
test('24.04 recovery costs access time at both physical inventory locations',()=>{
 const s=newSession(),a=s.operators.find(o=>o.id==='rook'),
  p=s.operators.find(o=>o.id==='moss');
 a.equipment=initialEquipmentLoadout('carbine');
 a.medicalSupplies=kitMedicalSupplies(a.equipment);
 a.medicalSupplies['tourniquet']=0;
 p.equipment=setEquipmentChoice(initialEquipmentLoadout('carbine'),'medical','medical-trauma');
 p.medicalSupplies=kitMedicalSupplies(p.equipment);
 p.health=0;p.injuryStage=3;p.p={x:a.p.x+14,y:a.p.y};
 const initial=medicalSupplyCount(a.medicalSupplies)+medicalSupplyCount(p.medicalSupplies);
 assert.equal(planRecoverMedical(s,a.id,p.id),true);
 const delay=1.35+equipmentRetrievalSeconds(a.equipment,a.spareMagazines,'medical')+
  equipmentRetrievalSeconds(p.equipment,p.spareMagazines,'medical');
 s.phase='running';
 for(let i=0;i<Math.floor(delay*30)-2;i++)stepSession(s,1/30);
 assert.equal(a.medicalSupplies['tourniquet'],0,'cannot obtain item before reaching kit');
 for(let i=0;i<90;i++)stepSession(s,1/30);
 assert.equal(a.medicalSupplies['tourniquet'],1);
 assert.equal(medicalSupplyCount(a.medicalSupplies)+medicalSupplyCount(p.medicalSupplies),initial);
 assert.equal(a.plan.length,0);
});
