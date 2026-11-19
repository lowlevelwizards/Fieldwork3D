import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialFieldInventory} from '../src/equipment-field-inventory.ts';
import {stageMagazines} from '../src/equipment-magazine-placement.ts';
import {quoteOneMagazineMove} from '../src/equipment-magazine-transfer.ts';
const kit=initialEquipmentLoadout();
const mags=[
 {id:'rook/carbine/0',weapon:'carbine',rounds:30},
 {id:'rook/carbine/1',weapon:'carbine',rounds:12}];
test('one magazine moves and retains unique identity, weapon, rounds and companion position',()=>{
 const original=stageMagazines(mags,kit);
 const moved=quoteOneMagazineMove(kit,mags,mags[0].id,'backpack');
 assert.equal(moved.ok,true,moved.ok?'':moved.reason);
 assert.equal(moved.changed,true);
 assert.deepEqual(moved.magazines.map(m=>[m.id,m.rounds]),
  mags.map(m=>[m.id,m.rounds]));
 assert.equal(moved.magazines[0].location,'backpack');
 assert.equal(moved.magazines[1].location,original[1].location);
 assert.equal(mags[0].location,undefined,'quotation cannot mutate source records');
});
test('moving to the same carrier is no-op; unknown magazine is rejected',()=>{
 const staged=stageMagazines(mags,kit);
 const noop=quoteOneMagazineMove(kit,mags,mags[0].id,staged[0].location);
 assert.equal(noop.ok,true);
 assert.equal(noop.changed,false);
 assert.equal(quoteOneMagazineMove(kit,mags,'ghost','backpack').ok,false);
});
test('destination without fitted carrier cannot accept magazine by implicit repack',()=>{
 const noPack=setEquipmentChoice(kit,'backpack','backpack-none');
 const moved=quoteOneMagazineMove(noPack,mags,mags[0].id,'backpack');
 assert.equal(moved.ok,false);
 assert.deepEqual(mags.map(m=>m.location),[undefined,undefined]);
});
test('moving into occupied carrier must not auto-displace the other magazine',()=>{
 const tight=setEquipmentChoice(setEquipmentChoice(kit,'rig','rig-none'),
  'belt','belt-light');
 const one=[
  {id:'rook/carbine/0',weapon:'carbine',rounds:29,location:'belt'},
  {id:'rook/carbine/1',weapon:'carbine',rounds:7,location:'pocket'}];
 const result=quoteOneMagazineMove(tight,one,one[1].id,'belt',
  initialFieldInventory(tight));
 assert.equal(result.ok,false);
 assert.equal(one[0].location,'belt');
});
test('existing field equipment capacity prevents a magazine from being smuggled into full rig',()=>{
 const inventory={version:1,stacks:[{itemId:'flashbang',quantity:4,location:'rig'}]};
 const result=quoteOneMagazineMove(kit,[{id:'one',weapon:'carbine',rounds:30,
  location:'backpack'}],'one','rig',inventory);
 assert.equal(result.ok,false);
});
