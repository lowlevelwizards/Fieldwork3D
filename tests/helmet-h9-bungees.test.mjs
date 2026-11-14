import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';

test('H9.4c: cords and hooks are paired and anchored to the intended surface',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const g=kit.modules.bungees, routes=g.userData.h9BungeeRoutes;
  assert.equal(g.userData.h9SurfaceMounted,true);
  assert.equal(g.userData.h9BungeeCordCount,2);
  assert.equal(g.userData.h9BungeeHooks,4);
  assert.equal(routes.length,2);
  // Production batches same-material cosmetic meshes and intentionally
  // discards per-object names. Inspect the assembled batches and the
  // pre-batch route/hook records instead of names of vanished children.
  assert.equal(g.userData.h12NoTubeGeometry,true);
  assert.equal(g.userData.h12ElbowBeyondShell,true);
  const cover=g.getObjectByName('bungee-cover-route');
  const bare=g.getObjectByName('bungee-bare-route');
  for(const group of [cover,bare]){
   const ribbons=[];
   group.traverse(o=>{
    if(o instanceof THREE.Mesh&&o.geometry.userData.h12FlatElastic)
     ribbons.push(o);
   });
   assert.equal(ribbons.length,2);
   for(const mesh of ribbons){
    assert.equal(mesh.geometry.userData.h12SegmentCount,4);
    assert.equal(mesh.geometry.getAttribute('position').count,24);
   }
  }
  assert.ok(g.userData.h9BungeeRoutes.every(x=>x.surfaceAnchors.length===2));
  for(const r of routes){
   assert.equal(r.path.length,5);
   assert.equal(r.segmentCount,4);
   assert.ok(r.path.every(p=>p.every(Number.isFinite)));
   assert.ok(Math.abs(r.first[0])>2,'rail end must be on the side');
   assert.ok(Math.abs(r.last[0])<3,'shroud end must approach front center');
   assert.ok(r.first[2]>r.last[2],'cord should connect rail to front shroud');
   assert.ok(Math.abs(r.path[2][0])>=Math.abs(r.path[0][0])-.001);
   assert.ok(r.cornerZ<r.first[2]);
   assert.equal(r.path[2][2],r.cornerZ);
   assert.equal(r.path[3][2],r.cornerZ);
  }
  updateHelmetFieldLayers(kit,{bungees:true,rails:true,shroud:true},0x586548,true);
  assert.equal(g.visible,true);
  updateHelmetFieldLayers(kit,{bungees:false},0x586548,true);
  assert.equal(g.visible,false);
 }
});
test('H9.4c: period PASGT does not display modern retention bungees',()=>{
 const kit=createHelmetFieldLayers(new THREE.Group(),'pasgt');
 assert.equal(kit.modules.bungees.children.length,0);
});
