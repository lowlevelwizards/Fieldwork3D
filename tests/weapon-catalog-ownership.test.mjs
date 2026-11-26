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

import {catalogWeaponQuote,catalogWeaponOfferings} from '../src/campaign-weapon-procurement.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {dispatchPresetDraft,DISPATCH_PRESETS} from '../src/dispatch-campaign-setup.ts';
test('named quote counts exact owned models, not same-class pools',()=>{
 const c=newCampaign(987);
 const a=buyCatalogWeapon(c,'ar-colt733'),b=buyCatalogWeapon(a,'ar-m4a1');
 assert.equal(catalogWeaponQuote(b,'ar-colt733').stock,1);
 assert.equal(catalogWeaponQuote(b,'ar-m4a1').stock,1);
 assert.equal(catalogWeaponQuote(b,'missing-reference'),undefined);
 assert.equal(catalogWeaponQuote({...b,activeContractId:'live'},'ar-colt733').canPurchase,false);
});
test('named procurement quotes agree with mutations across campaign policies',()=>{
 for(const c of [newCampaign(988),...DISPATCH_PRESETS.map(p=>newDispatchPilotCampaign(988,dispatchPresetDraft(p)))]){
  const quotes=catalogWeaponOfferings(c);
  assert.equal(new Set(quotes.map(q=>q.presetId)).size,quotes.length);
  assert.ok(quotes.length>4);
  for(const q of quotes){
   const next=buyCatalogWeapon(c,q.presetId);
   assert.equal(next!==c,q.canPurchase,q.presetId+' '+q.status);
   if(q.canPurchase)assert.equal(catalogWeaponQuote(next,q.presetId).stock,q.stock+1);
  }
 }
});

import {catalogWeaponIssueOptions} from '../src/campaign-weapon-procurement.ts';
import {canEquipCampaignCatalogWeapon} from '../src/campaign-state.ts';
test('squad issuance options project exact unassigned serials and shared mutation guards',()=>{
 const c=buyCatalogWeapon(newCampaign(989),'ar-colt733');
 const op=c.operators[0],other=c.operators[1];
 const options=catalogWeaponIssueOptions(c,op.id);
 assert.equal(options.some(x=>x.serialId===other.weaponSerialId),false);
 const spare=options.find(x=>x.name===catalogWeaponQuote(c,'ar-colt733').name);
 assert.ok(spare?.enabled);
 assert.equal(canEquipCampaignCatalogWeapon(c,op.id,spare.serialId),true);
 assert.equal(canEquipCampaignCatalogWeapon({...c,activeContractId:'live'},op.id,spare.serialId),false);
 const next=equipCampaignCatalogWeapon(c,op.id,spare.serialId);
 assert.equal(next.operators[0].weaponSerialId,spare.serialId);
 assert.ok(catalogWeaponIssueOptions(next,op.id).some(x=>x.serialId===op.weaponSerialId));
});
test('curated named shotgun migration preserves existing specialist access',()=>{
 for(const p of DISPATCH_PRESETS){
  const c=newDispatchPilotCampaign(990,dispatchPresetDraft(p));
  const q=catalogWeaponQuote(c,'r870-police-wood');
  assert.equal(q.canPurchase,buyCatalogWeapon(c,'r870-police-wood')!==c);
 }
 const historical=newDispatchPilotCampaign(990,dispatchPresetDraft('historical'));
 assert.equal(catalogWeaponQuote(historical,'r870-police-wood').canPurchase,true);
 const career=newDispatchPilotCampaign(990,dispatchPresetDraft('career'));
 assert.equal(catalogWeaponQuote(career,'r870-police-wood').status,'standing-locked');
});

import {catalogOwnedStock,projectCatalogInventory} from '../src/equipment-weapon-ownership.ts';
test('named acquisition and issue derive compatibility stock from serials without reallocating bodies',()=>{
 const start=newCampaign(991),first=buyCatalogWeapon(start,'ar-colt733');
 const damaged={...first,inventory:{...first.inventory,weapons:{carbine:0,rifle:0,smg:0,shotgun:0}}};
 const exact=catalogOwnedStock(damaged).find(w=>matchingFamilyPreset(w.catalogBody).id==='ar-colt733');
 assert.ok(exact);
 const issued=equipCampaignCatalogWeapon(damaged,start.operators[0].id,exact.id);
 assert.equal(issued.operators[0].weaponSerialId,exact.id);
 assert.deepEqual(new Set(issued.inventory.serializedWeapons.map(w=>w.id)),new Set(first.inventory.serializedWeapons.map(w=>w.id)));
 assert.deepEqual(weaponOwnershipIssues(issued),[]);
 assert.deepEqual(readCampaign(JSON.stringify(issued)),issued);
 assert.deepEqual(projectCatalogInventory(issued),issued);
});
test('a weapon attached to an unresolved missing operator is not armory stock',()=>{
 const c=newCampaign(992),operator=c.operators[0];
 const missing={...c,operators:c.operators.map(o=>o.id===operator.id?{...o,status:'lost'}:o)};
 assert.ok(!catalogOwnedStock(missing).some(w=>w.id===operator.weaponSerialId));
 assert.strictEqual(equipCampaignCatalogWeapon(missing,c.operators[1].id,operator.weaponSerialId),missing);
});

import {saveCampaignKitPreset,applyCampaignKitPreset,campaignKitWeaponAvailable,hireRecruit,retireOperator} from '../src/campaign-state.ts';
test('cross-category saved kit requires matching authored body, not any spare of the same category',()=>{
 let c=saveCampaignKitPreset(newCampaign(993),'rook','M4 kit');
 const p=c.kitPresets[0],operator=c.operators[1];
 c=buyCatalogWeapon(c,'ar-colt733');
 assert.equal(campaignKitWeaponAvailable(c,operator.id,p.id),false);
 assert.strictEqual(applyCampaignKitPreset(c,operator.id,p.id),c);
 c=buyCatalogWeapon(c,'ar-m4a1');
 const exact=catalogOwnedStock(c).find(w=>matchingFamilyPreset(w.catalogBody)?.id==='ar-m4a1');
 assert.ok(exact);
 assert.equal(campaignKitWeaponAvailable(c,operator.id,p.id),true);
 const issued=applyCampaignKitPreset(c,operator.id,p.id);
 assert.equal(issued.operators[1].weaponSerialId,exact.id);
 assert.deepEqual(weaponOwnershipIssues(issued),[]);
});
test('retirement returns actual named serial with service history unchanged',()=>{
 const c=hireRecruit({...newCampaign(994),funds:5000});
 const op=c.operators.at(-1),w=c.inventory.serializedWeapons.find(x=>x.id===op.weaponSerialId);
 const retired=retireOperator(c,op.id);
 assert.ok(retired!==c);
 assert.deepEqual(catalogOwnedStock(retired).find(x=>x.id===w.id),w);
 assert.deepEqual(weaponOwnershipIssues(retired),[]);
});

test('missing operator custody survives save reload and cannot become spare inventory',()=>{
 const c=newCampaign(995),op=c.operators[0],w=c.inventory.serializedWeapons.find(x=>x.id===op.weaponSerialId);
 const missing={...c,operators:c.operators.map(o=>o.id===op.id?{...o,status:'lost',missingSinceOperationId:'missing-op'}:o)};
 const loaded=readCampaign(JSON.stringify(missing));
 assert.ok(loaded);
 assert.equal(loaded.operators[0].weaponSerialId,w.id);
 assert.deepEqual(loaded.inventory.serializedWeapons.find(x=>x.id===w.id),w);
 assert.ok(!catalogOwnedStock(loaded).some(x=>x.id===w.id));
 assert.deepEqual(weaponOwnershipIssues(loaded),[]);
 assert.deepEqual(readCampaign(JSON.stringify(loaded)),loaded);
});
test('named procurement capacity ignores a stale compatibility class count',()=>{
 const c=newCampaign(996);
 const stale={...c,inventory:{...c.inventory,weapons:{carbine:128,smg:0,rifle:0,shotgun:0}}};
 assert.equal(catalogWeaponQuote(stale,'ar-m4a1').canPurchase,true);
 const next=buyCatalogWeapon(stale,'ar-m4a1');
 assert.notStrictEqual(next,stale);
 assert.equal(next.inventory.serializedWeapons.length,c.inventory.serializedWeapons.length+1);
 assert.equal(next.inventory.weapons.carbine,1);
 assert.deepEqual(weaponOwnershipIssues(next),[]);
});

test('modern serial-authoritative saves ignore obsolete count fields on read',()=>{
 const c=buyCatalogWeapon(newCampaign(997),'ar-colt733');
 const raw=structuredClone(c);
 raw.inventory.weapons={carbine:0,rifle:70,smg:9,shotgun:12};
 const loaded=readCampaign(JSON.stringify(raw));
 assert.deepEqual(loaded,c);
 assert.equal(loaded.inventory.catalogVersion,1);
});
test('historical pre-serial saves materialize explicitly recorded spare counts',()=>{
 const raw=structuredClone(newCampaign(998));
 delete raw.inventory.catalogVersion;delete raw.inventory.serializedWeapons;
 raw.inventory.weapons.carbine=2;
 const loaded=readCampaign(JSON.stringify(raw));
 assert.equal(loaded.inventory.serializedWeapons.length,6);
 assert.equal(catalogOwnedStock(loaded).length,2);
 assert.equal(loaded.inventory.catalogVersion,1);
 assert.deepEqual(readCampaign(JSON.stringify(loaded)),loaded);
});
