import test from 'node:test';
import assert from 'node:assert/strict';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {assessFireLane} from '../src/breach-fire-safety.ts';
import {CASING_LIMIT,IMPACT_MARK_LIMIT,BLOOD_MARK_LIMIT,casingAt}
  from '../src/breach-effects.ts';

const angleError=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
test('combat firearm must not clamp its physical yaw when torso lags',()=>{
 for(const yaw of [-2.4,-1.75,1.8,2.55]){
  const fit=fitWeaponPose({weapon:'carbine',handling:'ads',
    yaw,recoil:0,aimBlend:1});
  assert.ok(angleError(fit.rotation.y,yaw)<.001,
    'a firing weapon must follow the exact aim direction');
  const muzzle=muzzleAtShot({x:300,z:300,heading:0,weaponYaw:-yaw,
    weapon:'carbine',aim:1,velocity:0,recoil:0});
  assert.ok(angleError(muzzle.yaw,-yaw)<.05,
    'shot-time muzzle follows the same rigid gun orientation');
 }
});
test('unobstructed high shot crosses physical low window sill',()=>{
 const sill={x:100,y:100,w:52,h:10,low:true,fixture:'window-sill'};
 const lane=assessFireLane({x:100,y:145},26,{x:100,y:55},
   26,[sill],[],[]);
 assert.equal(lane.blocker,'clear');
 const low=assessFireLane({x:100,y:145},8,{x:100,y:55},
   8,[sill],[],[]);
 assert.equal(low.blocker,'cover');
});
test('persistent gunfire effects have independent bounded budgets',()=>{
 assert.equal(CASING_LIMIT,96);
 assert.equal(IMPACT_MARK_LIMIT,64);
 assert.equal(BLOOD_MARK_LIMIT,24);
 assert.ok(BLOOD_MARK_LIMIT<IMPACT_MARK_LIMIT);
 const casing={id:7,at:0,weapon:'carbine',side:'blue',
   x:100,z:100,y:22,heading:0};
 const settled=casingAt(casing,2);
 assert.equal(settled.settled,true);
 assert.deepEqual(casingAt(casing,2),casingAt(casing,24),
   'settled casing transform remains deterministic and static');
});
