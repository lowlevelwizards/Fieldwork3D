import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {enableBakedGearAO,bakeGearContactAO}
 from '../src/operator-baked-gear-ao.ts';
import {bakeCastOnGear} from '../src/operator-baked-gear-cast.ts';
import {refineStaticShadowGeometry}
 from '../src/operator-gear-shadow-receivers.ts';

const material=()=>{
 const m=new THREE.MeshStandardMaterial({color:0xffffff});
 enableBakedGearAO(m);return m;
};
function contactFixture(extraFar){
 const m=material(),group=new THREE.Group();
 const face=new THREE.Mesh(new THREE.BoxGeometry(2,8,8,1,8,8),m);
 const flap=new THREE.Mesh(new THREE.BoxGeometry(1,4,4),m);
 flap.position.x=1.8;
 group.add(face,flap);
 if(extraFar){
  const distant=new THREE.Mesh(new THREE.BoxGeometry(1,4,4),m);
  distant.position.set(120,50,0);
  group.add(distant);
 }
 bakeGearContactAO(group);
 return {m,group,face};
}
test('R6 local AO broadphase preserves bytes with remote equipment and skips cached work',()=>{
 const a=contactFixture(false),b=contactFixture(true);
 const color=(sample)=>Array.from(sample.face.geometry.getAttribute('color').array);
 const masks=(sample)=>[
  Array.from(sample.face.geometry.userData.fieldworkSelfOcclusionMask),
  Array.from(sample.face.geometry.userData.fieldworkExternalOcclusionMask)
 ];
 assert.deepEqual(color(a),color(b),'out-of-reach gear cannot alter AO');
 assert.deepEqual(masks(a),masks(b),'independent channels remain exact');
 assert.ok(masks(a)[1].some(v=>v>0),'real nearby flap still shades');
 // This MUST skip the full world-matrix walk and candidate construction.
 b.group.updateWorldMatrix=()=>{
  throw new Error('a cached contact bake must not rebuild world matrices');
 };
 assert.equal(bakeGearContactAO(b.group),0);
 for(const sample of [a,b]){
  sample.group.traverse(o=>{
   if(o instanceof THREE.Mesh)o.geometry.dispose();
  });
  sample.m.dispose();
 }
});
function castFixture(extraFar){
 const m=material(),chest=new THREE.Group(),
  receiver=new THREE.Group(),source=new THREE.Group();
 const face=new THREE.Mesh(new THREE.BoxGeometry(2,8,8,1,8,8),m);
 const flap=new THREE.Mesh(new THREE.BoxGeometry(1,4,4),m);
 flap.position.set(1.9,1,0);
 receiver.add(face);source.add(flap);
 if(extraFar){
  const distant=new THREE.Mesh(new THREE.BoxGeometry(1,4,4),m);
  distant.position.set(100,100,0);source.add(distant);
 }
 chest.add(receiver,source);
 const result=bakeCastOnGear(receiver,[source],chest,'same-style');
 return {m,chest,receiver,source,face,result};
}
test('R6 cross-assembly caster culling preserves color, directional and contact masks',()=>{
 const a=castFixture(false),b=castFixture(true);
 const sample=fixture=>{
  const geometry=fixture.face.geometry;
  return [
   Array.from(geometry.getAttribute('color').array),
   Array.from(geometry.userData.fieldworkDirectionalCastMask),
   Array.from(geometry.userData.fieldworkInterContactMask)
  ];
 };
 assert.ok(a.result.changed>0,'real nearby strap must still cast');
 assert.deepEqual(sample(a),sample(b),'remote casters contribute no pixels');
 assert.ok(sample(a)[1].some(v=>v>0)||sample(a)[2].some(v=>v>0));
 const geo=b.face.geometry;
 const savedContact=geo.userData.fieldworkInterContactMask;
 const savedCast=geo.userData.fieldworkDirectionalCastMask;
 b.source.updateWorldMatrix=()=>{
  throw new Error('cached cross-lighting must not traverse caster volumes');
 };
 assert.equal(bakeCastOnGear(b.receiver,[b.source],b.chest,
  'same-style').vertices,0);
 // Changing the outfit key recomposes from neutral, reusing CPU buffers.
 const before=Array.from(geo.getAttribute('color').array);
 bakeCastOnGear(b.receiver,[],b.chest,'clear-style');
 assert.equal(geo.userData.fieldworkInterContactMask,savedContact);
 assert.equal(geo.userData.fieldworkDirectionalCastMask,savedCast);
 assert.ok(geo.userData.fieldworkInterContactMask.every(v=>v===0));
 assert.ok(geo.userData.fieldworkDirectionalCastMask.every(v=>v===0));
 assert.ok(Array.from(geo.getAttribute('color').array).some((v,i)=>v>before[i]),
  'changing to no equipment restores lit fabric');
 for(const fixture of [a,b]){
  fixture.chest.traverse(o=>{
   if(o instanceof THREE.Mesh)o.geometry.dispose();
  });
  fixture.m.dispose();
 }
});
test('R6 receiver refinement preserves vertex formats, bounds and UVs',()=>{
 const m=material(),source=new THREE.BoxGeometry(3,9,7,1,2,2);
 const colors=new Uint8Array(source.getAttribute('position').count*3).fill(220);
 source.setAttribute('color',new THREE.Uint8BufferAttribute(colors,3,true));
 const bounds=new THREE.Box3().setFromBufferAttribute(source.getAttribute('position'));
 const result=refineStaticShadowGeometry(source,2400,.8);
 assert.notEqual(result,source);
 assert.ok(result.getAttribute('position').count<=2400);
 assert.ok(result.getAttribute('color').array instanceof Uint8Array);
 assert.equal(result.getAttribute('color').normalized,true);
 assert.deepEqual(Array.from(result.getAttribute('color').array).filter(v=>v!==220),[]);
 assert.ok(new THREE.Box3().setFromBufferAttribute(
  result.getAttribute('position')).equals(bounds));
 assert.equal(result.getAttribute('uv').count,
  result.getAttribute('position').count);
 result.dispose();source.dispose();m.dispose();
});
