import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {reloadHandKey,reloadHandChestTarget}
 from '../src/breach-reload-motion.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
test('V3 reload anchors support hand to fitted grip at both endpoints',()=>{
 const fit={origin:V(2,1,-3),rotation:new THREE.Euler(0,.41,-.12),
  support:V(13,-6,-3),primary:V(8,-2,4),stock:V(-8,1,4),
  twoHanded:true,primaryReachable:true,handling:'low',
  contactError:0,stockError:0};
 const input={fit,lengthScale:1.12,mode:'emergency',
  supportX:6,supportY:-2,primaryX:1,
  magazineSocket:{x:1.8,y:-2.2}};
 for(const progress of [0,1]){
  const actual=reloadHandChestTarget({...input,progress});
  assert.ok(actual.distanceTo(fit.support)<1e-7,'support at '+progress);
 }
 const center=.4;
 const nominal=reloadHandKey(center,input.mode,input.supportX,input.supportY,
  input.primaryX,input.magazineSocket);
 const world=V(nominal.x*input.lengthScale,nominal.y,nominal.z)
  .applyEuler(fit.rotation).add(fit.origin);
 assert.ok(reloadHandChestTarget({...input,progress:center}).distanceTo(world)<1e-7,
  'do not warp the physical magazine socket in remove/exchange phase');
});
test('V3 reload begins without a support-wrist jump from coupled low ready',()=>{
 const config=selectWeaponFamilyPreset(
  initialWeaponConfiguration('carbine'),'ar-m4a1');
 const pose={x:0,z:0,heading:0,velocity:0,seconds:1,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,aimBlend:0,
  handlingOverride:'low',weaponConfiguration:config};
 const rig=createOperatorRig('reload-v3','blue',true);
 try{
  poseOperator(rig,pose,0);
  const before=rig.arms[0].hand.position.clone();
  poseOperator(rig,{...pose,seconds:1.01,reload:1.8,reloadDuration:1.8},.01);
  const after=rig.arms[0].hand.position;
  assert.ok(before.distanceTo(after)<.15,
   'support hand must start reload at the actual fitted grip');
 }finally{rig.dispose();}
});
