import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {consolidateVisualGroup,OPERATOR_LIGHTING_MASK_KEYS}
 from '../src/operator-visual-mesh-merge.ts';
import {bakeGearGeometryAO,enableBakedGearAO}
 from '../src/operator-baked-gear-ao.ts';

test('R5.2-B lighting masks survive mixed-index mesh merging exactly',()=>{
 const material=new THREE.MeshStandardMaterial({color:0xffffff});
 enableBakedGearAO(material);
 const g=new THREE.Group();g.name='merged-contact-test';
 const first=new THREE.Mesh(new THREE.BoxGeometry(2,3,4),material);
 const second=new THREE.Mesh(new THREE.BoxGeometry(2,3,4).toNonIndexed(),material);
 first.position.x=1.3;second.position.x=-1.3;
 first.userData.fieldworkShadowPartId='one/body';
 second.userData.fieldworkShadowPartId='one/body';
 first.userData.fieldworkShadowRole='body';
 second.userData.fieldworkShadowRole='flap';
 for(const [i,part] of [first,second].entries()){
  bakeGearGeometryAO(part.geometry,material);
  part.geometry.userData.fieldworkContactAO=true;
  const n=part.geometry.getAttribute('position').count;
  part.geometry.userData.fieldworkSelfOcclusionMask=
   Uint8Array.from({length:n},(_,j)=>((i+1)*17+j*3)%256);
  part.geometry.userData.fieldworkExternalOcclusionMask=
   Uint8Array.from({length:n},(_,j)=>((i+1)*37+j*2)%256);
 }
 const a=first.geometry,ia=a.index;
 const aSelf=a.userData.fieldworkSelfOcclusionMask;
 const aExt=a.userData.fieldworkExternalOcclusionMask;
 const bSelf=second.geometry.userData.fieldworkSelfOcclusionMask;
 const bExt=second.geometry.userData.fieldworkExternalOcclusionMask;
 const expectedSelf=Uint8Array.from([
  ...Array.from({length:ia.count},(_,i)=>aSelf[ia.getX(i)]),
  ...bSelf
 ]);
 const expectedExternal=Uint8Array.from([
  ...Array.from({length:ia.count},(_,i)=>aExt[ia.getX(i)]),
  ...bExt
 ]);
 const before=new THREE.Box3().setFromObject(g);
 g.add(first,second); // bounds below reflect geometry only
 const actualBefore=new THREE.Box3().setFromObject(g);
 consolidateVisualGroup(g);
 assert.equal(g.children.length,1,'preserve a single rendering draw call');
 const combined=g.children[0].geometry;
 assert.equal(combined.index,null);
 assert.deepEqual(Array.from(combined.userData.fieldworkSelfOcclusionMask),
  Array.from(expectedSelf));
 assert.deepEqual(Array.from(combined.userData.fieldworkExternalOcclusionMask),
  Array.from(expectedExternal));
 assert.equal(combined.getAttribute('position').count,expectedSelf.length);
 assert.ok(combined.getAttribute('uv'),'camouflage UV retained');
 assert.ok(combined.getAttribute('color').normalized,'byte AO retained');
 const spans=combined.userData.fieldworkLightingPartSpans;
 assert.equal(spans.length,2);
 assert.equal(spans[0].partId,'one/body');
 assert.equal(spans[1].role,'flap');
 assert.equal(spans[0].start+spans[0].count,spans[1].start);
 assert.equal(spans[1].start+spans[1].count,expectedSelf.length);
 const after=new THREE.Box3().setFromObject(g);
 assert.ok(actualBefore.min.distanceTo(after.min)<1e-5);
 assert.ok(actualBefore.max.distanceTo(after.max)<1e-5);
 void before;
 combined.dispose();material.dispose();
});
test('R5.2-B no shadow masks means no unnecessary CPU buffers',()=>{
 const material=new THREE.MeshStandardMaterial(),group=new THREE.Group();
 group.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material),
  new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material));
 consolidateVisualGroup(group);
 const result=group.children[0].geometry;
 for(const name of OPERATOR_LIGHTING_MASK_KEYS)
  assert.equal(result.userData[name],undefined);
 assert.equal(result.userData.fieldworkLightingPartSpans.length,2);
 result.dispose();material.dispose();
});
