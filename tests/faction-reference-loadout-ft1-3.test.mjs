import test from 'node:test';
import assert from 'node:assert/strict';
import {HISTORICAL_EQUIPMENT} from '../src/faction-reference-historical-equipment.ts';
import {historicalEquipmentEligibility}
 from '../src/faction-reference-equipment-eligibility.ts';
import {gameMappingForHistorical,auditHistoricalGameMappings}
 from '../src/faction-reference-game-mapping.ts';
import {generateHistoricalLoadout,validateHistoricalLoadoutProposal}
 from '../src/faction-reference-loadout-generator.ts';
import {createHistoricalLoadoutDraft,applyHistoricalQuickPlayProposal,
 applyHistoricalCampaignProposal} from '../src/faction-reference-loadout-apply.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {initialRoster} from '../src/breach-roster.ts';
import {newCampaign} from '../src/campaign-state.ts';

const make=(timelineId,year,additional={},extra={})=>
 generateHistoricalLoadout({context:{timelineId,year,...additional},
  mode:'evidence-backed',seed:19,...extra});
test('FT1.3 eligibility is narrower than a research browser',()=>{
 const omitted=historicalEquipmentEligibility({timelineId:'british-army-field',year:2010});
 assert.equal(omitted.status,'no-evidence');
 assert.ok(omitted.excluded.some(x=>x.reason.includes('theater-specific')));
 const included=historicalEquipmentEligibility({timelineId:'british-army-field',
  year:2010,theater:'Afghanistan'});
 assert.ok(included.items.some(x=>x.equipment.id==='uk-mtp'));
 assert.ok(included.items.some(x=>x.equipment.id==='uk-osprey'));
 assert.ok(!included.items.some(x=>x.record.issueStatus==='planned'));
 assert.equal(historicalEquipmentEligibility({timelineId:'nonesuch',year:2010}).status,'invalid-context');
 assert.equal(historicalEquipmentEligibility({timelineId:'us-army-infantry',year:NaN}).status,'invalid-context');
 assert.equal(historicalEquipmentEligibility({timelineId:'us-army-infantry',year:2019,month:13}).status,'invalid-context');
});
test('FT1.3 never promotes planned, trial, or tentative evidence by default',()=>{
 const french=historicalEquipmentEligibility({timelineId:'french-field',year:2024});
 assert.ok(!french.items.some(x=>x.equipment.id==='fr-bme'));
 assert.ok(french.excluded.some(x=>x.reason.includes('planned')));
 const marine=historicalEquipmentEligibility({timelineId:'usmc-field',year:2006});
 assert.ok(!marine.items.some(x=>x.equipment.id==='usmc-mtv'));
 const nva=historicalEquipmentEligibility({timelineId:'nva-field',year:1980});
 assert.equal(nva.status,'no-evidence');
 const opted=historicalEquipmentEligibility({timelineId:'nva-field',year:1980,
  includeTentative:true});
 assert.ok(opted.items.some(x=>x.equipment.id==='ddr-m56'&&x.certainty==='tentative'));
});
test('FT1.3 research models distinguish actual families from visual proxies',()=>{
 const byId=new Map(HISTORICAL_EQUIPMENT.map(x=>[x.id,x]));
 for(const id of ['uk-sa80','au-f88a2','fr-famas-f1']){
  const model=gameMappingForHistorical(byId.get(id));
  assert.ok(model);
  assert.equal(model.playable,false);
  assert.equal(model.fidelity,'proxy');
 }
 const g36=gameMappingForHistorical(byId.get('de-g36'));
 assert.equal(g36.playable,true);
 assert.equal(g36.fidelity,'representative');
 assert.equal(g36.value,'g36-service');
 assert.equal(gameMappingForHistorical(byId.get('us-m16a2')).playable,true);
 assert.equal(gameMappingForHistorical(byId.get('au-f88')).playable,false);
 assert.ok(auditHistoricalGameMappings(HISTORICAL_EQUIPMENT)
  .every(x=>x.id&&x.reason)); // honest incomplete art is allowed
});
test('FT1.3 deterministic selection, explicit conflict and no whole-kit certificate',()=>{
 const a=make('us-army-infantry',2016);
 assert.deepEqual(a,make('us-army-infantry',2016));
 assert.equal(a.completeKitVerified,false);
 assert.ok(a.conflicts.some(x=>x.category==='uniform'));
 assert.ok(a.unresolvedCategories.includes('weapon'));
 assert.equal(a.status,'partial');
 const picked=a.conflicts.find(x=>x.category==='uniform').alternatives.at(-1);
 const changed=make('us-army-infantry',2016,{},{
  selectedHistoricalIds:{uniform:picked.historicalId}
 });
 assert.ok(changed.choices.some(x=>x.historicalId===picked.historicalId));
 assert.deepEqual(changed,make('us-army-infantry',2016,{},{
  selectedHistoricalIds:{uniform:picked.historicalId}
 }));
 const locked=make('us-army-infantry',2016,{},{
  lockedCategories:['uniform'],baseline:initialEquipmentLoadout()});
 assert.ok(!locked.choices.some(x=>x.category==='uniform'));
 assert.ok(locked.retainedSlots.includes('uniform'));
});
test('FT1.3 dated evidence does not fabricate neighboring years',()=>{
 assert.equal(make('bundeswehr-field',2010).status,'no-evidence');
 assert.equal(make('canadian-field',2024).status,'no-evidence');
 const german=make('bundeswehr-field',1997);
 assert.ok(german.choices.some(x=>x.historicalId==='de-g36'));
 assert.ok(german.choices.some(x=>x.historicalId==='de-g36'&&x.mapping?.fidelity==='representative'&&x.mapping.playable));
 const aussie=make('australian-field',2010);
 assert.ok(aussie.choices.some(x=>x.historicalId==='au-f88a2'));
 assert.ok(aussie.unresolvedCategories.includes('weapon'));
});
test('FT1.3 draft creates optional clothing patch without altering identity or parent',()=>{
 const proposal=make('us-army-infantry',2016);
 const kit=initialEquipmentLoadout(),wardrobe=initialWardrobe();
 const config=initialWeaponConfiguration();
 const before=JSON.stringify({kit,wardrobe,config,proposal});
 const draft=createHistoricalLoadoutDraft(proposal,kit,wardrobe,config);
 assert.ok(draft.appliedHistoricalIds.length>0);
 assert.ok(draft.wardrobe.fabricCamo?.top);
 assert.ok(draft.wardrobe.fabricCamo?.trousers);
 assert.equal(draft.kit.slots.primary,kit.slots.primary);
 assert.deepEqual(draft.weaponConfiguration,config);
 assert.equal(JSON.stringify({kit,wardrobe,config,proposal}),before);
});
test('FT1.3 USMC 2006 creates only compatible map and excludes planned MTV',()=>{
 const proposal=make('usmc-field',2006);
 assert.ok(proposal.choices.some(x=>x.historicalId==='usmc-lwh'));
 assert.ok(!proposal.choices.some(x=>x.historicalId==='usmc-mtv'));
 const kit=initialEquipmentLoadout(),wardrobe=initialWardrobe();
 const draft=createHistoricalLoadoutDraft(proposal,kit,wardrobe,initialWeaponConfiguration());
 assert.ok(draft.kit.slots.head==='head-helmet');
 assert.ok(draft.appliedHistoricalIds.some(x=>x==='usmc-lwh'));
});
test('FT1.3 no evidence cannot change Quick Play or Campaign',()=>{
 const proposal=make('us-army-infantry',2070);
 const roster=initialRoster(),before=JSON.stringify(roster);
 assert.equal(applyHistoricalQuickPlayProposal(roster,'rook',proposal),null);
 assert.equal(JSON.stringify(roster),before);
 assert.equal(applyHistoricalCampaignProposal({activeContractId:'active',operators:[]},
  'not-found',proposal),null);
});
test('FT1.3 Quick Play application uses authorized roster paths',()=>{
 const proposal=make('us-army-infantry',2016);
 const roster=initialRoster();
 const applied=applyHistoricalQuickPlayProposal(roster,'rook',proposal);
 assert.ok(applied);
 assert.equal(applied.members.find(x=>x.id==='rook').weapon,
  roster.members.find(x=>x.id==='rook').weapon);
 assert.ok(applied.members.find(x=>x.id==='rook').wardrobe.fabricCamo.top);
 assert.equal(roster.members.find(x=>x.id==='rook').wardrobe.fabricCamo?.top,undefined);
});
test('FT1.3 standalone generator is pure across repeated context/seed queries',()=>{
 const roster=initialRoster();const before=JSON.stringify(roster);
 for(const timelineId of ['us-army-infantry','usmc-field','british-army-field',
  'australian-field','bundeswehr-field','canadian-field']){
  for(let year=1990;year<=2025;year+=5){
   const proposal=make(timelineId,year);
   if(proposal.choices.length)
    createHistoricalLoadoutDraft(proposal,roster.members[0].loadout,
     roster.members[0].wardrobe,roster.members[0].weaponConfiguration);
  }
 }
 assert.equal(JSON.stringify(roster),before);
});

test('FT1.3 canonical host verification rejects forged/altered visual mappings',()=>{
 const baseline=initialEquipmentLoadout();
 const p=make('us-army-infantry',2016,{},{baseline});
 assert.deepEqual(validateHistoricalLoadoutProposal(p,baseline),p);
 const invalid=JSON.parse(JSON.stringify(p));
 invalid.choices[0].mapping.value='ar-m4a1';
 assert.equal(validateHistoricalLoadoutProposal(invalid,baseline),null);
 assert.equal(validateHistoricalLoadoutProposal({...p,choices:[null]},baseline),null);
 assert.equal(validateHistoricalLoadoutProposal({...p,context:{...p.context,year:2070}},baseline),null);
});
test('FT1.3 campaign source-backed uniform changes use existing stock-safe editor',()=>{
 const campaign=newCampaign(74231);
 const before=JSON.stringify(campaign);
 const proposal=make('us-army-infantry',2016,{},{baseline:campaign.operators[0].loadout});
 const next=applyHistoricalCampaignProposal(campaign,campaign.operators[0].id,proposal);
 assert.ok(next);
 assert.ok(next.operators[0].wardrobe.fabricCamo.top);
 assert.deepEqual(next.inventory,campaign.inventory);
 assert.equal(JSON.stringify(campaign),before);
 assert.equal(applyHistoricalCampaignProposal({...campaign,activeContractId:'mission'},'rook',proposal),null);
});
test('FT1.3 historical equipment bridge is separate from cosmetic-only save flow',async()=>{
 const {readFileSync}=await import('node:fs');
 const host=readFileSync(new URL('../src/operator-studio-bridge.ts',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 assert.match(host,/msg.type==='fw-studio-apply-historical'/);
 assert.match(host,/validateHistoricalLoadoutProposal\(msg.proposal/);
 assert.match(host,/applyHistoricalCampaignProposal\(currentCampaign/);
 assert.match(host,/applyHistoricalQuickPlayProposal\(current/);
 assert.match(studio,/onApplyProposedEquipment:/);
 assert.match(studio,/fw-studio-apply-historical/);
 assert.match(host,/msg.type==='fw-studio-commit-batch'/);
});

import {buyCatalogWeapon} from '../src/campaign-state.ts';
import {matchingFamilyPreset} from '../src/equipment-weapon-families.ts';
test('named historical weapon application exchanges a real owned model rather than rebodying a serial',()=>{
 const c=newCampaign(74232),op=c.operators[0];
 const proposal={...make('us-army-infantry',2016),status:'partial',choices:[{
  historicalId:'us-m16a2',name:'M16A2',mapping:{channel:'weapon',fidelity:'exact',playable:true,value:'ar-m16a2'},notes:[]
 }]};
 const qp=applyHistoricalQuickPlayProposal(initialRoster(),'rook',proposal);
 assert.ok(qp);
 assert.equal(matchingFamilyPreset(qp.members[0].weaponConfiguration.build).id,'ar-m16a2');
 assert.equal(applyHistoricalCampaignProposal(c,op.id,proposal),null);
 const purchased=buyCatalogWeapon(c,'ar-m16a2');
 const owned=purchased.inventory.serializedWeapons.find(w=>matchingFamilyPreset(w.catalogBody)?.id==='ar-m16a2');
 assert.ok(owned);
 const next=applyHistoricalCampaignProposal(purchased,op.id,proposal);
 assert.ok(next);
 assert.equal(next.operators[0].weaponSerialId,owned.id);
 assert.equal(next.inventory.serializedWeapons.length,purchased.inventory.serializedWeapons.length);
});
