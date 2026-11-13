import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {consolidateStaticFixtureParts}
 from '../src/rendering/breach-fixture-draw-batching.ts';
import {RepeatedFixtureBatches}
 from '../src/rendering/breach-repeated-fixture-batches.ts';

function pair(root,index,material,geometry){
 const owner=new THREE.Group(),intact=new THREE.Group(),debris=new THREE.Group();
 owner.position.x=index*30;owner.add(intact,debris);debris.visible=false;
 const mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(2,3,4);intact.add(mesh);root.add(owner);
 return {owner,intact,debris,mesh};
}
function matrixAt(batch,slot){
 const m=new THREE.Matrix4();batch.getMatrixAt(slot,m);
 return m;
}
test('repeated fixture bodies become one GPU draw and retain independent reveal',()=>{
 const root=new THREE.Group(),mat=new THREE.MeshStandardMaterial(),
  geo=new THREE.BoxGeometry(2,4,6);
 const a=pair(root,0,mat,geo),b=pair(root,1,mat,geo);
 const repeated=new RepeatedFixtureBatches();
 repeated.collect(0,a.owner,a.intact);repeated.collect(1,b.owner,b.intact);
 repeated.flush(root,new Set([geo]));
 assert.equal(repeated.stats.saved,1);
 assert.equal(a.intact.children.length,0);
 assert.equal(b.intact.children.length,0);
 const batch=root.children.find(o=>o instanceof THREE.InstancedMesh);
 assert.ok(batch);
 assert.deepEqual([matrixAt(batch,0).elements[12],matrixAt(batch,1).elements[12]],[2,32]);
 a.owner.visible=false;repeated.sync(0);
 assert.equal(matrixAt(batch,0).elements[0],0);
 assert.equal(matrixAt(batch,1).elements[12],32);
 b.owner.position.set(95,0,0);repeated.sync(1,true);
 assert.equal(matrixAt(batch,1).elements[12],97);
 a.owner.visible=true;repeated.sync(0);
 assert.equal(matrixAt(batch,0).elements[12],2);
 b.intact.visible=false;b.debris.visible=true;repeated.sync(1);
 assert.equal(matrixAt(batch,1).elements[0],0);
 assert.equal(batch.visible,true);
 a.owner.visible=false;repeated.sync(0);
 assert.equal(batch.visible,false);
 repeated.clear();geo.dispose();mat.dispose();
});
test('translucent, dissimilar and metadata-bearing surfaces are not combined',()=>{
 const root=new THREE.Group();
 const geo=new THREE.BoxGeometry(2,2,2);
 const red=new THREE.MeshStandardMaterial({color:0xff0000});
 const blue=new THREE.MeshStandardMaterial({color:0x0000ff});
 const fade=new THREE.MeshStandardMaterial({transparent:true,opacity:.3});
 const a=pair(root,0,red,geo),b=pair(root,1,blue,geo),
  c=pair(root,2,fade,geo),d=pair(root,3,red,geo);
 d.mesh.userData.keepSeparate=true;
 const repeated=new RepeatedFixtureBatches();
 for(const [i,v] of [a,b,c,d].entries())repeated.collect(i,v.owner,v.intact);
 repeated.flush(root,new Set([geo]));
 assert.equal(repeated.stats.saved,0);
 for(const v of [a,b,c,d])assert.equal(v.intact.children.length,1);
 repeated.clear();geo.dispose();red.dispose();blue.dispose();fade.dispose();
});
test('exterior consolidation stays within spatial cells and direct site meshes',()=>{
 const root=new THREE.Group(),mat=new THREE.MeshStandardMaterial();
 const make=(parent,x)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),mat);
  m.position.x=x;parent.add(m);return m;
 };
 make(root,1);make(root,3);make(root,250);make(root,255);
 const cover=new THREE.Group();root.add(cover);
 make(cover,1);make(cover,3);
 const stats=consolidateStaticFixtureParts(root,{recursive:false,cellSize:220});
 assert.equal(stats.original,4);
 assert.equal(stats.batched,2);
 assert.equal(cover.children.length,2,'dynamic cover remains unmerged');
 root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 mat.dispose();
});
