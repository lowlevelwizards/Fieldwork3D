import test from 'node:test';import assert from 'node:assert/strict';
import {PACK_PROFILES,canonicalPackEquipment} from '../src/operator-backpack-catalog.ts';
import {EQUIPMENT_CATALOG} from '../src/equipment-catalog.ts';
import {quoteBackpackChoice} from '../src/equipment-backpack-change.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
test('BP12 canonical pack stats have one authoritative source',()=>{
 for(const p of Object.values(PACK_PROFILES)){
  const e=EQUIPMENT_CATALOG[p.id];
  assert.equal(e.capacity,p.capacity);assert.equal(e.massKg,p.massKg);assert.equal(e.bulk,p.bulk);
  assert.equal(e.capability,undefined);
 }
 assert.equal(canonicalPackEquipment('admin-pack'),'backpack-panel');
});
test('BP12 incompatible mount rejects without changing source; larger pack preserves inventory',()=>{
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'backpack','backpack-day');
 const before=JSON.stringify(kit);
 assert.equal(quoteBackpackChoice(kit,[],'admin-pack','armor-bare','no-rig').ok,false);
 const quote=quoteBackpackChoice(kit,[],'rucksack','armor-bare','no-rig');
 assert.equal(quote.ok,true,quote.reason);
 assert.equal(quote.kit.slots.backpack,'backpack-expedition');
 assert.equal(JSON.stringify(kit),before);
});

test('BP12 roster issue uses canonical pack identities and keeps owned rounds',async()=>{
 const {initialRoster,equipRosterCarryGear,equipRosterGear}=await import('../src/breach-roster.ts');
 const {resolvedWardrobe}=await import('../src/operator-wardrobe-data.ts');
 const roster=initialRoster(),op=roster.members[0];
 const issued=equipRosterCarryGear(roster,op.id,'backpack','backpack-expedition');
 assert.notEqual(issued,roster);
 const updated=issued.members[0];
 assert.equal(updated.loadout.slots.backpack,'backpack-expedition');
 assert.equal(resolvedWardrobe(updated.wardrobe,updated.loadout).packStyle,'rucksack');
 const rounds=items=>items.map(m=>[m.id,m.rounds]).sort((a,b)=>a[0].localeCompare(b[0]));
 assert.deepEqual(rounds(updated.magazines),rounds(op.magazines));
 assert.equal(equipRosterCarryGear(roster,op.id,'backpack','backpack-panel'),roster);
 assert.equal(roster.members[0].loadout.slots.backpack,op.loadout.slots.backpack);
 const armored=equipRosterGear(roster,op.id,'armor','armor-carrier');
 const panel=equipRosterCarryGear(armored,op.id,'backpack','backpack-panel');
 if(panel!==armored)assert.equal(equipRosterGear(panel,op.id,'armor','armor-none'),panel);
});
test('BP12 capacity cannot erase field cargo or rounds on pack downsizing',()=>{
 let kit=initialEquipmentLoadout();
 for(const [slot,id] of [['rig','rig-none'],['belt','belt-none'],['backpack','backpack-expedition']])
  kit=setEquipmentChoice(kit,slot,id);
 kit={...kit,fieldInventory:{version:1,stacks:[{itemId:'flashbang',quantity:4,location:'backpack'}]}};
 const before=JSON.stringify(kit);
 const q=quoteBackpackChoice(kit,[],'hydration','armor-bare','no-rig');
 assert.equal(q.ok,false);
 assert.equal(JSON.stringify(kit),before);
});
