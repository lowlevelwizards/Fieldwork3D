import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorPoseCavity,updateOperatorPoseCavity,
 armCavityStrength,thighCavityStrength}
 from '../src/operator-pose-cavity-lighting.ts';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';

test('R5.5 upper-arm opening releases underarm shadow',()=>{
 const rest=armCavityStrength(-.9,.5),
  open=armCavityStrength(.7,7.3);
 assert.ok(rest>.85&&open<.15);
 assert.ok(armCavityStrength(-.9,.5,true)<rest*.3);
 assert.ok(thighCavityStrength(true,0)>thighCavityStrength(false,0));
});
test('R5.5 per-rig shader uniforms change, UV and IK bounds do not',()=>{
 const source=new THREE.MeshStandardMaterial({color:0x879583});
 const pants=source.clone();
 const body=new THREE.Mesh(new THREE.BoxGeometry(6,12,12),source);
 const a=new THREE.Mesh(new THREE.BoxGeometry(4,1,4),pants),
  b=new THREE.Mesh(new THREE.BoxGeometry(4,1,4),pants);
 const originalUv=Array.from(body.geometry.getAttribute('uv').array);
 const state=createOperatorPoseCavity(body,[a,b],source,pants);
 assert.notEqual(body.material,source);
 assert.notEqual(a.material,b.material);
 const arm={upper:new THREE.Mesh(new THREE.BoxGeometry(1,1,1),source)};
 updateOperatorPoseCavity(state,[arm,arm],[0,0],'stand',0,false);
 const before=state.torso.value.x;
 arm.upper.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),-1.6);
 updateOperatorPoseCavity(state,[arm,arm],[8,8],'crouch',.25,false);
 assert.ok(state.torso.value.x<before);
 assert.ok(state.thighs[0].value.x>thighCavityStrength(false,0));
 source.color.setHex(0x273a45);
 updateOperatorPoseCavity(state,[arm,arm],[8,8],'stand',0,false);
 assert.ok(state.torso.material.color.equals(source.color));
 assert.deepEqual(Array.from(body.geometry.getAttribute('uv').array),originalUv);
 for(const mesh of [body,a,b]){mesh.geometry.dispose();mesh.material.dispose();}
 source.dispose();pants.dispose();arm.upper.geometry.dispose();
});
test('R5.5 real operator does not rewrite geometry during pose',()=>{
 const rig=createOperatorRig('rook','blue',true);
 const geometry=rig.visualKit.baseTorso.geometry;
 const before=Array.from(geometry.getAttribute('position').array);
 const p={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',
  reload:0,reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
  down:false,surrender:false,aiming:false,firing:false,turning:0,
  deterministic:true,unarmedPreview:true};
 poseOperator(rig,p,0);
 poseOperator(rig,{...p,seconds:.1,posture:'crouch',stride:.25},0);
 assert.deepEqual(Array.from(geometry.getAttribute('position').array),before);
 assert.ok(rig.poseCavity.torso.value.x>=0&&
  rig.poseCavity.torso.value.x<=1);
 rig.dispose();
});
