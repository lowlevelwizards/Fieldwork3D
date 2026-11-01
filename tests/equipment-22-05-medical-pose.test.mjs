import test from 'node:test';import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {newSession,planMedicalTreatment,stepSession} from '../src/breach-game.ts';
import {kitMedicalSupplies} from '../src/equipment-medical-supplies.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {registerWound} from '../src/breach-medical-wounds.ts';
import {snapshot} from '../src/breach-replay.ts';
const pose=(rest={})=>({x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,...rest});
test('22.05 actual operator rig shows medical supply and reaches patient during action',()=>{
 const r=createOperatorRig('rook','blue');
 poseOperator(r,pose({treatmentActive:true,treatmentProgress:.6,
  treatmentPoint:{x:12,y:0}}),0);
 assert.equal(r.medicalItem.visible,true);
 assert.ok(Number.isFinite(r.medicalItem.position.x));
 assert.ok(Number.isFinite(r.medicalItem.position.y));
 assert.ok(r.gripError>=0);
 poseOperator(r,pose({seconds:4,treatmentActive:false}),0);
 assert.equal(r.medicalItem.visible,false);
 r.dispose();
});
test('22.05 mission treatment displays a replayed medical cue only during work',()=>{
 const s=newSession(),a=s.operators.find(o=>o.id==='rook'),
  p=s.operators.find(o=>o.id==='moss');
 p.p={x:a.p.x+13,y:a.p.y};
 a.medicalSupplies=kitMedicalSupplies(initialEquipmentLoadout('carbine'));
 registerWound(p.medical,22,'leg',2,0);
 assert.equal(planMedicalTreatment(s,'rook','moss'),true);
 s.phase='running';
 for(let i=0;i<18;i++)stepSession(s,1/30);
 assert.equal(a.treatmentActive,true);
 assert.equal(snapshot(s).actors.find(x=>x.id==='rook').treatmentActive,true);
 a.plan=[];stepSession(s,1/30);
 assert.equal(a.treatmentActive,false);
});
