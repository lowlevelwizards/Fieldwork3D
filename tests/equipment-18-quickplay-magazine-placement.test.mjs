import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,readRoster,moveRosterMagazine,equipRosterGear,
 applyRosterIdentity} from '../src/breach-roster.ts';
import {newSession,beginReload} from '../src/breach-game.ts';
import {stageMagazines,reloadMagazineDelay} from '../src/equipment-magazine-placement.ts';
import {reserveRounds} from '../src/breach-magazines.ts';

test('quick-play manual pouch choices preserve individual mags through save/deployment',()=>{
 const original=initialRoster(),first=original.members[0].magazines[0].id;
 const changed=moveRosterMagazine(original,'rook',first,'backpack');
 const located=stageMagazines(changed.members[0].magazines,changed.members[0].loadout);
 assert.equal(located[0].id,first);
 assert.equal(located[0].location,'backpack');
 assert.equal(reserveRounds(located),original.members[0].reserve);
 assert.deepEqual(readRoster(JSON.stringify(changed)),changed);
 const s=newSession();applyRosterIdentity(s,changed);
 const actor=s.operators.find(a=>a.id==='rook');
 assert.equal(actor.spareMagazines[0].location,'backpack');
});
test('rig changes reassign only invalid placements and no ammo disappears',()=>{
 let roster=initialRoster();
 const first=roster.members[0].magazines[0].id;
 roster=moveRosterMagazine(roster,'rook',first,'backpack');
 roster=equipRosterGear(roster,'rook','backpack','backpack-none');
 const mags=stageMagazines(roster.members[0].magazines,roster.members[0].loadout);
 assert.notEqual(mags[0].location,'backpack');
 assert.equal(mags[0].id,first);
 assert.equal(reserveRounds(mags),initialRoster().members[0].reserve);
});
test('pouch capacities prevent impossible choices; accessible reloads remain faster',()=>{
 let roster=initialRoster();
 roster=equipRosterGear(roster,'rook','rig','rig-none');
 roster=equipRosterGear(roster,'rook','belt','belt-light');
 roster=equipRosterGear(roster,'rook','backpack','backpack-none');
 const mags=stageMagazines(roster.members[0].magazines,roster.members[0].loadout);
 assert.deepEqual(mags.map(m=>m.location),['belt','pocket','overflow']);
 assert.equal(moveRosterMagazine(roster,'rook',mags[2].id,'belt'),roster);
 assert.equal(moveRosterMagazine(roster,'rook','missing','overflow'),roster);
 assert.ok(reloadMagazineDelay(mags[2])>reloadMagazineDelay(mags[0]));
 const s=newSession();applyRosterIdentity(s,roster);
 const actor=s.operators.find(a=>a.id==='rook');
 actor.magazine=0;
 assert.equal(beginReload(s,actor),true);
 assert.equal(actor.reloadSelectedMagazineId,mags[0].id);
});
