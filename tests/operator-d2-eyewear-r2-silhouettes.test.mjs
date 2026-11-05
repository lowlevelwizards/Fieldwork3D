/** The historical R2 seam/width assertions were intentionally retired:
 * R3 uses distinct frame and goggle builders, not universal extrusion.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
const material=new THREE.MeshStandardMaterial({color:0x475148});
const meshes=root=>{const a=[];root.traverse(x=>{if(x.isMesh)a.push(x)});return a;};
const lenses=root=>meshes(root).filter(m=>m.name.endsWith('-lens'));
test('R2 migration: new R3 lens topology preserves former seven selections',()=>{
 const standard=createD2Glasses('glasses-standard',material,material).children[0];
 const aviator=createD2Glasses('glasses-aviator',material,material);
 const wrap=createD2Glasses('glasses-wrap',material,material);
 const shield=createD2Glasses('glasses-shield',material,material);
 assert.deepEqual([standard,aviator,wrap,shield].map(x=>lenses(x).length),[2,2,1,1]);
 assert.equal(meshes(shield).filter(x=>x.name.includes('housing')).length,0,
  'the borderless shield is not an old framed plate');
 assert.equal(meshes(wrap).filter(x=>x.name.includes('fin')).length,0);
 for(const id of ['goggles-low','goggles-field','goggles-retro']){
  const g=createD2Goggles(id,material,material,material);
  assert.equal(g.children.length,4);
  assert.ok(meshes(g.children[0]).some(x=>x.userData.d2EyeProfile?.version===3));
 }
});
test('R2 migration: deep cup and dust silhouettes retain stronger depth than low-profile goggles',()=>{
 const profiles=['goggles-low','goggles-field','goggles-retro'].map(id=>{
  const g=createD2Goggles(id,material,material,material).children[0];
  return meshes(g).filter(m=>m.userData.d2EyeProfile);
 });
 assert.deepEqual(profiles.map(p=>p.length),[1,2,3]);
 assert.ok(profiles[1][0].userData.d2EyeProfile.housingDepth>
  profiles[0][0].userData.d2EyeProfile.housingDepth+.7);
 assert.ok(profiles[2].find(p=>p.name.includes('faceted-barrel')).userData.d2EyeProfile.housingDepth>
  profiles[0][0].userData.d2EyeProfile.housingDepth+.3);
});
