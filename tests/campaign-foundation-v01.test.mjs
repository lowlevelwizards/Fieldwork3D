import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newCampaign,readCampaign,acceptContract,resolveOperation}
 from '../src/campaign-state.ts';
import {exportCampaign,importCampaign} from '../src/campaign-persistence.ts';
import {loadCampaignFromStorage,saveCampaignToStorage} from '../src/breach-persistence.ts';
import {CAMPAIGN_TEMPLATE_IDS,CAMPAIGN_PRESETS,CAMPAIGN_FEATURES,
 readCampaignRules,createCampaignRules,effectiveCampaignRules,
 campaignDeploymentSettings} from '../src/campaign-rules.ts';

test('C0.1 templates describe all four identities without enabling unbuilt mechanics',()=>{
 assert.deepEqual(CAMPAIGN_TEMPLATE_IDS,['dispatch','operations','wasteland','custom']);
 for(const id of CAMPAIGN_TEMPLATE_IDS){
  assert.ok(CAMPAIGN_PRESETS[id].label);
  assert.deepEqual(createCampaignRules(id).mission,{intel:'contract',scale:'contract'});
 }
 assert.equal(CAMPAIGN_PRESETS.wasteland.phase,'defined');
 for(const id of ['looting','gasAndFilters','batterySupplies',
  'safehouseUpgrades','militaryLogistics','factionReputation'])
  assert.equal(CAMPAIGN_FEATURES[id].status,'planned',id);
 assert.equal(CAMPAIGN_FEATURES.weaponService.status,'fixed');
 const ids=new Set(Object.keys(CAMPAIGN_FEATURES));
 for(const [key,entry] of Object.entries(CAMPAIGN_FEATURES))
  for(const dependency of entry.requires)
   assert.ok(ids.has(dependency),key+' depends on missing feature '+dependency);
});

test('C0.1 legacy campaigns retain equivalent data and no automatic migration',()=>{
 const legacy=newCampaign(4321);
 assert.equal(Object.hasOwn(legacy,'rules'),false);
 const before=JSON.stringify(legacy);
 assert.deepEqual(readCampaign(before),legacy);
 assert.deepEqual(importCampaign(exportCampaign(legacy)),legacy);
 assert.equal(JSON.stringify(legacy),before,'reading must not mutate in-memory state');
 assert.equal(Object.hasOwn(readCampaign(before),'rules'),false);
 const contract=legacy.contracts[0];
 const expectedIntel=contract.intel==='unknown'?'true-blind':
  contract.intel==='scouted'?'exterior-known':'floor-plan';
 assert.deepEqual(campaignDeploymentSettings(legacy,contract),{
  intel:expectedIntel,scale:contract.scale
 });
 assert.equal(effectiveCampaignRules(legacy).template,'custom');
});

test('C0.1 mission rule overrides resolve against the actual accepted contract',()=>{
 const rules=createCampaignRules('custom',{intel:'true-blind',scale:'expanded'});
 const state=newCampaign(512,rules);
 const job=state.contracts[0];
 const accepted=acceptContract(state,job.id);
 assert.deepEqual(campaignDeploymentSettings(accepted,job),{
  intel:'true-blind',scale:'expanded'
 });
 assert.deepEqual(readCampaign(JSON.stringify(accepted)),accepted);
 assert.deepEqual(importCampaign(exportCampaign(accepted)),accepted);
 const store=new Map();
 const storage={
  getItem:key=>store.get(key)??null,
  setItem:(key,value)=>store.set(key,value),
  removeItem:key=>store.delete(key)
 };
 assert.equal(saveCampaignToStorage(accepted,storage),true);
 assert.deepEqual(loadCampaignFromStorage(storage),accepted);
 const report={id:'c01-op',contractId:job.id,day:accepted.day,
  outcome:'success',grade:'B',elapsed:80,
  participatingIds:[],casualties:[],objective:true,events:[]};
 const after=resolveOperation(accepted,report);
 assert.deepEqual(after.rules,rules,'settlement must not rewrite user-authored rules');
 assert.deepEqual(resolveOperation(after,report),after,'settlement remains idempotent');
});

test('C0.1 independently configurable intel and scale do not change contract data',()=>{
 const job={intel:'scouted',scale:'standard'};
 assert.deepEqual(campaignDeploymentSettings({rules:createCampaignRules('dispatch')},job),
  {intel:'exterior-known',scale:'standard'});
 assert.deepEqual(campaignDeploymentSettings({rules:createCampaignRules('operations',{
  intel:'floor-plan',scale:'standard'})},job),
  {intel:'floor-plan',scale:'standard'});
 assert.deepEqual(campaignDeploymentSettings({rules:createCampaignRules('wasteland',{
  intel:'exterior-known'})},job),{intel:'exterior-known',scale:'standard'});
 assert.deepEqual(job,{intel:'scouted',scale:'standard'});
});

test('C0.1 invalid, unknown and future rule versions fail closed, without data loss',()=>{
 const good=createCampaignRules('custom');
 for(const bad of [null,{},[],{...good,version:2},
  {...good,template:'unknown'}, {...good,loot:true},
  {...good,mission:{intel:'contract',scale:'huge'}},
  {...good,mission:{intel:'full-view',scale:'standard'}},
  {...good,mission:{intel:'contract',scale:'standard',gas:true}}]){
  assert.equal(readCampaignRules(bad),null);
  assert.equal(readCampaign(JSON.stringify({...newCampaign(3),rules:bad})),null);
 }
 assert.throws(()=>createCampaignRules('custom',{scale:'huge'}));
 assert.throws(()=>newCampaign(4,{...good,version:2}));
});

test('C0.1 live campaign deployment uses adapter; Quick Play remains independent',()=>{
 const flow=readFileSync(new URL('../src/breach-campaign-flow.ts',import.meta.url),'utf8');
 const quick=readFileSync(new URL('../src/breach-quickplay-controller.ts',import.meta.url),'utf8');
 assert.match(flow,/campaignDeploymentSettings\(model\.campaign,job\)/);
 assert.match(flow,/model\.intel=deployment\.intel/);
 assert.match(flow,/model\.scale=deployment\.scale/);
 assert.doesNotMatch(quick,/campaignDeploymentSettings|effectiveCampaignRules|CAMPAIGN_PRESETS/);
});
