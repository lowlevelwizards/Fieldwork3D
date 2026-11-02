import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,HEAD_SILHOUETTE_METRICS}
 from '../src/operator-headwear-silhouettes.ts';
function bounds(g){
 const box=new THREE.Box3().setFromObject(g);
 return {min:box.min,max:box.max};
}
test('patrol cap is shallow with a real continuous projecting bill',()=>{
 const cap=createHeadwearSilhouette('patrol-cap',new THREE.MeshStandardMaterial());
 assert.equal(cap.children.length,2);
 const {min,max}=bounds(cap);
 assert.ok(min.z < -8.8,'bill must project clearly in forward -Z direction');
 assert.ok(max.y>8.4&&max.y<9,'soft, shallow crown');
 assert.ok(max.x-min.x<10,'cap narrower than helmet');
 assert.equal(cap.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
 cap.traverse(x=>{if(x.isMesh){const a=x.geometry.getAttribute('position');
  for(let i=0;i<a.count;i++)for(const v of [a.getX(i),a.getY(i),a.getZ(i)])
   assert.ok(Number.isFinite(v));}});
});
test('ACH covers ears; high-cut shell raises the side edge substantially',()=>{
 const a=HEAD_SILHOUETTE_METRICS.ach;
 const b=HEAD_SILHOUETTE_METRICS['high-cut'];
 assert.ok(a.earEdge+2.0<b.earEdge);
 assert.ok(a.top>b.top);
 const mat=new THREE.MeshStandardMaterial();
 const ach=createHeadwearSilhouette('ach',mat);
 const cut=createHeadwearSilhouette('high-cut',mat);
 assert.equal(ach.children.length,1);
 assert.equal(cut.children.length,1);
 assert.ok(bounds(ach).max.y>bounds(cut).max.y);
 assert.notEqual(ach.children[0].geometry.getAttribute('position').array.toString(),
  cut.children[0].geometry.getAttribute('position').array.toString());
});
test('silhouette models are finite, indexed, bounded and contain no overlapping box mesh stacks',()=>{
 for(const id of ['patrol-cap','ach','high-cut']){
  const obj=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  obj.traverse(x=>{
   if(!x.isMesh)return;
   const geometry=x.geometry,positions=geometry.getAttribute('position');
   assert.ok(geometry.index&&geometry.index.count>40,id);
   for(const n of positions.array)assert.ok(Number.isFinite(n),id);
   assert.equal(geometry.type,'BufferGeometry');
  });
 }
});
