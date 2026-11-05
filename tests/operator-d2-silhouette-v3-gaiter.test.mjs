import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2FabricWrap} from '../src/operator-d2-fabric-wraps.ts';
const mat=new THREE.MeshStandardMaterial({color:0x555b45});
const bounds=g=>new THREE.Box3().setFromObject(g);
const bits=g=>g.children[0].geometry.userData.cuboids;
test('V3 gaiter: one tube identity, no unrelated scarf or tied features',()=>{
 const root=createD2FabricWrap('gaiter',mat);
 assert.deepEqual(root.children.map(g=>g.userData.d2WrapMode),
  ['lowered','mouth','nose']);
 for(const group of root.children){
  assert.equal(group.children.length,1);
  assert.ok(group.children[0].geometry.userData.greedyCuboidUnion);
  const named=bits(group).map(p=>p.name);
  assert.ok(named.some(n=>n.includes('tube')),'physical fabric sleeve');
  assert.ok(!named.some(n=>/scarf|triangle|tail|tie|knot|drape|cheek-fold/.test(n)));
  assert.ok(named.filter(n=>/upper-rim|rolled-upper-edge/.test(n)).length<=1);
 }
 const [lowered,mouth,nose]=root.children.map(bounds);
 assert.ok(lowered.max.y<0,'lowered remains below face');
 assert.ok(mouth.max.y>1.6&&mouth.max.y<2.2);
 assert.ok(nose.max.y>2.9&&nose.max.y<3.6);
 assert.ok(mouth.min.y===nose.min.y,'same lower tube fit');
 assert.ok(nose.max.y-mouth.max.y>1,'distinct pulled-up position');
});
