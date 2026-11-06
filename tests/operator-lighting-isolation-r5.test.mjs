import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {isolateStudioSelfShadow,restoreStudioSelfShadow,
 canIsolateSelfShadow} from '../src/operator-gear-lightmap-atlas.ts';
import {GEAR_CONTACT_AO_FLOOR} from '../src/operator-baked-gear-ao.ts';

const fixture=()=>{
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,0, 1,0,0, 2,0,0, 3,0,0
 ],3));
 const base=Uint8Array.from([240,240,230,200]);
 const self=Uint8Array.from([110,110,0,150]);
 const external=Uint8Array.from([0,140,90,0]);
 const composed=Uint8Array.from(base,(b,i)=>
  Math.round(255*Math.max(GEAR_CONTACT_AO_FLOOR,
   b/255*(1-Math.max(self[i],external[i])/255))));
 const factor=.90; // mimic global height and other material shading
 g.setAttribute('color',new THREE.Uint8BufferAttribute(
  Uint8Array.from(composed.flatMap(v=>{
   const byte=Math.round(v*factor);return [byte,byte,byte];
  })),3,true));
 g.userData.fieldworkSelfOcclusionMask=self;
 g.userData.fieldworkExternalOcclusionMask=external;
 g.userData.fieldworkContactBaseTone=base;
 g.userData.fieldworkContactComposedTone=composed;
 return g;
};
test('R5.2-E atlas correction replaces own shadow only, keeps external',()=>{
 const g=fixture(),color=g.getAttribute('color');
 const before=Array.from(color.array);
 assert.ok(canIsolateSelfShadow(g));
 assert.equal(isolateStudioSelfShadow(g),2);
 const after=Array.from(color.array);
 assert.ok(after[0]>before[0],'self-only contact removed');
 assert.equal(after[3],before[3],'stronger external remains intact');
 assert.equal(after[6],before[6],'external-only contact remains intact');
 assert.ok(after[9]>before[9],'second own shadow corrected');
 assert.equal(isolateStudioSelfShadow(g),0,'never double brighten');
 assert.deepEqual(Array.from(color.array),after);
 assert.equal(restoreStudioSelfShadow(g),true);
 assert.deepEqual(Array.from(color.array),before);
 assert.equal(restoreStudioSelfShadow(g),false);
 g.dispose();
});
test('R5.2-E correction refuses missing or mismatched mask provenance',()=>{
 const g=fixture();
 const before=Array.from(g.getAttribute('color').array);
 g.userData.fieldworkContactBaseTone=new Uint8Array(2);
 assert.equal(canIsolateSelfShadow(g),false);
 assert.equal(isolateStudioSelfShadow(g),0);
 assert.deepEqual(Array.from(g.getAttribute('color').array),before);
 g.dispose();
});
