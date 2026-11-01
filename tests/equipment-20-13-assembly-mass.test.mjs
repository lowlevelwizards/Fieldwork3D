import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice,totalEquipmentMass,
 loadMovementScale,loadMobilityDescription} from '../src/equipment-loadouts.ts';
import {initialWeaponConfiguration,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {initialRoster,configureRosterWeapon,applyRosterIdentity} from '../src/breach-roster.ts';
import {newSession} from '../src/breach-game.ts';

test('20.13 attached optics and suppressors contribute exact extra load',()=>{
 const kit=initialEquipmentLoadout('carbine');
 const base=initialWeaponConfiguration('carbine');
 let configured=setWeaponAttachment(base,'muzzle','muzzle-suppressor');
 configured=setWeaponAttachment(configured,'optic','optic-reflex');
 const oldMass=totalEquipmentMass(kit);
 assert.equal(totalEquipmentMass(kit,base),oldMass);
 assert.ok(Math.abs(totalEquipmentMass(kit,configured)-oldMass-.64)<1e-9);
 assert.equal(totalEquipmentMass(kit,configured),totalEquipmentMass(kit,configured));
});
test('20.13 heavier assembled weapon slightly lowers movement in loaded carrier kit',()=>{
 let kit=initialEquipmentLoadout('carbine');
 kit=setEquipmentChoice(kit,'armor','armor-carrier');
 kit=setEquipmentChoice(kit,'backpack','backpack-field');
 const base=initialWeaponConfiguration('carbine');
 const heavy=setWeaponAttachment(base,'muzzle','muzzle-suppressor');
 assert.ok(totalEquipmentMass(kit,base)>10);
 assert.ok(loadMovementScale(kit,heavy)<loadMovementScale(kit,base));
 assert.ok(loadMovementScale(kit,heavy)>=.72);
 assert.ok(['LIGHT','STANDARD','HEAVY','OVERLOADED'].includes(
  loadMobilityDescription(kit,heavy)));
});
test('20.13 deployed operators use configured load and no unmounted mass',()=>{
 let roster=initialRoster();
 roster=configureRosterWeapon(roster,'rook','muzzle','muzzle-suppressor');
 const s=newSession();applyRosterIdentity(s,roster);
 const actor=s.operators.find(a=>a.id==='rook');
 assert.ok(actor);
 assert.equal(actor.loadMovementScale,
  loadMovementScale(roster.members[0].loadout,roster.members[0].weaponConfiguration));
 assert.equal(loadMovementScale(roster.members[0].loadout),
  loadMovementScale(roster.members[0].loadout));
});
