import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,readCampaign,buyWeapon,equipCampaignWeapon,equipCampaignWeaponPreset,buyCatalogWeapon,equipCampaignCatalogWeapon} from '../src/campaign-state.ts';
import {readSerializedWeapons,recordWeaponRounds} from '../src/equipment-weapon-identity.ts';
import {reconcileCampaignWeaponOwnership,weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';
import {matchingFamilyPreset,validFamilyBuild} from '../src/equipment-weapon-families.ts';
test('issued serials carry the actual catalog body and old records migrate without losing identity',()=>{
 const c=newCampaign(982);
 for(const o of c.operators){
  const w=c.inventory.serializedWeapons.find(x=>x.id===o.weaponSerialId);
  assert.deepEqual(w.catalogBody,o.weaponConfiguration.build);
  assert.notStrictEqual(w.catalogBody,o.weaponConfiguration.build);
 }
 const old=structuredClone(c);
 for(const w of old.inventory.serializedWeapons)delete w.catalogBody;
 const migrated=readCampaign(JSON.stringify(old));
 assert.deepEqual(migrated,c);
 assert.deepEqual(weaponOwnershipIssues(migrated),[]);
});
test('body edits synchronize the same owned serial and do not reset wear or service history',()=>{
 let c=newCampaign(983);
 const op=c.operators[0],id=op.weaponSerialId;
 c={...c,inventory:{...c.inventory,serializedWeapons:c.inventory.serializedWeapons.map(w=>w.id===id?recordWeaponRounds(w,76,c.day):w)}};
 const before=c.inventory.serializedWeapons.find(w=>w.id===id);
 const next=equipCampaignWeaponPreset(c,op.id,'ar-colt733');
 assert.notStrictEqual(next,c);
 const owner=next.operators.find(o=>o.id===op.id),serial=next.inventory.serializedWeapons.find(w=>w.id===id);
 assert.equal(owner.weaponSerialId,id);
 assert.deepEqual(serial.catalogBody,owner.weaponConfiguration.build);
 assert.equal(matchingFamilyPreset(serial.catalogBody).id,'ar-colt733');
 assert.deepEqual({...serial,catalogBody:before.catalogBody},before);
 assert.deepEqual(readCampaign(JSON.stringify(next)),next);
});
test('returning a serial to armory retains its named body and does not mint or lose assets',()=>{
 const c=equipCampaignWeaponPreset(newCampaign(984),'rook','ar-colt733');
 const op=c.operators.find(o=>o.id==='rook'),id=op.weaponSerialId;
 const bought=buyWeapon(c,'rifle');
 assert.notStrictEqual(bought,c);
 const swapped=equipCampaignWeapon(bought,op.id,'rifle');
 assert.notStrictEqual(swapped,bought);
 const spare=swapped.inventory.serializedWeapons.find(w=>w.id===id);
 assert.equal(matchingFamilyPreset(spare.catalogBody).id,'ar-colt733');
 assert.equal(swapped.inventory.serializedWeapons.length,bought.inventory.serializedWeapons.length);
 assert.deepEqual(weaponOwnershipIssues(swapped),[]);
 assert.deepEqual(readCampaign(JSON.stringify(swapped)),swapped);
});
test('class-only spare records recover existing catalog data without changing serial history',()=>{
 const c=buyWeapon(newCampaign(985),'shotgun');
 const ids=new Set(c.operators.map(o=>o.weaponSerialId));
 const spare=c.inventory.serializedWeapons.find(w=>!ids.has(w.id));
 assert.equal(matchingFamilyPreset(spare.catalogBody).id,'r870-police-wood');
 const old=structuredClone(spare);delete old.catalogBody;
 const [migrated]=readSerializedWeapons([old]);
 assert.deepEqual(migrated,spare);
 assert.ok(validFamilyBuild(migrated.catalogBody,migrated.platform));
 assert.deepEqual(reconcileCampaignWeaponOwnership(c),c);
});

test('named acquisition and exact serial exchange retain model identity and service records',()=>{
 const c=newCampaign(986),op=c.operators[0];
 const beforeIds=new Set(c.inventory.serializedWeapons.map(w=>w.id));
 const bought=buyCatalogWeapon(c,'ar-colt733');
 assert.notStrictEqual(bought,c);
 const spare=bought.inventory.serializedWeapons.find(w=>!beforeIds.has(w.id));
 assert.equal(matchingFamilyPreset(spare.catalogBody).id,'ar-colt733');
 assert.equal(bought.inventory.serializedWeapons.length,c.inventory.serializedWeapons.length+1);
 const next=equipCampaignCatalogWeapon(bought,op.id,spare.id);
 assert.notStrictEqual(next,bought);
 const issued=next.operators.find(o=>o.id===op.id);
 assert.equal(issued.weaponSerialId,spare.id);
 assert.deepEqual(issued.weaponConfiguration.build,spare.catalogBody);
 const returned=next.inventory.serializedWeapons.find(w=>w.id===op.weaponSerialId);
 assert.deepEqual(returned,c.inventory.serializedWeapons.find(w=>w.id===op.weaponSerialId));
 assert.equal(next.inventory.weapons.carbine,bought.inventory.weapons.carbine);
 assert.equal(next.funds,bought.funds);
 assert.deepEqual(weaponOwnershipIssues(next),[]);
 assert.deepEqual(readCampaign(JSON.stringify(next)),next);
 assert.strictEqual(equipCampaignCatalogWeapon(next,op.id,spare.id),next);
 assert.strictEqual(equipCampaignCatalogWeapon(next,next.operators[1].id,spare.id),next);
 assert.strictEqual(buyCatalogWeapon(next,'missing-reference'),next);
 assert.strictEqual(buyCatalogWeapon({...next,activeContractId:'live'},'ar-m4a1').inventory.serializedWeapons,next.inventory.serializedWeapons);
});
