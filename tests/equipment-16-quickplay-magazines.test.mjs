import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,readRoster,applyRosterIdentity,recordRosterMission,
 resupplyRoster,equipRoster,equipRosterGear,renameRosterMember,
 freshQuickPlayRoster,serializeQuickPlayCosmetics} from '../src/breach-roster.ts';
import {newSession} from '../src/breach-game.ts';
import {reserveRounds} from '../src/breach-magazines.ts';
import {WEAPONS} from '../src/breach-combat.ts';

test('legacy Quick Play roster gains independent magazines without gaining ammunition',()=>{
 const base=initialRoster();
 assert.deepEqual(readRoster(JSON.stringify(base)),base);
 const old=JSON.parse(JSON.stringify(base));
 for(const soldier of old.members){delete soldier.magazines;delete soldier.loadedMagazineId;}
 const migrated=readRoster(JSON.stringify(old));
 for(const member of migrated.members){
  assert.equal(reserveRounds(member.magazines),member.weapon==='shotgun'?0:member.reserve);
  assert.equal(member.loadedMagazineId,member.id+'/'+member.weapon+'/loaded');
 }
});
test('Quick Play discards wounds, spent magazines and equipment at round boundaries',()=>{
 let roster=initialRoster();
 roster=renameRosterMember(roster,'rook','HAWK');
 roster=equipRoster(roster,'rook','rifle');
 roster=equipRosterGear(roster,'rook','backpack','backpack-field');
 const session=newSession();applyRosterIdentity(session,roster);
 const actor=session.operators.find(a=>a.id==='rook');
 actor.health=1;actor.injuryStage=2;
 actor.magazine=3;actor.reserve=5;
 actor.spareMagazines[0].rounds=2;
 actor.insertedMagazineId='rook/rifle/depleted';
 const completed=recordRosterMission(session,roster);
 assert.equal(completed.members[0].injuries,2);
 const next=freshQuickPlayRoster(completed);
 const initial=initialRoster().members[0];
 const member=next.members[0];
 assert.equal(member.callsign,'HAWK');
 assert.equal(member.weapon,initial.weapon);
 assert.deepEqual(member.loadout,initial.loadout);
 assert.deepEqual(member.weaponConfiguration,initial.weaponConfiguration);
 assert.equal(member.injuries,0);
 assert.equal(member.recovery,0);
 assert.equal(member.magazine,initial.magazine);
 assert.equal(member.reserve,initial.reserve);
 assert.deepEqual(member.magazines,initial.magazines);
 assert.equal(member.loadedMagazineId,initial.loadedMagazineId);
 const redeployed=newSession();applyRosterIdentity(redeployed,next);
 const freshActor=redeployed.operators.find(a=>a.id==='rook');
 const cleanSession=newSession();applyRosterIdentity(cleanSession,initialRoster());
 assert.equal(freshActor.health,cleanSession.operators.find(a=>a.id==='rook').health);
 assert.equal(freshActor.injuryStage,0);
 assert.equal(freshActor.weapon,'carbine');
});
test('Quick Play storage contains cosmetic preferences only',()=>{
 let roster=initialRoster();
 roster=renameRosterMember(roster,'rook','HAWK');
 roster=equipRoster(roster,'rook','rifle');
 const snapshot=serializeQuickPlayCosmetics(roster);
 const fields=Object.keys(JSON.parse(snapshot).members[0]).sort();
 assert.deepEqual(fields,['appearanceSeed','callsign','id']);
 const restored=freshQuickPlayRoster(readRoster(snapshot));
 assert.equal(restored.members[0].callsign,'HAWK');
 assert.deepEqual(restored.members[0].loadout,initialRoster().members[0].loadout);
 assert.equal(restored.members[0].weapon,'carbine');
});
test('unlimited Quick Play restock keeps previous magazine IDs and fills them',()=>{
 const base=initialRoster();
 const depleted={...base,members:base.members.map(m=>m.id==='rook'?{
  ...m,reserve:m.reserve-5,magazines:m.magazines.map((mag,i)=>i===0?
   {...mag,rounds:mag.rounds-5}:mag)}:m)};
 const stocked=resupplyRoster(depleted,'rook');
 assert.equal(stocked.members[0].reserve,WEAPONS.carbine.reserve);
 assert.equal(stocked.members[0].magazines[0].id,base.members[0].magazines[0].id);
 assert.equal(stocked.members[0].magazines[0].rounds,WEAPONS.carbine.capacity);
 assert.deepEqual(stocked.members[1],base.members[1]);
 const swapped=equipRoster(stocked,'rook','rifle');
 assert.equal(swapped.members[0].magazines[0].weapon,'rifle');
 assert.equal(swapped.members[0].loadedMagazineId,'rook/rifle/loaded');
 assert.equal(reserveRounds(swapped.members[0].magazines),WEAPONS.rifle.reserve);
});
