import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {poseClearanceEnvelope,poseArmholeSideCeiling}
 from '../src/breach-pose-clearance-envelope.ts';
import {ARMOR_PROPORTIONS} from '../src/operator-armor-proportions.ts';
import {LOW_READY_ANATOMY,assessLowReadyArm}
 from '../src/breach-low-ready-anatomy.ts';
import {reloadVisualContact} from '../src/breach-reload-visual-contact.ts';
import {solveCoupledLowReady} from '../src/breach-coupled-low-ready.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
test('flak and legacy share heavy carrier underarm corridor, not rendered silhouette',()=>{
 const heavy=poseClearanceEnvelope('plate-heavy','no-rig','bdu-shirt');
 const ceiling=ARMOR_PROPORTIONS['plate-heavy'].sideY+
  ARMOR_PROPORTIONS['plate-heavy'].sideHeight*.5+.08;
 assert.equal(poseArmholeSideCeiling('soft-flak'),ceiling);
 assert.equal(poseArmholeSideCeiling('plate-legacy'),ceiling);
 assert.equal(poseArmholeSideCeiling('plate-heavy'),null);
 const high=(env)=>env.boxes.filter(b=>b.region?.startsWith('side-')&&
  b.region!=='side-insert');
 for(const armor of ['soft-flak','plate-legacy']){
  const env=poseClearanceEnvelope(armor,'no-rig','bdu-shirt');
  assert.ok(high(env).length>=6);
  assert.ok(high(env).every(b=>b.max.y<=ceiling+1e-6),
   armor+' must NOT contain a shoulder-height soft armhole wall');
  assert.ok(high(env).every(b=>b.min.y<ceiling-3),
   armor+' still wraps lower ribs and waist');
  assert.ok(env.boxes.some(b=>b.region==='front-taper'&&
   b.max.y>ceiling+3),'visible high chest preserved');
  assert.equal(env.boxes.filter(b=>b.region==='side-insert').length,0,
   armor+' must not gain fictional hard side plates');
  assert.deepEqual(env.boxes.filter(b=>b.label==='torso'),
   heavy.boxes.filter(b=>b.label==='torso'));
 }
 assert.equal(heavy.boxes.filter(b=>b.region==='side-insert').length,2,
  'real heavy side inserts remain rigid');
 assert.ok(high(heavy).every(b=>b.max.y<=ceiling+1e-6));
});
const fake=(region,material,upper,lower)=>({
 valid:false,hardDepth:material==='rigid'?Math.max(upper,lower):0,
 softDepth:material!=='rigid'?Math.max(upper,lower):0,quality:1,
 contacts:[{label:'front-armor',region,material,upperDepth:upper,
  lowerDepth:lower,upperAllowed:.12,lowerAllowed:.12,
  upperExcess:upper-.12,lowerExcess:lower-.12,
  allowed:.12,depth:Math.max(upper,lower),blocking:true}]
});
test('firing sleeve has small extra plate-edge allowance, never torso permission',()=>{
 const plate=fake('front-insert','rigid',2.00,1.00);
 assert.equal(reloadVisualContact(plate,true,'carry','firing').valid,true);
 assert.equal(reloadVisualContact(plate,true,'carry','support').valid,false);
 assert.equal(reloadVisualContact(plate,false,'carry','firing').valid,false,
  'strict audit remains strict');
 assert.equal(reloadVisualContact(fake('front-insert','rigid',2.50,.5),
  true,'carry','firing').valid,false,'not unbounded plate intersection');
 assert.equal(reloadVisualContact(fake('torso-core','rigid',.80,.4),
  true,'carry','firing').valid,false,'not a torso exemption');
 assert.equal(reloadVisualContact(fake('side-insert','rigid',1.88,.9),
  true,'aim','firing').valid,true);
 assert.equal(reloadVisualContact(fake('side-insert','rigid',1.88,.9),
  true,'aim','support').valid,false);
 assert.equal(reloadVisualContact(fake('side-insert','rigid',2.45,.3),
  true,'aim','firing').valid,false,
  'hard side plate still has an explicit upper bound');
});
test('firing-side scoring favors lower, closer elbow without length changes',()=>{
 assert.equal(LOW_READY_ANATOMY.upperLength,10);
 assert.equal(LOW_READY_ANATOMY.lowerLength,10);
 const shoulder=V(1,4,7),wrist=V(8,-2,5);
 const tucked=assessLowReadyArm(shoulder,V(4,-3,7.5),wrist,1,1.1);
 const winged=assessLowReadyArm(shoulder,V(4,0,11),wrist,1,1.1);
 assert.equal(tucked.valid,true);assert.equal(winged.valid,true);
 assert.ok(tucked.score<winged.score);
 assert.ok(LOW_READY_ANATOMY.preferredFiringDrop>
  LOW_READY_ANATOMY.preferredSupportDrop);
});
test('representative legacy, flak, heavy low-ready solves are measured',()=>{
 const shoulders=[V(1,4,-7),V(1,4,7)];
 const out=[];
 for(const [id,armor] of [
  ['ar-m16a1','plate-legacy'],['ar-m16a1','soft-flak'],
  ['ar-m16a1','plate-heavy'],['ak-aks74u','soft-flak'],
  ['ar-mk18','plate-heavy']
 ]){
  const p=FAMILY_PRESETS.find(x=>x.id===id);assert.ok(p);
  const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
  const r=solveCoupledLowReady({weapon:p.weapon,configuration:cfg,
   shoulders,armor:poseClearanceEnvelope(armor,'no-rig','bdu-shirt'),
   nominalYaw:0,allowVisualOverlap:true,
   onDiagnostics:stats=>{
    if(armor==='plate-heavy'&&id==='ar-m16a1')
     console.log('M16-HEAVY-REJECTIONS',JSON.stringify(stats));
   }});
  const elbow=r?.arms[1].joint;
  const flare=elbow?(elbow.z-shoulders[1].z):null;
  const drop=elbow?(shoulders[1].y-elbow.y):null;
  out.push({id,armor,status:r?.status??'unresolved',
   firingDrop:drop===null?null:Number(drop.toFixed(2)),
   firingFlare:flare===null?null:Number(flare.toFixed(2)),
   rigid:r?.penetration??null});
  if(r){
   assert.ok(r.arms.every(a=>a.reached),id+' arm reach');
   assert.ok(r.arms.every(a=>
    a.joint.distanceTo(a.effector)<=10.15),id+' arm length');
   assert.ok(flare<=LOW_READY_ANATOMY.maximumFlare+1e-5);
  }
 }
 console.log('ARMHOLE-FIRING-ELBOW-AUDIT',JSON.stringify(out));
 const p=FAMILY_PRESETS.find(x=>x.id==='ar-m16a1');
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),p.id);
 const variants=[];
 for(const yaw of [-.20,-.10,0,.10,.20]){
  const r=solveCoupledLowReady({weapon:p.weapon,configuration:cfg,
   shoulders,armor:poseClearanceEnvelope('plate-heavy','no-rig','bdu-shirt'),
   nominalYaw:yaw,allowVisualOverlap:true});
  variants.push({yaw,status:r?.status??'unresolved',
   drop:r?Number((shoulders[1].y-r.arms[1].joint.y).toFixed(2)):null,
   flare:r?Number((r.arms[1].joint.z-shoulders[1].z).toFixed(2)):null,
   stockError:r?.fit.stockError??null});
 }
 console.log('M16-HEAVY-YAW-AUDITION',JSON.stringify(variants));
 assert.equal(out.length,5);
});
