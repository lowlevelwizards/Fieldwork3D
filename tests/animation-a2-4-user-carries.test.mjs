import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AUTHORED_READY_CARRIES} from '../src/breach-authored-ready-carries.ts';
import {liveReadyCarryPose,liveShortStockPose,fitWeaponPose,weaponGrips}
 from '../src/breach-weapon-pose.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const m4=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const cases=FAMILY_PRESETS.map(p=>({
 name:p.id,weapon:p.weapon,
 cfg:selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),p.id)
})).concat(['carbine','rifle','smg','shotgun'].map(weapon=>({
 name:'classic-'+weapon,weapon,cfg:undefined
})));
const close=(a,b,eps=.00001)=>assert.ok(Math.abs(a-b)<=eps,
 a+' vs '+b);
const vec=(a,b,eps=.00001)=>a.forEach((x,i)=>close(x,b[i],eps));

test('user M4A1 exports are literal reference targets and stock/rotation',()=>{
 const high=AUTHORED_READY_CARRIES.high,low=AUTHORED_READY_CARRIES.low;
 assert.equal(high.version,1);assert.equal(low.version,1);
 assert.deepEqual(high.weaponRotation,[10,20,48]);
 assert.deepEqual(low.weaponRotation,[0,29,-26]);
 vec(high.targets.stock,[3.9,-2.3,6.6]);
 vec(low.targets.stock,[3.45,4.45,4.8]);
 assert.deepEqual(high.targets.supportHand,
  [14.7,9.8,2.8725966357508064]);
 assert.deepEqual(low.targets.supportElbow,
  [10.462739837509194,-8.3,-10]);
 for(const mode of ['high','low']){
  assert.equal(liveReadyCarryPose(mode,'carbine',m4),
   AUTHORED_READY_CARRIES[mode]);
  const fit=fitWeaponPose({weapon:'carbine',configuration:m4,
   handling:mode,yaw:0,recoil:0});
  vec(fit.stock.toArray(),AUTHORED_READY_CARRIES[mode].targets.stock);
  const deg=fit.rotation.toArray().slice(0,3).map(THREE.MathUtils.radToDeg);
  vec(deg,AUTHORED_READY_CARRIES[mode].weaponRotation,1e-6);
 }
});

test('all modular and classic weapons reuse cached grip-aware targets',()=>{
 assert.ok(cases.length>=34);
 for(const {name,weapon,cfg} of cases)for(const mode of ['high','low']){
  const p=liveReadyCarryPose(mode,weapon,cfg);
  assert.strictEqual(p,liveReadyCarryPose(mode,weapon,cfg),
   'cache not re-used '+name);
  const f=fitWeaponPose({weapon,configuration:cfg,handling:mode,
   yaw:0,recoil:0});
  const g=weaponGrips(weapon,cfg,'ready');
  const stock=new THREE.Vector3(g.stockX*g.lengthScale,0,0)
   .applyEuler(f.rotation).add(f.origin);
  assert.ok(f.stock.distanceTo(stock)<.00001,name+' '+mode);
  assert.ok([f.primary,f.support,f.stock].every(pt=>
   pt.toArray().every(Number.isFinite)),name+' '+mode);
  assert.ok(p.targets.supportHand.every(Number.isFinite));
  assert.ok(p.targets.firingHand.every(Number.isFinite));
  assert.ok(f.stockError<1e-5,name+' '+mode);
 }
});
test('high/low central muzzle matches rigid displayed stock and rotations',()=>{
 for(const {name,weapon,cfg} of cases){
  for(const mode of ['high','low']){
   const f=fitWeaponPose({weapon,configuration:cfg,handling:mode,
    yaw:0,recoil:0});
   const aim=mode==='high'?0:0;
   // Shot-time carry selection chooses low under movement; for high, an
   // explicit fire-neutral override ensures identical render/ballistic fit.
   const actual=muzzleAtShot({x:0,z:0,heading:0,weaponYaw:0,
    weapon,weaponConfiguration:cfg,aim,velocity:0,recoil:0,
    carryOverride:mode});
   const grip=weaponGrips(weapon,cfg,'ready');
   const assembly=cfg?
    resolveWeaponAssembly(cfg):null;
   const tip=new THREE.Vector3((assembly?.muzzleX??19.5)*grip.lengthScale,
    assembly?.muzzleY??0,0).applyEuler(f.rotation).add(f.origin);
   close(actual.x,tip.x,1e-6);
   close(actual.z,tip.z,1e-6);
   assert.ok(Number.isFinite(actual.pitch),name+' '+mode);
  }
 }
});
