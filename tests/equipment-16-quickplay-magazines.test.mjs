import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,readRoster,applyRosterIdentity,recordRosterMission,
 resupplyRoster,equipRoster} from '../src/breach-roster.ts';
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
test('partial-magazine IDs survive a complete quick-play mission, save and redeploy',()=>{
 let roster=initialRoster();
 const s=newSession();applyRosterIdentity(s,roster);
 const actor=s.operators.find(a=>a.id==='rook');
 const initialId=actor.spareMagazines[0].id;
 actor.spareMagazines[0].rounds-=5;
 actor.reserve-=5;
 actor.insertedMagazineId='rook/carbine/deployed';
 const next=recordRosterMission(s,roster);
 const member=next.members[0];
 assert.equal(member.magazines[0].id,initialId);
 assert.equal(member.magazines[0].rounds,WEAPONS.carbine.capacity-5);
 assert.equal(member.loadedMagazineId,'rook/carbine/deployed');
 assert.equal(reserveRounds(member.magazines),member.reserve);
 roster=readRoster(JSON.stringify(next));
 const fresh=newSession();applyRosterIdentity(fresh,roster);
 const returned=fresh.operators.find(a=>a.id==='rook');
 assert.equal(returned.spareMagazines[0].id,initialId);
 assert.equal(returned.spareMagazines[0].rounds,WEAPONS.carbine.capacity-5);
 assert.equal(returned.insertedMagazineId,'rook/carbine/deployed');
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
