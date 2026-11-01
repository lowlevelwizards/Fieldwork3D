import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {stageMagazines,magazineSpace,chooseReloadMagazine,
 magazinePlacementSummary,reloadMagazineDelay} from '../src/equipment-magazine-placement.ts';
import {magazineKit,reserveRounds} from '../src/breach-magazines.ts';
import {initialRoster,applyRosterIdentity,equipRosterGear} from '../src/breach-roster.ts';
import {newSession,beginReload,advanceReload} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

test('magazines retain individual ids and rounds when staged in physical locations',()=>{
 const initial=initialEquipmentLoadout('smg');
 const mags=magazineKit('rook','smg',85,30);
 const original=mags.map(m=>({...m}));
 const positioned=stageMagazines(mags,initial);
 assert.equal(reserveRounds(positioned),85);
 assert.deepEqual(mags,original);
 assert.deepEqual(positioned.map(m=>m.id),mags.map(m=>m.id));
 assert.deepEqual(positioned.map(m=>m.location),['rig','rig','rig']);
 const sparse=setEquipmentChoice(setEquipmentChoice(setEquipmentChoice(initial,
  'rig','rig-none'),'belt','belt-light'),'backpack','backpack-none');
 assert.deepEqual(stageMagazines(mags,sparse).map(m=>m.location),
  ['belt','pocket','overflow']);
 assert.deepEqual(magazinePlacementSummary(mags,sparse),
  {rig:0,belt:1,pocket:1,backpack:0,overflow:1});
 assert.equal(magazineSpace(sparse).rig,0);
});
test('access speed beats magazine fullness, with deterministic equal-tier tie breaks',()=>{
 const mags=[
  {id:'stored',weapon:'smg',rounds:30,location:'backpack'},
  {id:'ready',weapon:'smg',rounds:8,location:'belt'},
  {id:'ready-2',weapon:'smg',rounds:23,location:'belt'}
 ];
 assert.equal(chooseReloadMagazine(mags),2);
 assert.ok(reloadMagazineDelay(mags[0])>reloadMagazineDelay(mags[1]));
 assert.equal(chooseReloadMagazine([{id:'e',weapon:'smg',rounds:0}]),-1);
});
test('quick-play loadout affects real reload duration and replayed retrieval ID',()=>{
 const original=initialRoster();
 let slow=original;
 for(const [slot,id] of [['rig','rig-none'],['belt','belt-light'],
   ['backpack','backpack-none']])
  slow=equipRosterGear(slow,'rook',slot,id);
 const s1=newSession();applyRosterIdentity(s1,original);
 const s2=newSession();applyRosterIdentity(s2,slow);
 const first=s1.operators.find(a=>a.id==='rook');
 const second=s2.operators.find(a=>a.id==='rook');
 assert.ok(first&&second);
 first.magazine=0;second.magazine=0;
 assert.equal(beginReload(s1,first),true);
 assert.equal(beginReload(s2,second),true);
 assert.ok(second.reloadDuration>first.reloadDuration);
 assert.ok(first.reloadSelectedMagazineId);
 const selected=first.reloadSelectedMagazineId;
 const film=snapshot(s1);
 first.reloadSelectedMagazineId=null;
 applyReplayFrame(s1,film);
 assert.equal(first.reloadSelectedMagazineId,selected);
 const reserve=second.reserve;
 advanceReload(s2,second,second.reloadDuration);
 assert.equal(second.magazine+second.reserve,reserve);
 assert.equal(second.reloadSelectedMagazineId,null);
});
