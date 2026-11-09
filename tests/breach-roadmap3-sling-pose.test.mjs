import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {updateOperatorSlingPose} from '../src/breach-operator-sling-pose.ts';
function rig(){
 const root=new THREE.Group(),chest=new THREE.Group(),weapon=new THREE.Group(),
  droppedGun=new THREE.Group();
 root.add(chest);chest.add(weapon);
 const slingStraps=Array.from({length:3},()=>new THREE.Group());
 slingStraps.forEach(x=>chest.add(x));
 return {root,chest,weapon,droppedGun,slingStraps};
}
const p=(on=true)=>({weaponConfiguration:{slots:{sling:on?'sling-two-point':'none'}},
 surrender:false,stride:.3});
const vertical=new THREE.Vector3(0,1,0),delta=new THREE.Vector3();
test('sling finalization follows the solved weapon without moving it',()=>{
 const r=rig(),before=r.weapon.position.clone();
 r.weapon.position.set(8,2,-1);
 const copy=r.weapon.position.clone();
 updateOperatorSlingPose(r,p(),40,vertical,delta);
 assert.ok(r.slingStraps.every(mesh=>mesh.visible));
 assert.ok(r.slingStraps.every(mesh=>
  Number.isFinite(mesh.position.x)&&Number.isFinite(mesh.scale.y)));
 assert.ok(r.slingStraps.every(mesh=>mesh.scale.y>0));
 assert.deepEqual(r.weapon.position,copy);
 updateOperatorSlingPose(r,p(),40,vertical,delta);
 assert.ok(r.slingStraps.every(mesh=>mesh.visible));
});
test('unslung and surrendered operators have no visible strap segments',()=>{
 const r=rig();
 updateOperatorSlingPose(r,p(),30,vertical,delta);
 updateOperatorSlingPose(r,p(false),30,vertical,delta);
 assert.ok(r.slingStraps.every(mesh=>!mesh.visible));
 updateOperatorSlingPose(r,{...p(),surrender:true},30,vertical,delta);
 assert.ok(r.slingStraps.every(mesh=>!mesh.visible));
});
test('dropped sling follows actual transformed gun and does not mutate its source',()=>{
 const r=rig();r.droppedGun.visible=true;r.root.add(r.droppedGun);
 r.droppedGun.position.set(8,6,12);
 const initial=r.droppedGun.position.clone();
 updateOperatorSlingPose(r,p(),0,vertical,delta);
 assert.ok(r.slingStraps.every(mesh=>mesh.visible));
 assert.deepEqual(r.droppedGun.position,initial);
});
