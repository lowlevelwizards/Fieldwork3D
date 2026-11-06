import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {enableBakedGearAO} from '../src/operator-baked-gear-ao.ts';
import {consolidateVisualGroup} from '../src/operator-visual-mesh-merge.ts';
import {applyStudioSelfShadowAtlases,studioAtlasResidentBytes,
 restoreStudioSelfShadow}
 from '../src/operator-gear-lightmap-atlas.ts';

function sample(){
 const root=new THREE.Group(),group=new THREE.Group();
 group.name='authored-rig-test-atlas';
 root.add(group);
 const material=new THREE.MeshStandardMaterial({color:0x8a917c});
 enableBakedGearAO(material);
 const body=new THREE.Mesh(new THREE.BoxGeometry(1.4,5,5),material);
 const flap=new THREE.Mesh(new THREE.BoxGeometry(.5,2,5.2),material);
 body.userData.fieldworkShadowPartId='rig/pouch/1';
 body.userData.fieldworkShadowRole='body';
 flap.userData.fieldworkShadowPartId='rig/pouch/1';
 flap.userData.fieldworkShadowRole='flap';
 flap.position.set(1.12,1.6,0);
 group.add(body,flap);
 consolidateVisualGroup(group);
 return {root,group,material};
}
test('R5.2-C atlas uses native UV1 and never overwrites camouflage or creates draws',()=>{
 const {root,group,material}=sample();
 assert.equal(group.children.length,1);
 const mesh=group.children[0];
 const g=mesh.geometry;
 const uv0=Array.from(g.getAttribute('uv').array);
 const color=Array.from(g.getAttribute('color').array);
 const position=Array.from(g.getAttribute('position').array);
 const initialResident=studioAtlasResidentBytes();
 const result=applyStudioSelfShadowAtlases(root);
 assert.equal(result.atlases,1);
 assert.ok(result.bytes>0&&result.bytes<1024*1024);
 assert.ok(result.shadedTexels>0);
 assert.equal(group.children.length,1);
 assert.ok(g.getAttribute('uv1'),'secondary UV exists');
 assert.deepEqual(Array.from(g.getAttribute('uv').array),uv0);
 const selfReplaced=Array.from(g.getAttribute('color').array);
 assert.ok(selfReplaced.every((v,i)=>v>=color[i]),
  'replacing baked self-shadow never adds extra darkness');
 assert.ok(selfReplaced.some((v,i)=>v>color[i]),
  'same-part self-shadow is lifted before the texture replaces it');
 assert.deepEqual(Array.from(g.getAttribute('position').array),position);
 const map=mesh.material.aoMap;
 assert.ok(map instanceof THREE.DataTexture);
 assert.equal(map.channel,1);
 assert.equal(map.colorSpace,THREE.NoColorSpace);
 assert.ok(Array.from(map.image.data).some(v=>v<255));
 assert.equal(mesh.material.aoMapIntensity,.85);
 assert.equal(g.userData.fieldworkAtlasSelfIsolated,true);
 assert.ok(g.userData.fieldworkAtlasPreIsolationColors instanceof Uint8Array);
 const second=applyStudioSelfShadowAtlases(root);
 assert.equal(second.atlases,0,'one-time atlas bake');
 assert.equal(studioAtlasResidentBytes(),initialResident+result.bytes);
 material.color.setHex(0xb5a586);
 applyStudioSelfShadowAtlases(root);
 assert.ok(mesh.material.color.equals(material.color),
  'swatch recoloring still follows authoritative material');
 assert.equal(restoreStudioSelfShadow(g),true);
 assert.deepEqual(Array.from(g.getAttribute('color').array),color,
  'debug preview restores byte-exact pre-atlas lighting');
 mesh.material.dispose();g.dispose();material.dispose();
 assert.equal(studioAtlasResidentBytes(),initialResident);
});
test('R5.2-C untagged isolated geometry keeps existing material path',()=>{
 const root=new THREE.Group(),group=new THREE.Group();
 group.name='untagged';root.add(group);
 const material=new THREE.MeshStandardMaterial();
 group.add(new THREE.Mesh(new THREE.BoxGeometry(2,2,2),material));
 const result=applyStudioSelfShadowAtlases(root);
 assert.equal(result.atlases,0);
 assert.equal(group.children[0].material,material);
});
