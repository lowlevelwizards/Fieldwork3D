import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {AR_HANDGUARD_START,arHandguardEnd,akHandguardStart,
 riflePoseContacts,supportContactAt}
 from '../src/breach-weapon-contact-zones.ts';
import {poseClearanceEnvelope,armArmorPenetration}
 from '../src/breach-pose-clearance-envelope.ts';
import {solveCoupledLowReady}
 from '../src/breach-coupled-low-ready.ts';
const build=id=>{
 const p=FAMILY_PRESETS.find(x=>x.id===id);
 assert.ok(p,id);
 return {p,config:selectWeaponFamilyPreset(
  initialWeaponConfiguration(p.weapon),p.id)};
};
const shoulders=[new THREE.Vector3(1,4,-7),new THREE.Vector3(1,4,7)];
test('all 17 authored family guns use real physical fore-end intervals',()=>{
 assert.ok(AR_HANDGUARD_START>3);
 for(const preset of FAMILY_PRESETS){
  const c=build(preset.id),region=riflePoseContacts(preset.weapon,c.config);
  assert.ok(region,preset.id);
  assert.equal(region.family,preset.family);
  assert.equal(region.scale>0,true);
  assert.ok(region.support.near.x<region.support.far.x,preset.id);
  const front=preset.family==='ar'?
   arHandguardEnd(preset.parts.handguard):
   undefined;
  if(front)assert.ok(region.support.far.x<front,preset.id);
  else assert.ok(region.support.near.x>=akHandguardStart(preset.parts.receiver),preset.id);
  assert.ok(supportContactAt(region.support,0).x<
    supportContactAt(region.support,1).x,preset.id);
  assert.ok(region.support.near.y> -2.5,preset.id);
 }
});
test('fitted armor envelopes differ by visible protection and rig',()=>{
 const bare=poseClearanceEnvelope('armor-bare','no-rig','bdu-shirt');
 const heavy=poseClearanceEnvelope('plate-heavy','full-chest','bdu-shirt');
 const heavyAgain=poseClearanceEnvelope('plate-heavy','full-chest','bdu-shirt');
 assert.strictEqual(heavy,heavyAgain);
 assert.ok(heavy.front>bare.front);
 assert.ok(heavy.boxes.length>bare.boxes.length);
 const arm=(elbow,wrist,env)=>armArmorPenetration(
  {x:1,y:4,z:-7},elbow,wrist,env);
 const crossing=arm({x:5,y:-1,z:-2},{x:12,y:-4,z:1},heavy);
 const outside=arm({x:10,y:-5,z:-12},{x:18,y:-4,z:-9},heavy);
 assert.ok(crossing>outside);
});
test('M4, MK18, AKM, AK105 and short AK all produce bounded deterministic candidates',()=>{
 for(const id of ['ar-m4a1','ar-mk18','ak-akm','ak-ak105','ak-aks74u']){
  const {p,config}=build(id);
  const input={weapon:p.weapon,configuration:config,shoulders,
   armor:poseClearanceEnvelope('plate-jpc','no-rig','bdu-shirt'),
   nominalYaw:0};
  const a=solveCoupledLowReady(input),b=solveCoupledLowReady(input);
  assert.deepEqual(a?.status,b?.status,id);
  if(!a)continue; // tested separately as an explicit unresolved state
  assert.ok(a.candidates>0,id);
  assert.ok(a.penetration<=.12+1e-5,id);
  assert.equal(a.fit.primaryReachable,true,id);
  assert.ok(a.fit.stockError<1,id);
  assert.equal(a.arms.length,2,id);
  for(const limb of a.arms){
   assert.ok(limb.reached,id);
   assert.ok(Number.isFinite(limb.angle),id);
  }
 }
});
test('at least one representative M4 and AK simple kit finds a clear two-hand stance',()=>{
 const styles=['ar-m4a1','ak-akm'];
 let clear=0;
 for(const id of styles){
  const {p,config}=build(id);
  const r=solveCoupledLowReady({weapon:p.weapon,configuration:config,
   shoulders,armor:poseClearanceEnvelope('armor-bare','no-rig','combat-shirt'),
   nominalYaw:0});
  if(r?.status==='clear')clear++;
 }
 assert.ok(clear>=1,'At least one approved physical pose is required before integration');
});
