import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {weaponFitInTurnedChest,solveV3CoordinatedPose,V3_TORSO_YAWS,V3_TORSO_LEANS}
 from '../src/breach-pose-v3-coordinated.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const fit={origin:V(-1,2,5),rotation:new THREE.Euler(.11,.31,-.16,'XYZ'),
 stock:V(-7,2,7),primary:V(5,-1,8),support:V(11,-2,-6),
 twoHanded:true,primaryReachable:true,handling:'ready',
 contactError:0,stockError:0};
const clear={armor:'armor-bare',rig:'no-rig',top:'bdu-shirt',
 front:5,boxes:[]};
const config=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
test('V3 counterrotated weapon preserves exact world origin and orientation',()=>{
 const originalQ=new THREE.Quaternion().setFromEuler(fit.rotation);
 for(const yaw of V3_TORSO_YAWS)for(const lean of V3_TORSO_LEANS){
  const r=weaponFitInTurnedChest(fit,yaw,lean);
  const chassis=new THREE.Quaternion().setFromAxisAngle(V(0,1,0),yaw);
  const drift=V(lean,0,0);
  assert.ok(r.origin.clone().applyQuaternion(chassis).add(drift)
   .distanceTo(fit.origin)<1e-8);
  for(const key of ['stock','primary','support'])
   assert.ok(r[key].clone().applyQuaternion(chassis).add(drift)
    .distanceTo(fit[key])<1e-8,key+'/'+yaw+'/'+lean);
  const world=chassis.multiply(new THREE.Quaternion().setFromEuler(r.rotation));
  assert.ok(world.angleTo(originalQ)<1e-7,'world barrel orientation');
 }
});
test('V3 coupled clear pose retains true wrist contact and bounded yaw',()=>{
 const good={...fit,origin:V(0,0,0),rotation:new THREE.Euler(),
  stock:V(-7,0,6),primary:V(6,-3,7),support:V(8,-5,-7)};
 const result=solveV3CoordinatedPose({fit:good,weapon:'carbine',
  configuration:config,shoulders:[V(1,4,-7),V(1,4,7)],
  envelope:clear,mode:'carry'});
 assert.equal(result.status,'clear');
 assert.ok(result.arms);
 assert.ok(Math.abs(result.yaw)<=.16001);
 assert.ok(result.arms[0].effector.distanceTo(result.fit.support)<1e-5);
 assert.ok(result.arms[1].effector.distanceTo(result.fit.primary)<1e-5);
 assert.ok(result.candidates<=(V3_TORSO_YAWS.length+6)*3);
 assert.ok(result.leanX>=0&&result.leanX<=1.35001);
 const result2=solveV3CoordinatedPose({fit:good,weapon:'carbine',
  configuration:config,shoulders:[V(1,4,-7),V(1,4,7)],
  envelope:clear,mode:'carry'});
 assert.equal(result.yaw,result2.yaw);
});
test('V3 refuses rigid-blocked coordinated poses without changing weapon',()=>{
 const blocked={...clear,boxes:[{label:'torso',material:'rigid',
  min:{x:-40,y:-40,z:-40},max:{x:40,y:40,z:40}}]};
 const r=solveV3CoordinatedPose({fit,weapon:'carbine',
  configuration:config,shoulders:[V(1,4,-7),V(1,4,7)],
  envelope:blocked,mode:'aim'});
 assert.equal(r.status,'unresolved');assert.equal(r.fit,fit);
 assert.equal(r.arms,null);
});
