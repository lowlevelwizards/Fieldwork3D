import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {inspectOperatorLighting,formatOperatorLightingReport}
 from '../src/operator-lighting-inspector.ts';

test('R5.6-A inspector counts CPU masks without mutating geometry',()=>{
 const root=new THREE.Group(),material=new THREE.MeshBasicMaterial();
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),material);
 const g=mesh.geometry,count=g.getAttribute('position').count;
 const self=new Uint8Array(count);self[0]=90;self[2]=120;
 const contact=new Uint8Array(count);contact[1]=255;
 g.userData.fieldworkSelfOcclusionMask=self;
 g.userData.fieldworkInterContactMask=contact;
 g.userData.fieldworkLightingPartSpans=[
  {partId:'pouch/body',role:'body',start:0,count:12},
  {partId:'pouch/flap',role:'flap',start:12,count:count-12}
 ];
 root.add(mesh);
 const original=Array.from(g.getAttribute('position').array);
 const s=inspectOperatorLighting(root);
 assert.equal(s.meshes,1);
 assert.equal(s.uniqueGeometries,1);
 assert.equal(s.logicalParts,2);
 assert.equal(s.channels.self.shadowed,2);
 assert.equal(s.channels.self.max,120);
 assert.equal(s.channels.contact.max,255);
 assert.equal(s.channels.directional.samples,0);
 assert.equal(s.maskBytes,count*2);
 assert.deepEqual(Array.from(g.getAttribute('position').array),original);
 assert.match(formatOperatorLightingReport(s),/Logical parts: 2/);
 assert.match(formatOperatorLightingReport(s),/contact/);
 g.dispose();material.dispose();
});
test('R5.6-A inspector skips hidden kit variants and shared geometry duplication',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(1,1,1);
 const material=new THREE.MeshBasicMaterial();
 geometry.userData.fieldworkExternalOcclusionMask=
  new Uint8Array(geometry.getAttribute('position').count).fill(18);
 root.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material));
 const hidden=new THREE.Group();hidden.visible=false;
 hidden.add(new THREE.Mesh(new THREE.BoxGeometry(20,20,20),material));
 root.add(hidden);
 const report=inspectOperatorLighting(root);
 assert.equal(report.meshes,2);
 assert.equal(report.uniqueGeometries,1);
 assert.equal(report.channels.external.shadowed,
  geometry.getAttribute('position').count);
 assert.equal(inspectOperatorLighting(null).meshes,0);
 geometry.dispose();material.dispose();
});
