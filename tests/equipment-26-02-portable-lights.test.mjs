import test from 'node:test';import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {initialWeaponConfiguration,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
import {activeWeaponLightSources} from '../src/equipment-portable-light-sources.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {weaponLightEmitter} from '../src/equipment-weapon-light-beam.ts';
test('26.02 only physically mounted and enabled live weapon lights emit',()=>{
 const s=newSession(),a=s.operators.find(a=>a.id==='rook');
 assert.equal(activeWeaponLightSources(s.operators,s.doors).length,0);
 a.weaponConfiguration=setWeaponAttachment(initialWeaponConfiguration(a.weapon),
  'light','light-compact');
 a.weaponLightOn=true;
 const found=activeWeaponLightSources(s.operators,s.doors);
 assert.equal(found.length,1);
 assert.equal(found[0].id,'weapon:rook');
 a.weaponLightOn=false;
 assert.equal(activeWeaponLightSources(s.operators,s.doors).length,0);
 a.weaponLightOn=true;a.health=0;
 assert.equal(activeWeaponLightSources(s.operators,s.doors).length,0);
});
test('26.02 source matches clearance-retracted muzzle and rail, including replay choices',()=>{
 const s=newSession(),a=s.operators.find(a=>a.id==='rook');
 a.weaponConfiguration=setWeaponAttachment(initialWeaponConfiguration(a.weapon),
  'light','light-compact');
 a.weaponLightOn=true;
 a.p={x:210,y:300};a.heading=.3;a.weaponYaw=.32;a.aim=.8;
 const sources=activeWeaponLightSources(s.operators,s.doors);
 const clearance=weaponClearance({x:a.p.x,z:a.p.y,heading:a.heading,
  weaponYaw:a.weaponYaw,weapon:a.weapon,
  weaponConfiguration:a.weaponConfiguration,aim:a.aim,
  velocity:a.velocity,recoil:a.recoil,posture:a.posture},s.doors);
 const emitter=weaponLightEmitter(clearance.muzzle,a.weaponConfiguration);
 assert.deepEqual(sources[0].p,emitter);
 assert.ok(Math.abs(sources[0].heading-clearance.muzzle.yaw)<1e-9);
});
