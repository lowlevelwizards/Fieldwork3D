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
  assert.equal(anchor.userData.h9ShroudProfile,'graphic-block-wing-lug');
  assert.equal(anchor.userData.h11IconicShroud,true);
  assert.equal(anchor.userData.h11NoWingPerforations,true);
  assert.ok(anchor.userData.h11TriangleCount<=110,
   'shroud geometry must stay lean for gameplay');
  assert.equal(anchor.userData.h9UsesCoverFrame,true);
  const frame=sampleHelmetCover(id,'front',0,.26,.16);
  // H10 oversizes the shroud and offsets its physical backing out of
  // the fitted cloth; do not demand a flush H9 center point.
  assert.ok(frame&&anchor.position.distanceTo(
   frame.position.clone().addScaledVector(frame.normal,.14))<1e-4);
  assert.equal(anchor.children.length,4,
   'one plate, one center block, one socket, one batched fastener mesh');
  const screws=anchor.children.find(x=>x.name==='three-oversized-nvg-fasteners');
  assert.equal(screws?.userData.h11FastenerCount,3);
  assert.equal(screws?.geometry.userData.h11FastenerIslands,3);
  const plate=anchor.children.find(x=>x.name==='iconic-three-hole-shroud-plate');
  assert.ok(plate,'shroud must include broad wings, base and upper lug');
  assert.equal(plate.geometry.parameters.shapes.holes.length,0);
  assert.equal(plate.geometry.parameters.options.bevelEnabled,false);
  const receiver=anchor.children.find(x=>x.name==='single-block-nvg-receiver');
  const socket=anchor.children.find(x=>x.name==='single-oversized-nvg-socket');
  assert.ok(receiver&&socket);
  const receiverFace=receiver.position.z+
   receiver.geometry.parameters.depth/2;
  assert.ok(socket.position.z>receiverFace,'opening must remain clearly visible');
  assert.equal(socket.geometry.getAttribute('position').count,4,
   'socket should be a single cheap rectangular face');
  const box=new THREE.Box3().setFromObject(anchor),size=new THREE.Vector3();
  box.getSize(size);
  assert.ok(size.x>4.9&&size.y>2.9,
   'shroud should be exaggerated enough to read at gameplay distance');
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
