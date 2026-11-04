import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Balaclava} from '../src/operator-d2-fabric-visuals.ts';
import {wardrobeItem,readWardrobe} from '../src/operator-wardrobe-data.ts';
const cloth=new THREE.MeshStandardMaterial({color:0x343f3a});
function frontHit(g,x,y){
 g.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(x,y,-14),new THREE.Vector3(0,0,1),0,20);
 return ray.intersectObjects(g.children,true).some(hit=>{
  let node=hit.object;
  while(node&&node!==g){if(!node.visible)return false;node=node.parent;}
  // Rear head wrapping is intentional; only the forward actual cloth plane
  // counts as a filled face opening.
  return hit.point.z< -3.96;
 });
}
test('A1 v2 fitted hollow shells retain actual apertures in canonical -Z space',()=>{
 const one=createD2Balaclava('balaclava-one',cloth);
 const three=createD2Balaclava('balaclava-three',cloth);
 const open=createD2Balaclava('balaclava-open',cloth);
 for(const b of [one,three,open]){
  assert.equal(b.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  assert.ok(b.children.some(x=>x.isMesh&&x.userData.d2ClothExterior));
  const bounds=new THREE.Box3().setFromObject(b);
  assert.ok(bounds.min.z< -4&&bounds.max.z>4);
  assert.ok(bounds.min.y< -1&&bounds.max.y>7);
  assert.ok(bounds.max.x<4.5&&bounds.min.x> -4.5,'fitted, not oversized helmet');
  assert.equal(b.children.some(x=>x.name==='solid-head-box'),false);
 }
 for(const x of [-2,2])assert.equal(frontHit(one,x,3.6),false);
 assert.equal(frontHit(one,0,1.2),true);
 for(const x of [-2,2])assert.equal(frontHit(three,x,3.6),false);
 assert.equal(frontHit(three,0,3.6),true);
 assert.equal(frontHit(three,0,1.4),false);
 assert.equal(frontHit(open,0,3.4),false);
 assert.equal(frontHit(open,0,6.0),true);
});
test('v2 eye-only wearing state is an option, not another wardrobe model',()=>{
 assert.ok(wardrobeItem('facewear','balaclava-open'));
 assert.equal(wardrobeItem('facewear','balaclava-two'),undefined);
 const three=createD2Balaclava('balaclava-three',cloth);
 const cover=three.getObjectByName('d2-two-hole-mouth-cover');
 assert.ok(cover);assert.equal(cover.visible,false);
 cover.visible=true;
 assert.equal(frontHit(three,0,1.4),true);
});
test('two-hole saved mode remains compatible with existing v1 outfits',()=>{
 const saved=readWardrobe({version:1,d2FaceMode:'two-hole',
  styles:{facewear:'balaclava-three'}});
 assert.equal(saved.d2FaceMode,'two-hole');
 assert.equal(readWardrobe({...saved,d2FaceMode:'broken'}).d2FaceMode,undefined);
});
