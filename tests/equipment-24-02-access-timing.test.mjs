import test from 'node:test';import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {equipmentRetrievalSeconds,carriedItemPlacement}
 from '../src/equipment-carry-placement.ts';
import {newSession,planMedicalTreatment,stepSession} from '../src/breach-game.ts';
import {registerWound} from '../src/breach-medical-wounds.ts';
import {kitMedicalSupplies} from '../src/equipment-medical-supplies.ts';
import {treatmentDuration} from '../src/breach-medical-treatment.ts';
test('24.02 medical treatment and tool access come from actual carry locations',()=>{
 let basic=initialEquipmentLoadout('carbine');
 let trauma=setEquipmentChoice(basic,'medical','medical-trauma');
 const base=equipmentRetrievalSeconds(basic,[],'medical');
 const packed=equipmentRetrievalSeconds(trauma,[],'medical');
 assert.ok(packed>base);
 assert.equal(carriedItemPlacement(trauma,[], 'medical').location,'backpack');
 assert.equal(equipmentRetrievalSeconds(
  setEquipmentChoice(basic,'medical','medical-none'),[],'medical'),Infinity);
 let pry=setEquipmentChoice(basic,'utility','utility-pry');
 const tool=equipmentRetrievalSeconds(pry,[],'utility');
 assert.ok(Number.isFinite(tool)&&tool>=0);
 const empty=setEquipmentChoice(pry,'utility','utility-none');
 assert.equal(equipmentRetrievalSeconds(empty,[],'utility'),Infinity);
});
test('24.02 medical action cannot finish before required physical access time',()=>{
 const s=newSession(),a=s.operators.find(o=>o.id==='rook'),p=s.operators.find(o=>o.id==='moss');
 p.p={x:a.p.x+15,y:a.p.y};
 a.equipment=setEquipmentChoice(initialEquipmentLoadout('carbine'),
  'medical','medical-trauma');
 a.medicalSupplies=kitMedicalSupplies(a.equipment);
 registerWound(p.medical,9,'torso',2,0);
 assert.equal(planMedicalTreatment(s,'rook','moss'),true);
 const access=equipmentRetrievalSeconds(a.equipment,a.spareMagazines,'medical');
 assert.ok(access>=.8);
 s.phase='running';
 let ticks=0;
 for(;ticks<Math.floor((treatmentDuration('trauma-dressing')+access)*30)-2;ticks++)
  stepSession(s,1/30);
 assert.equal(p.medical.wounds[0].stabilized,false);
 for(;ticks<200;ticks++)stepSession(s,1/30);
 assert.equal(p.medical.wounds[0].stabilized,true);
 assert.equal(a.medicalSupplies['trauma-dressing'],1);
});
