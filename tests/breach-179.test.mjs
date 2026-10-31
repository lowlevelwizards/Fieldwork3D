import test from 'node:test';
import assert from 'node:assert/strict';
import {probeWeaponClearance} from '../src/breach-weapon-clearance.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {advanceFootsteps,createFootstepScheduler}
  from '../src/breach-footsteps.ts';
import {readFileSync} from 'node:fs';
test('179: physical barrel envelope reports clear, soft and hard blockage',()=>{
 const origin={x:0,y:0},yaw=0,length=32;
 const open=probeWeaponClearance({origin,yaw,length,isClear:()=>true});
 assert.equal(open.obstruction,false);assert.equal(open.retract,0);
 const blocked=probeWeaponClearance({origin,yaw,length,
   isClear:(a,b)=>b.x<14});
 assert.equal(blocked.obstruction,true);
 assert.ok(blocked.retract>.5);
 assert.equal(blocked.needsCorrection,true);
 assert.ok(blocked.fraction<.5);
});
test('179: short-stock physically retracts along its rigid gun transform',()=>{
 const a=fitWeaponPose({weapon:'carbine',handling:'short',yaw:0,recoil:0});
 const b=fitWeaponPose({weapon:'carbine',handling:'short',yaw:0,recoil:0,
   retract:.8});
 assert.ok(b.stock.x<a.stock.x-1);
 assert.ok(b.primary.x<a.primary.x-1);
 const ready=fitWeaponPose({weapon:'carbine',handling:'ready',yaw:0,
   recoil:0,retract:1});
 const baseline=fitWeaponPose({weapon:'carbine',handling:'ready',yaw:0,recoil:0});
 assert.ok(ready.stock.distanceTo(baseline.stock)<1e-8);
});
test('179: minor clearance correction uses sole scheduler without motor motion',()=>{
 const state=createFootstepScheduler();
 const mk=(time)=>({time,position:{x:10,y:10},
  rootYaw:0,facingYaw:0,travelYaw:0,speed:0,turning:0,
  posture:'stand',injury:0,down:false,clearance:true});
 advanceFootsteps(state,mk(0));
 for(let i=1;i<90;i++)advanceFootsteps(state,mk(i/60));
 assert.equal(state.resets,1);
 assert.ok(state.feet.every(f=>Number.isFinite(f.plantedAt.x)));
});
test('179: clearance uses barrel direction not only character heading',()=>{
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(scene,/probeWeaponClearance\(/);
 assert.match(scene,/yaw:barrel.yaw/);
 assert.match(scene,/clearanceAmount:clearance.retract/);
 assert.doesNotMatch(scene,/obstruction:!isClear\(actor.p/);
});
