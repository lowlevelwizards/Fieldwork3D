import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {readFileSync} from 'node:fs';
const f=(phase,progress)=>({phase,progress,contact:phase!=='swinging',
 position:{x:0,y:0},height:0,worldYaw:0});
const motion=gait=>bodyFromContacts({velocity:65,heading:0,travelYaw:0,
 turning:0,injury:0,posture:'stand',gait,
 feet:[f('planted',0),f('swinging',.5)]});
test('175: physical running has larger coordinated body/weapon response',()=>{
 const walk=motion('walk'),run=motion('run'),pie=motion('pie');
 assert.ok(Math.abs(run.pelvisY)>Math.abs(walk.pelvisY));
 assert.ok(Math.abs(run.chestLift)>Math.abs(walk.chestLift));
 assert.ok(Math.abs(pie.chestLift)<Math.abs(walk.chestLift));
 assert.ok(Math.abs(run.weaponYaw)>Math.abs(walk.weaponYaw));
});
test('175: rigid grip transform includes optional unsighted contact-derived weapon sway',()=>{
 const still=fitWeaponPose({weapon:'carbine',handling:'ready',yaw:0,recoil:0});
 const sway=fitWeaponPose({weapon:'carbine',handling:'ready',yaw:0,
    recoil:0,swayYaw:.02,swayPitch:.012});
 assert.ok(sway.rotation.y!==still.rotation.y||
   sway.rotation.z!==still.rotation.z);
 const a=fitWeaponPose({weapon:'carbine',handling:'ads',yaw:0,recoil:0});
 assert.equal(a.rotation.z,0);
});
test('175: active firing suppresses cosmetic sway instead of steering hidden shots',()=>{
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.match(rig,/p\.firing\?0/);
 assert.match(rig,/swayYaw:motion\.weaponYaw\*freeMotion/);
 assert.match(rig,/motion\.chestLift\*freeMotion/);
});
