import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {StaticVisualTemplateLibrary}
 from '../src/rendering/fieldwork-visual-template-library.ts';
const material=new THREE.MeshStandardMaterial();
let disposed=0;
const make=()=>{
 const root=new THREE.Group();
 const geometry=new THREE.BoxGeometry(1,2,3);
 geometry.addEventListener('dispose',()=>disposed++);
 root.add(new THREE.Mesh(geometry,material));
 return {root,ownedGeometries:[geometry]};
};
test('E6.22 bounded cache evicts idle LRU; held instances survive retirement',()=>{
 disposed=0;
 const cache=new StaticVisualTemplateLibrary(2);
 const a=cache.acquire('A:v1',make),b=cache.acquire('B:v1',make);
 a.release();
 cache.acquire('B:v1',make).release(); // touches B; A now least recent
 const c=cache.acquire('C:v1',make);
 assert.equal(cache.stats().templates,2);
 assert.equal(cache.stats().evictions,1);
 assert.equal(cache.stats().retired,0);
 assert.equal(disposed,1);
 assert.equal(cache.stats().builds,3);
 b.release();c.release();cache.clear();
 assert.equal(disposed,3);
});
test('E6.22 retired live instances preserve geometry through eviction and exact-key rebuild',()=>{
 disposed=0;
 const cache=new StaticVisualTemplateLibrary(1);
 const a=cache.acquire('A:v1',make);
 const aGeo=a.root.children[0].geometry;
 const b=cache.acquire('B:v1',make);
 assert.equal(cache.stats().templates,1);
 assert.equal(cache.stats().retired,1);
 assert.equal(disposed,0);
 const replacement=cache.acquire('A:v1',make);
 assert.notEqual(replacement.root.children[0].geometry,aGeo);
 assert.equal(cache.stats().builds,3);
 assert.equal(cache.stats().retired,2);
 assert.equal(disposed,0);
 a.release();
 assert.equal(disposed,1);
 b.release();
 assert.equal(disposed,2);
 replacement.release();
 cache.clear();
 assert.equal(disposed,3);
 assert.equal(cache.stats().geometries,0);
});
test('E6.22 budget validates upfront',()=>{
 assert.throws(()=>new StaticVisualTemplateLibrary(0),/positive integer/);
 assert.throws(()=>new StaticVisualTemplateLibrary(2.4),/positive integer/);
 material.dispose();
});
