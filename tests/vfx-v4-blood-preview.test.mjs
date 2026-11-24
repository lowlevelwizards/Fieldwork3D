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

test('V5 mixed material and blood share one bounded instance mesh with independent tint',()=>{
 const g=new THREE.CylinderGeometry(.65,.65,1,6),b=makeBloodDropletBatch(g,140);
 b.begin();b.add(1,2,3,0,0,0,.5);
 b.addMaterial({x:4,y:5,z:6,pitch:0,yaw:1,roll:2,width:.2,length:3,opacity:.3,color:0xffd298});
 b.finish();assert.equal(b.mesh.count,2);
 const c=new THREE.Color();b.mesh.getColorAt(0,c);assert.equal(c.getHex(),0xa65a4e);
 b.mesh.getColorAt(1,c);assert.equal(c.getHex(),0xffd298);
 assert.ok(Math.abs(b.opacity.getX(1)-.3)<1e-6);
 b.begin();for(let i=0;i<200;i++)b.add(1,2,3,0,0,0,.5);
 b.finish();assert.equal(b.mesh.count,140);
 b.reset();assert.equal(b.mesh.count,0);b.dispose();g.dispose();
});

test('V10 unchanged mixed particles skip uploads across paused frames',()=>{
 const g=new THREE.CylinderGeometry(.65,.65,1,6),b=makeBloodDropletBatch(g,140);
 const frame=age=>{b.begin();b.add(1,2,3,0,0,age,.5);b.finish();return b.mesh.instanceMatrix.version;};
 const first=frame(.1);assert.equal(frame(.1),first);
 assert.equal(frame(.2),first+1);assert.equal(frame(.1),first+2);
 b.reset();assert.equal(frame(.1),first+3);b.dispose();g.dispose();
});

test('V10 tracer and impact pulse batches preserve scalar pose, tint, capacity and reset',()=>{
 const g=new THREE.IcosahedronGeometry(1,1),b=makeBloodDropletBatch(g,20,'shot-pulse-batch');
 b.begin();for(let i=0;i<25;i++)b.addPose(i,3,4,0,0,0,2,2,.5,0xffd697);b.finish();
 assert.equal(b.mesh.count,20);assert.equal(b.mesh.userData.fieldworkDrawFamily,'shot-pulse-batch');
 const m=new THREE.Matrix4();b.mesh.getMatrixAt(0,m);
 assert.deepEqual(m.elements.slice(12,15),[0,3,4]);assert.equal(m.elements[0],2);
 assert.equal(b.opacity.getX(0),.5);
 b.reset();assert.equal(b.mesh.count,0);b.dispose();g.dispose();
});
