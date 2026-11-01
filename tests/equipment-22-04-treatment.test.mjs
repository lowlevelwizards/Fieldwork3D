import test from 'node:test';import assert from 'node:assert/strict';
import {newSession,planMedicalTreatment,stepSession} from '../src/breach-game.ts';
import {kitMedicalSupplies} from '../src/equipment-medical-supplies.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {registerWound} from '../src/breach-medical-wounds.ts';
import {treatmentSupplyForWound,treatmentDuration}
 from '../src/breach-medical-treatment.ts';
test('22.04 compatible supply selection is based on region and severity',()=>{
 const s=newSession(),patient=s.operators.find(o=>o.id==='moss');
 registerWound(patient.medical,10,'torso',2,0);
 const w=patient.medical.wounds[0];
 const basic=kitMedicalSupplies(initialEquipmentLoadout('carbine'));
 assert.equal(treatmentSupplyForWound(w,basic),null);
 assert.equal(treatmentSupplyForWound({...w,region:'leg'},basic),'tourniquet');
 assert.ok(treatmentDuration('tourniquet')>2);
});
test('22.04 treatment stabilizes a leg wound with exactly one consumed item',()=>{
 const s=newSession(),a=s.operators.find(o=>o.id==='rook'),patient=s.operators.find(o=>o.id==='moss');
 patient.p={x:a.p.x+14,y:a.p.y};
 a.equipment=initialEquipmentLoadout('carbine');
 a.medicalSupplies=kitMedicalSupplies(a.equipment);
 registerWound(patient.medical,12,'leg',2,0);
 assert.equal(planMedicalTreatment(s,'rook','moss'),true);
 s.phase='running';
 for(let i=0;i<130;i++)stepSession(s,1/30);
 assert.equal(patient.medical.wounds[0].stabilized,true);
 assert.equal(a.medicalSupplies['tourniquet'],0);
 assert.equal(a.plan.length,0);
});
test('22.04 interrupted treatment and no kit cannot spend stock',()=>{
 const s=newSession(),a=s.operators.find(o=>o.id==='rook'),patient=s.operators.find(o=>o.id==='moss');
 patient.p={x:a.p.x+14,y:a.p.y};
 registerWound(patient.medical,15,'arm',2,0);
 assert.equal(planMedicalTreatment(s,'rook','moss'),false);
 a.medicalSupplies=kitMedicalSupplies(initialEquipmentLoadout('carbine'));
 assert.equal(planMedicalTreatment(s,'rook','moss'),true);
 s.phase='running';for(let i=0;i<20;i++)stepSession(s,1/30);
 a.plan=[];a.actionTimer=0;
 assert.equal(patient.medical.wounds[0].stabilized,false);
 assert.equal(a.medicalSupplies['tourniquet'],1);
});
