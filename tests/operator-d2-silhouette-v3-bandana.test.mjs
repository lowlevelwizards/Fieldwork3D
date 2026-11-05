import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2FabricWrap} from '../src/operator-d2-fabric-wraps.ts';
const cloth=new THREE.MeshStandardMaterial({color:0x5c5c4b});
const cuboids=group=>group.children[0].geometry.userData.cuboids;
const overlapping=(a,b)=>['x','y','z'].every((axis,i)=>{
 const dimension=['width','height','depth'][i];
 return Math.min(a[axis]+a[dimension]/2,b[axis]+b[dimension]/2)-
  Math.max(a[axis]-a[dimension]/2,b[axis]-b[dimension]/2)>.005;
});
function joined(parts){
 const visited=new Set([0]),queue=[0];
 while(queue.length){
  const i=queue.pop();
  for(let j=0;j<parts.length;j++)
   if(!visited.has(j)&&overlapping(parts[i],parts[j])){
    visited.add(j);queue.push(j);
   }
 }
 return visited.size===parts.length;
}
test('R4 bandana is one volumetric front-to-back wrap with broad hanging cloth',()=>{
 const bandana=createD2FabricWrap('bandana',cloth);
 assert.deepEqual(bandana.children.map(g=>g.userData.d2WrapMode),['raised','lowered']);
 for(const mode of bandana.children){
  const b=cuboids(mode),names=b.map(x=>x.name);
  const front=b.filter(x=>x.name.startsWith('hanging-front-'));
  assert.equal(front.length,6);
  assert.ok(front.at(-1).width>=3,'bottom must not become a needlepoint thong');
  assert.ok(front.every(x=>x.depth>=.50),'front panels have convincing depth');
  assert.ok(b.filter(x=>x.name.endsWith('-upper-wrap')).length===2);
  assert.ok(b.filter(x=>x.name.endsWith('-cheek-wrap')).length===2);
  assert.ok(b.filter(x=>x.name.endsWith('-lower-cheek-return')).length===2);
  assert.ok(names.includes('closed-rear-landing')&&names.includes('rear-knot'));
  assert.ok(names.includes('knot-left-wing')&&names.includes('knot-right-wing'));
  const tails=b.filter(x=>x.name.endsWith('-knot-tail'));
  assert.equal(tails.length,2);
  assert.notEqual(tails[0].height,tails[1].height);
  assert.ok(joined(b),'every authored cloth cuboid must overlap the connected assembly');
  assert.equal(mode.children.length,1,'joined exterior mesh per mode');
  assert.equal(mode.children[0].geometry.userData.greedyCuboidUnion,true);
 }
 const [raised,lowered]=bandana.children.map(m=>new THREE.Box3().setFromObject(m));
 assert.ok(raised.max.y>3&&raised.min.y<-.5);
 assert.ok(lowered.max.y<0,'lowered wraps below face');
});
