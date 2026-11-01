import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,setWeaponAttachment,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {weaponGrips,fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {initialRoster,configureRosterWeapon,applyRosterIdentity} from '../src/breach-roster.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

test('19.05 fitted muzzle position changes in exactly the visual barrel direction',()=>{
 let config=initialWeaponConfiguration('carbine');
 const from={x:35,z:18,heading:0,weaponYaw:0,weapon:'carbine',aim:1,velocity:0,recoil:0,posture:'stand'};
 const before=muzzleAtShot({...from,weaponConfiguration:config});
 config=setWeaponAttachment(config,'muzzle','muzzle-suppressor');
 const after=muzzleAtShot({...from,weaponConfiguration:config});
 const tipDelta=resolveWeaponAssembly(config).muzzleX-19.5;
 const scale=resolveWeaponAssembly(config).lengthScale;
 assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>tipDelta*scale*.85);
 assert.ok(Math.abs(Math.hypot(after.x-before.x,after.z-before.z)-tipDelta*scale)<.07);
 assert.deepEqual(muzzleAtShot({...from,weaponConfiguration:config}),after);
});
test('19.05 configured grips and shoulder fit reflect stock and fore-end choices',()=>{
 let config=initialWeaponConfiguration('carbine');
 const original=weaponGrips('carbine');
 config=setWeaponAttachment(config,'stock','stock-compact');
 config=setWeaponAttachment(config,'foregrip','foregrip-handstop');
 const custom=weaponGrips('carbine',config);
 assert.ok(custom.stockX>original.stockX);
 assert.ok(custom.supportX>original.supportX);
 const fit=fitWeaponPose({weapon:'carbine',handling:'ready',yaw:0,recoil:0,configuration:config});
 assert.ok(Number.isFinite(fit.stockError));
 assert.ok(Number.isFinite(fit.contactError));
});
test('19.05 active actors receive configurations, snapshots preserve them',()=>{
 let roster=initialRoster();
 roster=configureRosterWeapon(roster,'rook','muzzle','muzzle-suppressor');
 const s=newSession();applyRosterIdentity(s,roster);
 const actor=s.operators.find(o=>o.id==='rook');
 assert.equal(actor.weaponConfiguration.slots.muzzle,'muzzle-suppressor');
 const frame=snapshot(s);
 const recorded=frame.actors.find(o=>o.id==='rook');
 assert.equal(recorded.weaponConfiguration.slots.muzzle,'muzzle-suppressor');
 actor.weaponConfiguration=initialWeaponConfiguration('carbine');
 assert.equal(recorded.weaponConfiguration.slots.muzzle,'muzzle-suppressor');
});
