import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,setWeaponAttachment,sameWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';

test('20.10 replay-equivalent weapon snapshots do not require model rebuild',()=>{
 const original=setWeaponAttachment(initialWeaponConfiguration('carbine'),
  'muzzle','muzzle-suppressor');
 const replay=JSON.parse(JSON.stringify(original));
 assert.notEqual(replay,original);
 assert.equal(sameWeaponConfiguration(original,replay),true);
 assert.equal(sameWeaponConfiguration(original,
  setWeaponAttachment(replay,'optic','optic-reflex')),false);
 assert.equal(sameWeaponConfiguration(undefined,undefined),true);
});
test('20.10 extended muzzle meets wall before bare muzzle without moving actor',()=>{
 const input={x:90,z:70,heading:0,weaponYaw:0,weapon:'carbine',
  aim:1,velocity:0,recoil:0,posture:'stand'};
 const bare=initialWeaponConfiguration('carbine');
 const long=setWeaponAttachment(bare,'muzzle','muzzle-suppressor');
 const a=muzzleAtShot({...input,weaponConfiguration:bare});
 const b=muzzleAtShot({...input,weaponConfiguration:long});
 const wallX=(a.x+b.x)/2;
 assert.ok(wallX>input.x&&wallX<a.x+10);
 const wall={a:{x:wallX,y:0},b:{x:wallX,y:140}};
 const noCover=[],doors=[];
 const bareResult=weaponClearance({...input,weaponConfiguration:bare},
  doors,noCover,[wall]);
 const longResult=weaponClearance({...input,weaponConfiguration:long},
  doors,noCover,[wall]);
 assert.equal(bareResult.obstruction,false);
 assert.equal(bareResult.blocked,false);
 assert.equal(longResult.obstruction,true);
 // No operator collision response; shot origin only changes with rigid weapon.
 assert.deepEqual(input,{x:90,z:70,heading:0,weaponYaw:0,weapon:'carbine',
  aim:1,velocity:0,recoil:0,posture:'stand'});
 assert.ok(longResult.retraction>=0&&longResult.retraction<=3.4);
});
