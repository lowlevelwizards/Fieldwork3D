import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';

test('H9.4b: ACH-ARC rails span both cover sides with real shape and two mounts',()=>{
 for(const id of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),id);
  assert.equal(kit.modules.rails.children.length,2);
  for(const side of ['left','right']){
   const g=kit.modules.rails.children.find(x=>x.name==='h9-ach-arc-'+side);
   assert.ok(g,'missing '+id+' '+side+' surface rail');
   assert.equal(g.userData.h9ArcFamily,'ACH-ARC');
   assert.equal(g.userData.h12TallRearArc,true);
   assert.equal(g.userData.h9ArcScrews,2);
   assert.equal(g.userData.h9ArcSlots,6);
   assert.equal(g.userData.h9SurfaceFitted,true);
   assert.equal(g.userData.h9ArcStationPositions.length,7);
   assert.equal(g.children.filter(x=>x.name==='arc-rail-chinstrap-sharing-bolt').length,2);
   const positions=g.userData.h9ArcStationPositions;
   for(const p of positions){
    assert.equal(Math.sign(p[0]),side==='left'?-1:1);
    assert.ok(p.every(Number.isFinite));
   }
   // MICH high-cut fabric has abrupt hem transitions, but manufactured
   // ACH-ARC connectors must not dive into that cut as a zigzag.
   for(let i=1;i<positions.length;i++)
    assert.ok(Math.abs(positions[i][1]-positions[i-1][1])<.75,
     id+' '+side+' rail changes height abruptly at station '+i);
   assert.ok(positions.at(-1)[1]<positions[2][1]-.30,
    id+' '+side+' missing downward rear ear return');
   const box=new THREE.Box3().setFromObject(g),size=new THREE.Vector3();
   box.getSize(size);
   assert.ok(size.z>5.5,id+' '+side+' rail too short to read');
   assert.ok(size.y>1.55,id+' '+side+' lacks exaggerated rear curve');
   assert.ok(g.children.some(x=>x.name==='curved-full-length-ach-arc-track'));
  }
  updateHelmetFieldLayers(kit,{rails:true},0x5c695c,true);
  assert.equal(kit.modules.rails.visible,true);
 }
});

test('H9.4b: historical PASGT still has no modern accessory rail',()=>{
 const kit=createHelmetFieldLayers(new THREE.Group(),'pasgt');
 assert.equal(kit.modules.rails.children.length,0);
 updateHelmetFieldLayers(kit,{rails:true},0x5c695c,true);
 assert.equal(kit.modules.rails.visible,false);
});
