import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
import {sampleHelmetCover} from '../src/operator-helmet-surface.ts';

test('H9.4a: ACH/MICH shrouds are sized, three-hole, winged, and fitted to actual fabric',()=>{
 for(const id of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),id);
  const anchor=kit.modules.shroud.children.find(x=>x.userData.h9ShroudScrews===3);
  assert.ok(anchor,id+' missing actual three-hole shroud');
  assert.equal(anchor.userData.h9ShroudProfile,'three-hole-winged-nvg');
  assert.equal(anchor.userData.h9UsesCoverFrame,true);
  const frame=sampleHelmetCover(id,'front',0,.26,.16);
  assert.ok(frame&&anchor.position.distanceTo(frame.position)<1e-4);
  assert.equal(anchor.children.filter(x=>x.name==='nvgs-mount-screw').length,3);
  const plate=anchor.children.find(x=>x.name==='three-hole-shroud-open-wings');
  assert.ok(plate,'model must include wing openings and real thickness');
  assert.equal(plate.geometry.parameters.shapes.holes.length,2);
  const receiver=anchor.children.find(x=>x.name==='raised-nvg-receiver-cradle');
  const socket=anchor.children.find(x=>x.name==='nvg-receiver-locking-slot');
  assert.ok(receiver&&socket);
  assert.ok(receiver.position.z>plate.position.z);
  assert.ok(socket.position.z>receiver.position.z);
  const box=new THREE.Box3().setFromObject(anchor),size=new THREE.Vector3();
  box.getSize(size);
  assert.ok(size.x>3.3&&size.y>1.7,'shroud should read at gameplay size');
  assert.ok(anchor.children.every(c=>!c.castShadow));
  updateHelmetFieldLayers(kit,{shroud:true},0x65705d,true);
  assert.equal(kit.modules.shroud.visible,true);
 }
});

test('H9.4a: PASGT remains a distinct period bracket',()=>{
 const kit=createHelmetFieldLayers(new THREE.Group(),'pasgt');
 assert.equal(kit.modules.shroud.children.some(x=>x.userData.h9ShroudScrews===3),false);
 assert.ok(kit.modules.shroud.children.some(x=>x.name.includes('pasgt-period-bracket')));
});
