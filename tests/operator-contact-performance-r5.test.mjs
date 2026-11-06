import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {crossEquipmentContact,crossEquipmentContactBox}
 from '../src/operator-baked-gear-cast.ts';

test('R5.3-C allocation-free single caster matches legacy multi-box results',()=>{
 const boxes=[
  new THREE.Box3(new THREE.Vector3(-4,-2,-2),
   new THREE.Vector3(-3.2,2,2)),
  new THREE.Box3(new THREE.Vector3(1,-2,-2),
   new THREE.Vector3(2,2,2)),
  new THREE.Box3(new THREE.Vector3(0,4,1),
   new THREE.Vector3(2,5,3))
 ];
 for(let x=-6;x<=6;x+=.37)for(let y=-4;y<=6;y+=.89){
  const point=new THREE.Vector3(x,y,.45);
  const normal=new THREE.Vector3(Math.cos(x),.7,Math.sin(y)).normalize();
  for(const radius of [.8,1.15,1.45]){
   const expected=Math.max(...boxes.map(box=>
    crossEquipmentContactBox(point,normal,box,radius)));
   assert.ok(Math.abs(crossEquipmentContact(point,normal,boxes,radius)-
    expected)<1e-12);
   for(const box of boxes){
    const value=crossEquipmentContactBox(point,normal,box,radius);
    assert.ok(value>=0&&value<=1,'normalized contact value');
   }
  }
 }
});
test('R5.3-C invalid caster direction remains unshaded',()=>{
 const box=new THREE.Box3(new THREE.Vector3(-4,-1,-1),
  new THREE.Vector3(-3,1,1));
 assert.equal(crossEquipmentContactBox(new THREE.Vector3(-2.8,0,0),
  new THREE.Vector3(1,0,0),box),0);
});
