import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS} from '../src/breach-combat.ts';
import {BALLISTICS,readyMode,dispersion} from '../src/breach-ballistics.ts';
import {GRIPS,handlingPose} from '../src/breach-weapon-pose.ts';
import {MUZZLE_TIP,muzzleAtShot} from '../src/breach-muzzle.ts';

const weapons=['carbine','smg','rifle','shotgun'];
test('19.00 baseline firearms share authored IDs and bounded physical grips',()=>{
 assert.deepEqual(Object.keys(WEAPONS),weapons);
 for(const id of weapons){
  assert.ok(BALLISTICS[id].turnSpeed>0);
  assert.ok(GRIPS[id].lengthScale>.5&&GRIPS[id].lengthScale<1.5);
  assert.ok(GRIPS[id].stockX<GRIPS[id].primaryX);
  assert.ok(GRIPS[id].supportX>GRIPS[id].stockX);
  assert.ok(WEAPONS[id].acquisition>0);
  assert.ok(dispersion(id,'ads',1,false,0,0,0)>0);
 }
 assert.equal(MUZZLE_TIP,19.5);
});
test('19.00 repeatable shot-time muzzle and obstruction posture baseline',()=>{
 const input={x:30,z:40,heading:0,weaponYaw:0,weapon:'rifle',aim:1,velocity:0,recoil:0,posture:'stand'};
 assert.deepEqual(muzzleAtShot(input),muzzleAtShot({...input}));
 assert.equal(handlingPose({aim:0,moving:0,obstruction:true,friendlyNear:false,weapon:'rifle'}),'short');
 assert.equal(readyMode(30,0,'carbine'),null);
});
