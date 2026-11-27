import test from 'node:test';import assert from 'node:assert/strict';
import {carrierTransportPresentation} from '../src/breach-capture-transport-presentation.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
test('SR15 reciprocal transport alone provides a presentation hint',()=>{
 const c={id:'c',health:1,carryingId:'p'},p={id:'p',carriedById:'c',transportMode:'carry',p:{x:1,y:2}};
 assert.deepEqual(carrierTransportPresentation(c,p),{mode:'carry',target:p.p});
 assert.equal(carrierTransportPresentation(c,{...p,carriedById:'other'}),undefined);
 assert.equal(carrierTransportPresentation({...c,health:0},p),undefined);
});
test('SR15 carried retained primary stays in body presentation; world release still hides it',()=>{
 const r=createOperatorRig('sr15','blue');
 try{
  const config=setWeaponAttachment(initialWeaponConfiguration('carbine'),'sling','sling-two-point');
  const p={x:0,z:0,heading:0,velocity:0,seconds:2,stride:0,posture:'stand',injury:3,weapon:'carbine',reload:0,reloadDuration:1,lastThrowAt:-100,lastDoorAt:-100,down:true,downProgress:1,surrender:false,aiming:false,firing:false,turning:0,weaponConfiguration:config,deterministic:true,transportedMode:'carry'};
  poseOperator(r,p,0);
  assert.ok(r.droppedGun.visible);assert.ok(r.slingStraps[0].visible);
  assert.ok(r.droppedGun.position.toArray().every(Number.isFinite));
  poseOperator(r,{...p,worldWeaponReleased:true},0);
  assert.ok(!r.droppedGun.visible&&!r.slingStraps[0].visible);
 }finally{r.dispose();}
});
