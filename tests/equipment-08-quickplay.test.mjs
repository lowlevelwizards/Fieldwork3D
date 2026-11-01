import test from 'node:test';
import assert from 'node:assert/strict';
import {readRoster,initialRoster,equipRosterGear,equipRoster,
 renameRosterMember,cycleRosterAppearance,applyRosterIdentity} from '../src/breach-roster.ts';
import {newSession} from '../src/breach-game.ts';

test('older quick-play saves migrate to equipment-enabled version 1',()=>{
 const initial=initialRoster();
 const legacy=JSON.parse(JSON.stringify(initial));
 for(const m of legacy.members){delete m.loadout;delete m.appearanceSeed;}
 const migrated=readRoster(JSON.stringify(legacy));
 assert.equal(migrated.members[0].loadout.slots.primary,'primary-carbine');
 assert.equal(migrated.members[1].loadout.slots.primary,'primary-smg');
 assert.deepEqual(readRoster(JSON.stringify(migrated)),migrated);
});
test('quick-play kit selection is soldier-specific and combat deployment sees it',()=>{
 const roster=initialRoster();
 const next=equipRosterGear(roster,'rook','backpack','backpack-field');
 assert.equal(next.members[0].loadout.slots.backpack,'backpack-field');
 assert.equal(roster.members[0].loadout.slots.backpack,'backpack-day');
 assert.equal(next.members[1].loadout.slots.backpack,'backpack-day');
 assert.equal(equipRosterGear(roster,'rook','backpack','armor-soft'),roster);
 const s=newSession();
 applyRosterIdentity(s,next);
 const rook=s.operators.find(a=>a.id==='rook');
 assert.equal(rook.equipment.slots.backpack,'backpack-field');
 assert.ok(rook.loadMovementScale>0&&rook.loadMovementScale<=1);
});
test('quick-play identity and weapons preserve their equipment consistency',()=>{
 let roster=initialRoster();
 roster=renameRosterMember(roster,'rook','HAWK');
 assert.equal(roster.members[0].callsign,'HAWK');
 roster=cycleRosterAppearance(roster,'rook');
 assert.notEqual(roster.members[0].appearanceSeed,initialRoster().members[0].appearanceSeed);
 roster=equipRoster(roster,'rook','shotgun');
 assert.equal(roster.members[0].loadout.slots.primary,'primary-shotgun');
});
