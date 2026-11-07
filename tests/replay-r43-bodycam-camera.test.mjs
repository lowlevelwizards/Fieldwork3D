import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig} from '../src/breach-operator-rig.ts';
import {sampleBodycamSocket,applyBodycamCamera,bodycamFieldOfView}
  from '../src/breach-replay-bodycam.ts';
const approx=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,
  `Expected ${a} ≈ ${b}`);

test('camera inherits posed chest translation and local +X forward',()=>{
  const root=new THREE.Group(),chest=new THREE.Group(),socket=new THREE.Object3D();
  root.position.set(20,0,30);
  root.rotation.y=Math.PI/2;
  chest.position.set(0,26,0);socket.position.set(9.5,1.4,0);
  root.add(chest);chest.add(socket);
  const sample=sampleBodycamSocket(socket,'balanced');
  approx(sample.position.y,27.4);
  approx(sample.position.z,20.5);
  approx(sample.forward.x,0);
  approx(sample.forward.z,-1);
  approx(sample.up.length(),1);
});
test('stepped historical seek remains identical without temporal smoothing',()=>{
  const chest=new THREE.Object3D(),helmet=new THREE.Object3D();
  chest.position.set(9.5,26,0);helmet.position.set(8.5,42,0);
  const before=sampleBodycamSocket(chest,'balanced');
  chest.position.y=18;
  sampleBodycamSocket(chest,'natural');
  chest.position.y=26;
  const again=sampleBodycamSocket(chest,'balanced');
  approx(before.position.distanceTo(again.position),0);
  approx(before.forward.distanceTo(again.forward),0);
  assert.ok(sampleBodycamSocket(helmet,'steady').position.y>
    before.position.y);
});
test('perspective projection has clamped lens and valid world orientation',()=>{
  const socket=new THREE.Object3D();
  socket.position.set(10,26,0);
  const cam=new THREE.PerspectiveCamera(70,1,.8,1800);
  const sample=sampleBodycamSocket(socket,'steady');
  applyBodycamCamera(cam,sample,999,2);
  assert.equal(cam.fov,110);assert.equal(cam.aspect,2);
  approx(cam.position.x,10);
  const renderedForward=new THREE.Vector3();
  cam.getWorldDirection(renderedForward);
  assert.ok(renderedForward.dot(sample.forward)>.999);
  assert.equal(bodycamFieldOfView(NaN),95);
  assert.equal(bodycamFieldOfView(30),70);
  applyBodycamCamera(cam,sample,95,-1);
  assert.equal(cam.aspect,1);
});
test('camera stays finite in vertical downed-body posture',()=>{
  const socket=new THREE.Object3D();
  socket.rotation.z=Math.PI/2;
  const sample=sampleBodycamSocket(socket,'balanced');
  const cam=new THREE.PerspectiveCamera();
  applyBodycamCamera(cam,sample,95,1);
  for(const n of [...cam.position.toArray(),...cam.quaternion.toArray(),
    ...sample.up.toArray()])assert.ok(Number.isFinite(n));
  approx(sample.up.dot(sample.forward),0);
});

test('actual operator rig exposes invisible chest and helmet anchors',()=>{
  const rig=createOperatorRig('rook','blue',true);
  assert.equal(rig.bodycamChest.parent,rig.chest);
  assert.equal(rig.bodycamHelmet.parent,rig.head);
  assert.equal(rig.bodycamChest.children.length,0);
  assert.equal(rig.bodycamHelmet.children.length,0);
  rig.root.updateMatrixWorld(true);
  const chest=sampleBodycamSocket(rig.bodycamChest,'balanced');
  const helmet=sampleBodycamSocket(rig.bodycamHelmet,'balanced');
  assert.ok(helmet.position.y>chest.position.y,
    'Helmet mount must sit above the chest camera');
  assert.ok(chest.position.y>15,
    'Camera must be attached to torso, not ground/root origin');
});
