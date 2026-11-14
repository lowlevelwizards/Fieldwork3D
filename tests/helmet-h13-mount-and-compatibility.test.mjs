import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
import {HELMET_MOUNT_PROFILES}
 from '../src/operator-helmet-attachment-frames.ts';
import {arcFrontAccessoryFrame} from '../src/operator-helmet-field-rails.ts';
import {helmetFieldCompatibilityIssues,resolveHelmetField}
 from '../src/operator-helmet-field-policy.ts';
import {readFileSync} from 'node:fs';

for(const shell of ['ach','mich-2001','mich-2002']){
 test('H13 '+shell+': coherent rail-backed hardware and bare shell clearance',()=>{
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const light=kit.modules.light.getObjectByName('helmet-addon-fitted-socket');
  const camera=kit.modules.camera.getObjectByName('helmet-addon-fitted-socket');
  for(const [name,socket,side] of [
   ['light',light,'left'],['camera',camera,'right']
  ]){
   assert.equal(socket?.userData.h13RailAttached,true,name);
   assert.equal(socket.userData.h13RailSide,side);
   assert.ok(socket.position.distanceTo(arcFrontAccessoryFrame(shell,side).position)<.0001);
  }
  const shroud=kit.modules.shroud.getObjectByName('shroud-covered-mount');
  const shroudFastener=shroud.getObjectByName('three-oversized-nvg-fasteners');
  assert.equal(shroudFastener.geometry.userData.h13FastenerStyle,'flat-hex');
  for(const rail of kit.modules.rails.children){
   const bolts=rail.children.filter(x=>x.name==='arc-rail-chinstrap-sharing-bolt');
   assert.equal(bolts.length,2);
   for(const bolt of bolts){
    assert.equal(bolt.children.length,1);
    assert.equal(bolt.children[0].geometry.userData.h13FastenerStyle,
     shroudFastener.geometry.userData.h13FastenerStyle);
   }
  }
  updateHelmetFieldLayers(kit,{rails:true,light:true,camera:true,
   cameraSide:'right',lightSide:'left'},0x586548,false);
  assert.equal(kit.modules.rails.children[0].position.x,.16);
  assert.equal(kit.modules.rails.children[1].position.x,-.16);
  assert.equal(kit.modules.light.position.x,.16);
  assert.equal(kit.modules.camera.position.x,-.16);
  updateHelmetFieldLayers(kit,{rails:true},0x586548,true);
  assert.equal(kit.modules.light.position.x,0);
  assert.equal(kit.modules.camera.position.x,0);
  for(const rail of kit.modules.rails.children)
   assert.equal(rail.position.x,0);
 });

 test('H13 '+shell+': upward stow and outside-rail wrap',()=>{
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const p=HELMET_MOUNT_PROFILES[shell];
  const front=kit.modules['goggles-front'];
  const pose=front.getObjectByName('approved-d2-goggle-pose');
  const sleeve=front.getObjectByName('goggle-fabric-sleeve');
  const assembly=front.children.find(x=>x.userData.h9HelmetGoggles);
  assert.ok(pose.rotation.x<-.18);
  assert.ok(pose.position.y>p.top-6.1);
  assert.ok(assembly.userData.h13OverRailAndShroud);
  assert.equal(sleeve.userData.h13SoftenedNoseNotch,true);
  assert.ok(sleeve.userData.h69SoftPouchDepth>=.95);
  for(const covered of [false,true]){
   const strap=assembly.userData.h5AdaptiveStrapPaths[covered?'covered':'bare'];
   const side=Math.max(...strap.map(v=>Math.abs(v[0])));
   const f=Math.min(...strap.map(v=>v[2]));
   assert.ok(side>p.side+.9);
   assert.ok(f<p.front-1.4);
   updateHelmetFieldLayers(kit,{goggles:'front',shroud:true},0x586548,covered);
   assert.ok(pose.position.z<p.front+3.5);
   assert.equal(sleeve.position.z,pose.position.z);
  }
  updateHelmetFieldLayers(kit,{goggles:'front',shroud:false},0x586548,true);
  assert.ok(Math.abs(pose.position.z-(p.front+3.72))<.0001);
 });
}

test('H13 compatibility: all mount requirements are visible without lost saved options',()=>{
 const raw={rails:false,shroud:false,bungees:true,light:true,camera:true,
  cameraSide:'left',lightSide:'left',strobe:true,chemlight:true,
  battery:true,counterweight:true,goggles:'rear',patches:true,velcro:false};
 const notes=helmetFieldCompatibilityIssues('ach',raw,false);
 for(const topic of ['Bungees require side rails','Bungees require the NVG shroud',
  'Helmet light requires side rails','Camera requires side rails',
  'opposite rail sides','top-rear chemlight','Rear-stowed goggles',
  'Battery and counterweight','Bare-shell patches'])
  assert.ok(notes.some(x=>x.includes(topic)),topic);
 const effective=resolveHelmetField('ach',raw,{covered:false});
 assert.equal(effective.camera,false);
 assert.equal(effective.bungees,false);
 assert.equal(effective.battery,false);
 assert.equal(raw.bungees,true);
 const studio=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 assert.ok(studio.includes('helmetFieldCompatibilityIssues('));
 assert.ok(studio.includes('helmet-option-requirement'));
 assert.ok(studio.includes('next.cameraSide='));
});
