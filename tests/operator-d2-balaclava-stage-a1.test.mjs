import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Balaclava} from '../src/operator-d2-fabric-visuals.ts';
import {wardrobeItem,readWardrobe} from '../src/operator-wardrobe-data.ts';
const cloth=new THREE.MeshStandardMaterial({color:0x343f3a});
function frontHit(g,x,y){
 let hit=false;
 g.traverse(o=>{
  if(!o.isMesh||!o.userData.d2FrontPanel||!o.visible)return;
  // Respect hidden group parents, including the unselected two-hole mouth panel.
  let parent=o.parent;
  while(parent&&parent!==g){if(!parent.visible)return;parent=parent.parent;}
  const geo=o.geometry;
  if(!geo.boundingBox)geo.computeBoundingBox();
  const min=geo.boundingBox.min,max=geo.boundingBox.max;
  const p=o.position;
  if(x>min.x+p.x&&x<max.x+p.x&&y>min.y+p.y&&y<max.y+p.y)hit=true;
 });
 return hit;
}
test('A1 shells cover actual head volume in -Z forward space, leaving real openings',()=>{
 const one=createD2Balaclava('balaclava-one',cloth);
 const three=createD2Balaclava('balaclava-three',cloth);
 const open=createD2Balaclava('balaclava-open',cloth);
 for(const b of [one,three,open]){
  assert.equal(b.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  assert.ok(b.children.length>=10);
  const bounds=new THREE.Box3().setFromObject(b);
  assert.ok(bounds.min.z< -4&&bounds.max.z>4);
  assert.ok(bounds.min.y<0&&bounds.max.y>7);
 }
 for(const x of [-2,2])assert.equal(frontHit(one,x,3.6),false);
 assert.equal(frontHit(one,0,1.2),true);
 for(const x of [-2,2])assert.equal(frontHit(three,x,3.6),false);
 assert.equal(frontHit(three,0,3.6),true);
 assert.equal(frontHit(three,0,1.2),false);
 assert.equal(frontHit(open,0,3.4),false);
 assert.equal(frontHit(open,0,6),true);
});
test('two-hole balaclava is an option, not a separate Studio model',()=>{
 assert.ok(wardrobeItem('facewear','balaclava-open'));
 assert.equal(wardrobeItem('facewear','balaclava-two'),undefined);
 const three=createD2Balaclava('balaclava-three',cloth);
 const cover=three.getObjectByName('d2-two-hole-mouth-cover');
 assert.ok(cover);
 assert.equal(cover.visible,false);
});

test('two-hole configuration survives v1 appearance persistence',()=>{
 const saved=readWardrobe({version:1,d2FaceMode:'two-hole',
  styles:{facewear:'balaclava-three'}});
 assert.equal(saved.d2FaceMode,'two-hole');
 assert.equal(readWardrobe({...saved,d2FaceMode:'broken'}).d2FaceMode,undefined);
});
