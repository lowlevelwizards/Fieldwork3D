import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2FabricWrap} from '../src/operator-d2-fabric-wraps.ts';
const cloth=new THREE.MeshStandardMaterial({color:0x5d594b});
const parts=g=>g.children[0].geometry.userData.cuboids;
test('V3 shemagh owns the largest drape, stepped chest triangle and asymmetric tail',()=>{
 const scarf=createD2FabricWrap('shemagh',cloth);
 assert.deepEqual(scarf.children.map(g=>g.userData.d2WrapMode),
  ['draped','face-wrap','head-wrap']);
 for(const mode of scarf.children){
  const c=parts(mode),names=c.map(x=>x.name);
  assert.equal(mode.children.length,1);
  assert.equal(c.filter(x=>x.name.startsWith('broad-triangular-chest-bib-')).length,5);
  assert.ok(names.includes('right-hanging-scarf-tail'));
  assert.ok(names.includes('left-tucked-shoulder'));
  assert.ok(names.filter(x=>x.includes('fold')).length>=2);
  const bounds=new THREE.Box3().setFromObject(mode);
  assert.ok(bounds.min.y< -7.1,'meaningful drape below face');
  assert.ok(bounds.max.x>4.5,'shoulder flare, not face tube');
 }
});
test('V3 shemagh face and crown wrap are distinct from a balaclava or gaiter',()=>{
 const modes=createD2FabricWrap('shemagh',cloth).children;
 const draped=parts(modes[0]),face=parts(modes[1]),head=parts(modes[2]);
 assert.equal(draped.filter(p=>p.name.includes('diagonal-face-wrap')).length,0);
 assert.equal(face.filter(p=>p.name.includes('diagonal-face-wrap')).length,5);
 assert.equal(head.filter(p=>p.name.includes('diagonal-face-wrap')).length,5);
 assert.ok(head.some(p=>p.name==='second-crown-winding'));
 assert.ok(head.some(p=>p.name==='long-rear-head-wrap-tail'));
 assert.ok(!head.some(p=>p.name.includes('hood-front')||p.name.includes('balaclava')));
 const size=new THREE.Box3().setFromObject(modes[2]);
 assert.ok(size.max.y>7.3,'crossed head-wrap above skull');
});
