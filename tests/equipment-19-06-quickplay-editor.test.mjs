import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,configureRosterWeapon,readRoster,applyRosterIdentity}
 from '../src/breach-roster.ts';
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {newSession} from '../src/breach-game.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';

test('19.06 every Quick Play selector offers compatible choices and respects slots',()=>{
 const roster=initialRoster();
 for(const m of roster.members){
  for(const slot of WEAPON_ATTACHMENT_SLOTS){
   const available=Object.values(WEAPON_ATTACHMENTS).filter(part=>
    part.slot===slot&&part.compatible.includes(m.weapon));
   assert.ok(available.length>=1);
   for(const item of available){
    const chosen=configureRosterWeapon(roster,m.id,slot,item.id);
    assert.equal(chosen.members.find(p=>p.id===m.id).weaponConfiguration.slots[slot],item.id);
   }
  }
 }
});
test('19.06 editor selections survive save, deployment and geometric muzzle calculation',()=>{
 let roster=initialRoster();
 roster=configureRosterWeapon(roster,'rook','muzzle','muzzle-suppressor');
 roster=configureRosterWeapon(roster,'rook','stock','stock-compact');
 roster=configureRosterWeapon(roster,'rook','optic','optic-reflex');
 const saved=readRoster(JSON.stringify(roster));
 assert.deepEqual(saved,roster);
 const s=newSession();applyRosterIdentity(s,saved);
 const actor=s.operators.find(o=>o.id==='rook');
 const dimensions=resolveWeaponAssembly(actor.weaponConfiguration);
 assert.ok(dimensions.muzzleX>19.5);
 const shot=muzzleAtShot({x:actor.p.x,z:actor.p.y,heading:actor.heading,
  weaponYaw:actor.weaponYaw,weapon:actor.weapon,weaponConfiguration:actor.weaponConfiguration,
  aim:1,velocity:0,recoil:0});
 assert.ok(Number.isFinite(shot.x)&&Number.isFinite(shot.z));
 assert.equal(actor.reserve,roster.members[0].reserve);
});
