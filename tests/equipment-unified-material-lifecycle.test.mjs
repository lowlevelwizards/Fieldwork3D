import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {gearMarkedMaterial,gearPixelMap,syncGearMarkedMaterials} from '../src/operator-gear-pixel-art.ts';
test('BT11 gear mark clones share a cached pixel texture and release with their palette source',()=>{
 const a=new THREE.MeshStandardMaterial({color:0x556644}),b=new THREE.MeshStandardMaterial({color:0x556644});
 const first=gearMarkedMaterial(a,'band',5,4),second=gearMarkedMaterial(a,'band',5,4),other=gearMarkedMaterial(b,'band',5,4);
 assert.equal(first,second);assert.notEqual(first,other);
 assert.equal(first.aoMap,other.aoMap);assert.equal(first.aoMap,gearPixelMap('band',5,4));
 let releases=0,otherReleases=0,textureReleases=0;
 first.addEventListener('dispose',()=>releases++);other.addEventListener('dispose',()=>otherReleases++);
 const onTexture=()=>textureReleases++;first.aoMap.addEventListener('dispose',onTexture);
 a.color.setHex(0x303030);syncGearMarkedMaterials(a);assert.equal(first.color.getHex(),0x303030);
 a.dispose();assert.equal(releases,1);assert.equal(otherReleases,0);assert.equal(textureReleases,0);
 b.dispose();assert.equal(otherReleases,1);assert.equal(textureReleases,0);
 first.aoMap.removeEventListener('dispose',onTexture);
});
