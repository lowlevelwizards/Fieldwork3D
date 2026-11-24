import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeStainMarkBatch,makeBloodDropletBatch,BLOOD_DROPLET_CAPACITY} from '../src/rendering/breach-blood-preview.ts';
test('V4 shares mixed mark draw, nonblood bypass and bounded styles',()=>{
 const b=makeStainMarkBatch(64);assert.equal(b.mesh.count,0);
 b.setStyle(0,'wood',10,20);b.setStyle(1,'blood',10,20);
 assert.equal(b.style.getX(0),-1);assert.ok(b.style.getX(1)>=0&&b.style.getX(1)<4);
 assert.equal(b.mesh.geometry.attributes.stainStyle,b.style);
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};
 b.mesh.material.onBeforeCompile(shader,null);
 assert.equal(shader.uniforms.fieldworkStainAtlas.value,b.texture);
 assert.match(shader.fragmentShader,/vStainStyle>=0.0/);b.dispose();
});
test('V4 one bounded droplet batch preserves independent opacity, reset and rewind',()=>{
 const g=new THREE.CylinderGeometry(.65,.65,1,6),b=makeBloodDropletBatch(g);
 b.begin();for(let i=0;i<100;i++)b.add(i,4,7,1,i,.2,.5);
 b.finish();assert.equal(b.mesh.count,BLOOD_DROPLET_CAPACITY);
 assert.equal(b.opacity.getX(0),.5);
 b.begin();b.add(1,2,3,0,0,0,.25);b.finish();
 assert.equal(b.mesh.count,1);assert.equal(b.opacity.getX(0),.25);
 const m=new THREE.Matrix4();b.mesh.getMatrixAt(0,m);
 assert.deepEqual(m.elements.slice(12,15),[1,2,3]);b.reset();
 assert.equal(b.mesh.count,0);b.dispose();g.dispose();
});
