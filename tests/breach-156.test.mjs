import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {reloadHandKey} from '../src/breach-reload-motion.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {validateThrow} from '../src/breach-flash.ts';
import {newSession} from '../src/breach-game.ts';

test('156: reload hands interpolate continuously at all phase boundaries',()=>{
  for(const mode of ['emergency','retention','shells']){
    let previous=reloadHandKey(0,mode,4,-1,-1),maximum=0;
    for(let i=1;i<=1000;i++){
      const next=reloadHandKey(i/1000,mode,4,-1,-1);
      maximum=Math.max(maximum,Math.hypot(next.x-previous.x,
        next.y-previous.y,next.z-previous.z));
      previous=next;
    }
    assert.ok(maximum<.6,mode+' contains a visible hand teleport');
    const first=reloadHandKey(0,mode,4,-1,-1);
    const last=reloadHandKey(1,mode,4,-1,-1);
    assert.deepEqual(first,last);
  }
});
const pose=(progress,extra={})=>({
  x:0,z:0,seconds:2,heading:0,velocity:0,stride:0,
  posture:'stand',injury:3,weapon:'carbine',reload:0,
  reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
  down:true,surrender:false,aiming:false,firing:false,turning:0,
  downProgress:progress,deterministic:true,...extra
});
test('156: firearm leaves hands and settles horizontally in world space',()=>{
  const r=createOperatorRig('rook','blue');
  poseOperator(r,pose(.29),0);
  assert.equal(r.weapon.visible,true);
  assert.equal(r.droppedGun.visible,false);
  poseOperator(r,pose(1),0);
  assert.equal(r.weapon.visible,false);
  assert.equal(r.droppedGun.visible,true);
  r.root.updateMatrixWorld(true);
  const axis=new THREE.Vector3(1,0,0)
    .applyQuaternion(r.droppedGun.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(Math.abs(axis.y)<.02,'gun barrel must lie parallel to ground');
  assert.ok(Math.abs(r.droppedGun.getWorldPosition(new THREE.Vector3()).y-1.8)<.01);
  r.dispose();
});
test('156: planted boots remain world grounded throughout the fall',()=>{
  const r=createOperatorRig('rook','blue');
  r.root.position.set(0,0,0);
  for(const t of [.10,.28,.51,.75,1]){
    poseOperator(r,pose(t,{downPose:'forward',seconds:2+t}),1/60);
    r.root.updateMatrixWorld(true);
    for(const foot of r.feet){
      const sole=foot.shoe.getWorldPosition(new THREE.Vector3());
      assert.ok(Math.abs(sole.y-1.45)<.08,
        'world-space boot height shifted during body rotation at '+t+
        ': '+sole.y);
    }
  }
  r.dispose();
});
test('156: surrender kneels and raises both hands while dropping weapon',()=>{
  const r=createOperatorRig('rook','red');
  poseOperator(r,pose(1,{surrender:true,downPose:'slump'}),0);
  assert.ok(r.hip.position.y<14,'knees should visibly buckle');
  assert.ok(r.arms.every(a=>a.hand.position.y>9),
    'both hands should rise above the shoulders');
  assert.equal(r.droppedGun.visible,true);
  r.dispose();
});
test('156: simple closed-door flash is not allowed through wall',()=>{
  const s=newSession();
  const from={x:300,y:565},target={x:300,y:490};
  assert.equal(validateThrow(from,target,s.doors).valid,false);
  assert.equal(validateThrow(from,target,s.doors,['FRONT']).valid,true);
});
test('156: target cancellation and flash are accessible from contextual planning',()=>{
  for(const file of ['../index.html','../breach.html']){
    const html=readFileSync(new URL(file,import.meta.url),'utf8');
    assert.match(html,/id="cancelTarget"/);
  }
  const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  assert.match(main,/case 'ctxFlash'/);
  assert.match(main,/cancelTargeting/);
  assert.match(main,/p\.mode==='route'/);
});
test('156: door samples are recorded as continuous fractions',()=>{
  const code=readFileSync(new URL('../src/breach-replay-motion.ts',import.meta.url),'utf8');
  assert.match(code,/fraction:number/);
  assert.match(code,/b\.fraction-a\.fraction/);
});
