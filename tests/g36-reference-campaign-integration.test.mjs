/** Cross-surface G36 acceptance: dated research, reference previews, and
 * existing real campaign ownership/procurement/progression boundaries.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceWeaponChoice,referenceWeaponOptions}
 from '../src/faction-reference-weapons.ts';
import {referenceGapFidelity} from '../src/faction-reference-asset-registry.ts';
import {factionReference} from '../src/faction-reference-catalog.ts';
import {historicalEquipment} from '../src/faction-reference-historical-equipment.ts';
import {gameMappingForHistorical} from '../src/faction-reference-game-mapping.ts';
import {generateHistoricalLoadout} from '../src/faction-reference-loadout-generator.ts';
import {createCampaignRules} from '../src/campaign-rules.ts';
import {newCampaign,readCampaign,buyCatalogWeapon,equipCampaignOwnedPreset}
 from '../src/campaign-state.ts';
import {dispatchPresetDraft} from '../src/dispatch-campaign-setup.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {mayChooseCampaignContent} from '../src/dispatch-campaign-eligibility.ts';
import {weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';
import {resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';

test('German 2000/2010 previews show G36, era-appropriate short alternative, no universal-issue claim',()=>{
 for(const id of ['bundeswehr-flecktarn-2000','bundeswehr-tropentarn-2010']){
  const primary=referenceWeaponChoice(id);
  assert.equal(primary.presetId,'g36-service');
  assert.equal(primary.preset.family,'g36');
  assert.equal(primary.fidelity,'representative');
  assert.equal(primary.weapon,'rifle');
  const options=referenceWeaponOptions(id);
  assert.deepEqual(options.map(x=>x.presetId),['g36-service','g36-k-dual']);
  assert.match(options[1].note,/role/i);
  assert.equal(referenceWeaponChoice(id,'g36-k-dual').weapon,'carbine');
  assert.throws(()=>referenceWeaponChoice(id,'g36-c-classic'),/Unsupported preview weapon/);
  assert.throws(()=>referenceWeaponChoice(id,'g36-ka4'),/Unsupported preview weapon/);
  const reference=factionReference(id);
  const gap=reference.gaps.find(x=>x.id==='g36-family');
  assert.equal(referenceGapFidelity(reference,gap),'approximate',
   'authored modeled G36 is not a verified full historically exact kit');
 }
 assert.equal(referenceWeaponChoice('us-swat-2015').presetId,'ar-m4a1');
 assert.equal(referenceWeaponChoice('us-swat-mp5-1995').presetId,'hk-mp5a3');
});

test('evidence-backed 1997 German G36 resolves playable genuine family, not obsolete AR proxy',()=>{
 const g=historicalEquipment('de-g36');
 assert.equal(g.model.id,'g36-service');
 assert.equal(g.model.fidelity,'representative');
 const mapping=gameMappingForHistorical(g);
 assert.equal(mapping.playable,true);
 assert.equal(mapping.gameSlot,'primary');
 assert.equal(mapping.gameItemId,'primary-rifle');
 const proposal=generateHistoricalLoadout({
  context:{timelineId:'bundeswehr-field',year:1997},
  mode:'evidence-backed',seed:5
 });
 const chosen=proposal.choices.find(x=>x.historicalId==='de-g36');
 assert.ok(chosen);
 assert.equal(chosen.mapping.value,'g36-service');
 assert.equal(chosen.mapping.playable,true);
 assert.equal(proposal.completeKitVerified,false);
});

test('Operations campaign purchases exact G36 models, exchanges serials and persists',()=>{
 const c=newCampaign(2006,createCampaignRules('operations'));
 const carbine=c.operators.find(o=>o.weapon==='carbine');
 const rifle=c.operators.find(o=>o.weapon==='rifle');
 assert.ok(carbine&&rifle);
 let updated=c;
 for(const id of ['g36-k-dual','g36-c-classic','g36-ka4','g36-service'])updated=buyCatalogWeapon(updated,id);
 const total=updated.inventory.serializedWeapons.length;
 const stockBefore=JSON.stringify(stockByPlatform(updated));
 for(const id of ['g36-k-dual','g36-c-classic','g36-ka4']){
  updated=equipCampaignOwnedPreset(updated,carbine.id,id);
  const operator=updated.operators.find(o=>o.id===carbine.id);
  assert.equal(operator.weapon,'carbine');
  assert.equal(operator.weaponConfiguration.build.family,'g36');
  assert.equal(operator.weaponConfiguration.build.parts.barrel,
   id==='g36-c-classic'?'g36-barrel-228':'g36-barrel-318');
 }
 updated=equipCampaignOwnedPreset(updated,rifle.id,'g36-service');
 assert.equal(updated.operators.find(o=>o.id===rifle.id).weaponConfiguration.build.family,'g36');
 assert.equal(resolveWeaponAssembly(updated.operators.find(o=>o.id===rifle.id).weaponConfiguration).muzzleX,19.5);
 assert.equal(JSON.stringify(stockByPlatform(updated)),stockBefore,
  'factory selection conserves owned spare counts');
 assert.equal(updated.inventory.serializedWeapons.length,total);
 assert.strictEqual(equipCampaignOwnedPreset(updated,rifle.id,'g36-ka4'),updated,
  'cannot issue a model already assigned to another operator');
 assert.deepEqual(weaponOwnershipIssues(updated),[]);
 const recovered=readCampaign(JSON.stringify(updated));
 assert.ok(recovered);
 assert.deepEqual(recovered.operators.map(o=>o.weaponConfiguration.build?.parts),
  updated.operators.map(o=>o.weaponConfiguration.build?.parts));
 const paid=buyCatalogWeapon(c,'g36-service');
 assert.equal(stockByPlatform(paid).rifle,stockByPlatform(c).rifle+1);
 assert.ok(paid.funds<c.funds,'Operations purchases exact models through campaign funds');
});

test('Dispatch 2015 specialist G36C unlock uses standing and is not default or retroactive 1995 issue',()=>{
 const career=newDispatchPilotCampaign(2026,dispatchPresetDraft('career'));
 const member=career.operators[0];
 assert.equal(member.weapon,'carbine');
 assert.notEqual(member.weaponConfiguration.build?.family,'g36');
 assert.equal(mayChooseCampaignContent(career,'weapon-preset','g36-c-classic'),false);
 assert.strictEqual(equipCampaignOwnedPreset(career,member.id,'g36-c-classic'),career);
 const authorized={...career,dispatchDepartment:{...career.dispatchDepartment,standing:70}};
 assert.equal(mayChooseCampaignContent(authorized,'weapon-preset','g36-c-classic'),true);
 assert.equal(mayChooseCampaignContent(authorized,'weapon-preset','g36-service'),false);
 assert.equal(mayChooseCampaignContent(authorized,'weapon-preset','g36-ka4'),false);
 assert.strictEqual(equipCampaignOwnedPreset(authorized,member.id,'g36-c-classic'),authorized);
 const bought=buyCatalogWeapon(authorized,'g36-c-classic');
 assert.notStrictEqual(bought,authorized);
 const issued=equipCampaignOwnedPreset(bought,member.id,'g36-c-classic');
 assert.notStrictEqual(issued,bought);
 assert.equal(issued.operators[0].weaponConfiguration.build?.parts.barrel,'g36-barrel-228');
 assert.deepEqual(weaponOwnershipIssues(issued),[]);
 const restored=readCampaign(JSON.stringify(issued));
 assert.equal(restored?.operators[0].weaponConfiguration.build?.parts.barrel,'g36-barrel-228');
 const historical=newDispatchPilotCampaign(2026,dispatchPresetDraft('historical'));
 assert.equal(mayChooseCampaignContent(historical,'weapon-preset','g36-c-classic'),false);
 assert.equal(mayChooseCampaignContent(historical,'weapon-preset','hk-mp5a3'),true);
});

import {catalogOwnedStock} from '../src/equipment-weapon-ownership.ts';
const stockByPlatform=c=>Object.fromEntries(['carbine','smg','rifle','shotgun'].map(p=>[p,catalogOwnedStock(c).filter(w=>w.platform===p).length]));
