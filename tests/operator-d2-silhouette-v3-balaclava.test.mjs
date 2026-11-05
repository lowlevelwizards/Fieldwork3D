import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Balaclava} from '../src/operator-d2-fabric-visuals.ts';
const cloth=new THREE.MeshStandardMaterial({color:0x36463c});
function front(x,y,g){
 g.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(x,y,-14),new THREE.Vector3(0,0,1),0,20);
 return ray.intersectObjects(g.children,true).some(hit=>{
  let node=hit.object;
  while(node&&node!==g){if(!node.visible)return false;node=node.parent;}
  return hit.point.z< -3.96;
 });
}
test('V3-B1 balaclavas share head and full-neck hem, not separate hard helmets',()=>{
 const models=['balaclava-one','balaclava-three','balaclava-open'];
 for(const id of models){
  const g=createD2Balaclava(id,cloth);
  const p=g.children[0].geometry.userData.cuboids;
  assert.equal(p.filter(x=>x.name.includes('collar-fold')).length,4);
  assert.ok(p.some(x=>x.name.includes('-crown')));
  assert.equal(g.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  const b=new THREE.Box3().setFromObject(g);
  assert.ok(b.max.x<4.5&&b.min.x> -4.5);
 }
});
test('V3-B1 silhouette hierarchy: one slit, separate small eyes, open full face',()=>{
 const one=createD2Balaclava('balaclava-one',cloth);
 const three=createD2Balaclava('balaclava-three',cloth);
 const open=createD2Balaclava('balaclava-open',cloth);
 for(const x of [-2,0,2])assert.equal(front(x,3.64,one),false,'continuous slit');
 assert.equal(front(0,2.5,one),true,'one opening stays above nose/mouth');
 assert.equal(front(-2,3.64,three),false);
 assert.equal(front(2,3.64,three),false);
 assert.equal(front(0,3.64,three),true,'actual knit nose bridge');
 assert.equal(front(0,1.50,three),false,'smaller separate mouth');
 assert.equal(front(0,2.50,three),true);
 assert.equal(front(0,1.10,open),false);
 assert.equal(front(0,4.90,open),false);
 assert.equal(front(0,6.10,open),true,'open face is still a hood');
});
