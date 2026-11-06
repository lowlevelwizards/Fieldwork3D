import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {shadowContactRule} from '../src/operator-gear-shadow-relationships.ts';
import {enableBakedGearAO} from '../src/operator-baked-gear-ao.ts';
import {bakeCastOnGear,collectCastVolumeRecords,
 rememberUnmergedShadowVolumes} from '../src/operator-baked-gear-cast.ts';

const material=()=>{const m=new THREE.MeshStandardMaterial({color:0xffffff});
 enableBakedGearAO(m);return m;};
const testScene=()=>{
 const root=new THREE.Group(),receive=new THREE.Group(),caster=new THREE.Group();
 root.add(receive,caster);
 const m=material();
 const shell=new THREE.Mesh(new THREE.BoxGeometry(2,8,8,6,6,6),m);
 receive.add(shell);
 const pack=new THREE.Mesh(new THREE.BoxGeometry(.8,4,3),m);
 pack.position.x=-1.7;
 caster.add(pack);
 return {root,receive,caster,shell,pack,m};
};
test('R5.3-B shadow graph is directional by assembly and conservative',()=>{
 assert.ok(shadowContactRule('uniform','armor'));
 assert.ok(shadowContactRule('uniform','rig'));
 assert.ok(shadowContactRule('uniform','pack'));
 assert.ok(shadowContactRule('armor','rig'));
 assert.ok(shadowContactRule('pack','armor'));
 assert.equal(shadowContactRule('rig','pack'),null);
 assert.equal(shadowContactRule('armor','armor'),null);
 assert.equal(shadowContactRule('uniform','uniform'),null);
 assert.ok(shadowContactRule('uniform','pack').contactRadius>
  shadowContactRule('uniform','rig').contactRadius);
 assert.ok(shadowContactRule('generic','pack'),
  'legacy callers preserve previous geometry-only policy');
});
test('R5.3-B denies invalid cross-assembly shadow and reverts baseline',()=>{
 const {root,receive,caster,shell}=testScene();
 const base=Array.from(shell.geometry.getAttribute('color')?.array??[]);
 bakeCastOnGear(receive,[{root:caster,role:'pack'}],root,
  'invalid','rig');
 const none=shell.geometry.userData.fieldworkInterContactMask;
 assert.ok(none.every(v=>v===0),'no pack shadow on unrelated rig');
 const plain=Array.from(shell.geometry.getAttribute('color').array);
 bakeCastOnGear(receive,[{root:caster,role:'pack'}],root,
  'valid','uniform');
 const actual=shell.geometry.userData.fieldworkInterContactMask;
 assert.ok(actual.some(v=>v>0),'rear uniform receives pack contact');
 const lit=Array.from(shell.geometry.getAttribute('color').array);
 assert.ok(lit.some((v,i)=>v<plain[i]));
 bakeCastOnGear(receive,[],root,'none','uniform');
 assert.deepEqual(Array.from(shell.geometry.getAttribute('color').array),plain,
  'removing pack restores unoccluded state');
});
test('R5.3-B hidden alternative part cannot cast or be recorded',()=>{
 const {root,caster}=testScene();
 const hidden=new THREE.Mesh(new THREE.BoxGeometry(20,20,20),material());
 hidden.visible=false;
 caster.add(hidden);
 rememberUnmergedShadowVolumes(caster);
 const volumes=collectCastVolumeRecords(caster,root);
 assert.equal(volumes.length,1);
 assert.ok(volumes[0].box.getSize(new THREE.Vector3()).x<2);
});
test('R5.3-B preserved pouch parts and source role independent of camouflage',()=>{
 const {root,receive,caster,pack,m}=testScene();
 pack.userData.fieldworkShadowPartId='pack/pouch/1';
 pack.userData.fieldworkShadowRole='body';
 rememberUnmergedShadowVolumes(caster);
 const volumes=collectCastVolumeRecords(caster,root);
 assert.equal(volumes[0].partId,'pack/pouch/1');
 assert.equal(volumes[0].partRole,'body');
 bakeCastOnGear(receive,[{root:caster,role:'pack'}],
  root,'outfit-v1','uniform');
 const once=Array.from(receive.children[0].geometry.getAttribute('color').array);
 m.color.setHex(0x788569);
 bakeCastOnGear(receive,[{root:caster,role:'pack'}],
  root,'outfit-v1','uniform');
 assert.deepEqual(Array.from(receive.children[0].geometry.getAttribute('color').array),once);
});
