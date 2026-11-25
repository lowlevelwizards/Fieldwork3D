import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {secondaryMuzzleAtShot} from '../src/secondary-shot-geometry.ts';
import {glockArtSockets}
 from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {GLOCK_9MM_WEAPON,GLOCK_9MM_BALLISTICS}
 from '../src/secondary-ballistics.ts';
import {WEAPONS} from '../src/breach-combat.ts';
const src=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const model='glock-g19x',pose={x:0,z:0,heading:0,weaponYaw:0,
 aim:1,velocity:0,weapon:'carbine',secondaryWeapon:model,
 recoil:0,posture:'stand',coverStanceDrop:0};
test('S7: shot muzzle uses the one Glock geometry socket and authored hand pose',()=>{
 const direct=secondaryMuzzleAtShot({...pose,weapon:model});
 const shared=muzzleAtShot(pose);
 assert.deepEqual(shared,direct);
 const art=glockArtSockets(model);
 assert.ok(art.muzzle.x>art.holsterPivot.x);
 assert.ok(shared.x>13,'actual muzzle sits beyond the pistol grip');
 assert.ok(Number.isFinite(shared.y)&&Number.isFinite(shared.z));
 const turned=muzzleAtShot({...pose,weaponYaw:Math.PI/2});
 assert.ok(turned.z>4&&turned.x>8,
  'aim turns the barrel, but the firing wrist stays on the actual torso');
 assert.ok(Math.abs(turned.yaw-Math.PI/2)<1e-8);
 const bodyOnly=muzzleAtShot({...pose,heading:Math.PI/2,weaponYaw:0});
 assert.ok(Math.abs(bodyOnly.x-shared.x)>2,
  'operator heading controls the anatomical hand placement');
 assert.equal(bodyOnly.yaw,0,
  'turning the body does not change the independently aimed bullet yaw');
 // An unequipped/missing secondary never silently changes primary geometry.
 const rifle=muzzleAtShot({...pose,secondaryWeapon:undefined});
 assert.notDeepEqual(rifle,shared);
});
test('S7: held pistol is vetoed by the same cover/wall near-muzzle lane',()=>{
 const open=weaponClearance(pose,[],[],[]);
 assert.equal(open.blocked,false);
 assert.equal(open.blocker,'clear');
 const obstacle={a:{x:6,y:-40},b:{x:6,y:40}};
 const blocked=weaponClearance(pose,[],[],[obstacle]);
 assert.equal(blocked.blocked,true);
 assert.notEqual(blocked.blocker,'clear');
 assert.deepEqual(blocked.muzzle,open.muzzle,
  'blocking a shot does not artificially move the muzzle through the wall');
});
test('S7: 9mm stats do not mutate any of the four primary weapon definitions',()=>{
 assert.equal(GLOCK_9MM_WEAPON.label,'GLOCK 9MM');
 assert.ok(GLOCK_9MM_WEAPON.optimalRange<WEAPONS.carbine.optimalRange);
 assert.ok(GLOCK_9MM_WEAPON.interval>0);
 assert.ok(GLOCK_9MM_BALLISTICS.recoilKick>0);
 assert.equal(WEAPONS.smg.label,'SMG');
});
test('S7: shared combat resolver owns exact-round ignition and event identity',()=>{
 const pipeline=src('breach-firing-pipeline.ts');
 const resolver=src('breach-shot-resolution.ts');
 assert.match(pipeline,/sidearmKit.*a\.side==='blue'/s);
 assert.match(pipeline,/GLOCK_9MM_WEAPON/);
 assert.match(pipeline,/commitShot\(s,a,target,\{mode,range,moving,mods,weapon,profile,/);
 assert.match(resolver,/a\.equipment=\{\.\.\.a\.equipment!,secondary:.*loadedRounds:pistol!\.loadedRounds-1/s);
 assert.match(resolver,/weapon:secondaryWeapon\?\?a\.weapon,secondaryWeapon/);
 for(const inherited of ['nearShotLane','observedCivilianFireLane',
  'assessFriendlyLane','strikeSurface','resolveArmorImpact',
  'recordCivilianHarm','registerWound','s.shots.push','emitSpentCasing(s,a,shotId,muzzle,secondaryWeapon)'])
  assert.ok(resolver.includes(inherited),inherited+' must remain shared');
 const emitter=src('breach-casing-emission.ts');
 assert.match(emitter,/secondaryWeapon\?\{secondaryWeapon\}/);
 assert.match(emitter,/s\.casings\.push\(casing\)/);
 assert.ok(!src('secondary-shot-geometry.ts').includes('Math.random'));
});
