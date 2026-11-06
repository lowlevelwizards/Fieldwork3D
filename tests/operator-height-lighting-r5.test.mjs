import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {operatorHeightBrightness,applyOperatorHeightLighting}
 from '../src/operator-height-lighting.ts';

const mat=()=>{const m=new THREE.MeshStandardMaterial({vertexColors:true});
 m.userData.fieldworkBakedEquipmentAO=true;return m;};
const box=(height,material)=>{
 const m=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),material);
 const count=m.geometry.getAttribute('position').count;
 m.geometry.setAttribute('color',
  new THREE.Uint8BufferAttribute(new Uint8Array(count*3).fill(255),3,true));
 m.position.y=height;
 return m;
};
test('R5 global gradient is smooth, strictly downward, without item resets',()=>{
 const a=[0,10,22.5,35,50].map(operatorHeightBrightness);
 assert.ok(Math.abs(a[0]-.82)<1e-8);
 assert.ok(Math.abs(a[4]-1)<1e-8);
 assert.ok(a.every((v,i)=>i===0||v>a[i-1]));
 assert.ok(operatorHeightBrightness(-4)===a[0]);
 assert.ok(operatorHeightBrightness(80)===1);
 const d=.001;
 assert.ok(Math.abs(operatorHeightBrightness(10-d)-
  operatorHeightBrightness(10+d))<.001,'no horizontal step');
});
test('R5 shades complete root rather than restarting each small equipment box',()=>{
 const root=new THREE.Group(),material=mat(),high=box(45,material),
  low=box(5,material);
 root.add(high,low);
 const first=applyOperatorHeightLighting(root,'wear-a');
 assert.equal(first.meshes,2);
 const top=high.geometry.getAttribute('color').getX(0),
  bottom=low.geometry.getAttribute('color').getX(0);
 assert.ok(top>bottom+.10,'identical boxes follow body height');
 assert.ok(applyOperatorHeightLighting(root,'wear-a').cached);
 assert.equal(applyOperatorHeightLighting(root,'wear-b').cached,false);
 assert.ok(Math.abs(low.geometry.getAttribute('color').getX(0)-bottom)<1e-6,
  'no accumulated darkening after outfit change');
 assert.equal(high.geometry.getAttribute('position').count,24);
 for(const m of [high,low])m.geometry.dispose();
 material.dispose();
});
test('R5 gradient ignores hidden alternate kit and preserves camouflage UVs',()=>{
 const root=new THREE.Group(),material=mat(),shell=box(20,material);
 root.add(shell);
 const hidden=new THREE.Group();hidden.visible=false;
 hidden.add(box(3,material));root.add(hidden);
 const uv=Array.from(shell.geometry.getAttribute('uv').array);
 const n=applyOperatorHeightLighting(root,'test');
 assert.equal(n.meshes,1);
 assert.deepEqual(Array.from(shell.geometry.getAttribute('uv').array),uv);
});
