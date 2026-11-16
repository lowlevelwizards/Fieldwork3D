import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newCampaign,readCampaign,acceptContract,resolveOperation} from '../src/campaign-state.ts';
import {exportCampaign,importCampaign} from '../src/campaign-persistence.ts';
import {defaultCampaignDraft,validateCampaignDraft} from '../src/campaign-creation.ts';
import {BREACH_STORAGE_KEYS} from '../src/breach-storage-keys.ts';
import {campaignDeploymentSettings} from '../src/campaign-rules.ts';
import {activeCampaignSlot,activeCampaignStorageKey,campaignSlotKey,
 loadCampaignSlot,loadActiveCampaign,writeCampaignSlot,activateCampaignSlot,
 commitCampaignToSlot} from '../src/campaign-save-slots.ts';
const fixture=()=>{
 const data=new Map();
 return {data,
  getItem:key=>data.get(key)??null,
  setItem:(key,value)=>{data.set(key,value);},
  removeItem:key=>{data.delete(key);}
 };
};
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('C0.2 pure drafts validate names, seeds and only real mission rules',()=>{
 assert.deepEqual(defaultCampaignDraft(),{name:'My Sandbox',seed:'',
  intel:'contract',scale:'contract'});
 const input={name:' A Campaign ',seed:'4294967295',
  intel:'true-blind',scale:'expanded'};
 const valid=validateCampaignDraft(input);
 assert.equal(valid.ok,true);assert.equal(valid.name,'A Campaign');
 assert.equal(valid.seed,0xffffffff);assert.equal(valid.rules.template,'custom');
 assert.deepEqual(valid.rules.mission,{intel:'true-blind',scale:'expanded'});
 for(const changes of [{name:' '},{name:'x'.repeat(41)},{seed:'0'},
  {seed:'4294967296'},{seed:'1.2'},{seed:'NaN'},
  {intel:'full-view'},{scale:'large'}]){
  assert.equal(validateCampaignDraft({...input,...changes}).ok,false,JSON.stringify(changes));
 }
 assert.equal(validateCampaignDraft({...input,seed:''}).seed,null);
 assert.equal(validateCampaignDraft({...input,seed:' 001 '}).seed,1);
});

test('C0.2 legacy save remains in its original key, Sandbox is isolated',()=>{
 const storage=fixture(),legacy=newCampaign(321);
 assert.equal(campaignSlotKey('legacy'),BREACH_STORAGE_KEYS.campaign);
 assert.equal(writeCampaignSlot(legacy,'legacy',storage),true);
 assert.equal(activeCampaignSlot(storage),'legacy');
 assert.deepEqual(loadActiveCampaign(storage),{slot:'legacy',campaign:legacy});
 const input=validateCampaignDraft({...defaultCampaignDraft(),
  name:'Harbor Sandbox',seed:'9',intel:'true-blind',scale:'expanded'});
 assert.equal(input.ok,true);
 const sandbox=newCampaign(input.seed,input.rules,input.name);
 assert.equal(commitCampaignToSlot(sandbox,'sandbox',storage),true);
 assert.equal(activeCampaignSlot(storage),'sandbox');
 assert.equal(activeCampaignStorageKey(storage),BREACH_STORAGE_KEYS.sandboxCampaign);
 assert.deepEqual(loadActiveCampaign(storage),{slot:'sandbox',campaign:sandbox});
 assert.deepEqual(loadCampaignSlot('legacy',storage),legacy);
 const contract=sandbox.contracts[0];
 assert.deepEqual(campaignDeploymentSettings(sandbox,contract),{
  intel:'true-blind',scale:'expanded'
 });
 assert.equal(activateCampaignSlot('legacy',storage),true);
 assert.deepEqual(loadActiveCampaign(storage),{slot:'legacy',campaign:legacy});
 assert.equal(activeCampaignStorageKey(storage),BREACH_STORAGE_KEYS.campaign);
 assert.deepEqual(importCampaign(exportCampaign(sandbox)),sandbox);
});

test('C0.2 Sandbox mission settlements and reload do not affect legacy progression',()=>{
 const storage=fixture(),legacy=newCampaign(77);
 writeCampaignSlot(legacy,'legacy',storage);
 const sandbox=newCampaign(78,validateCampaignDraft({...defaultCampaignDraft(),
  seed:'78'}).rules,'My Sandbox');
 assert.equal(commitCampaignToSlot(sandbox,'sandbox',storage),true);
 const job=sandbox.contracts[0],accepted=acceptContract(sandbox,job.id);
 const after=resolveOperation(accepted,{
  id:'v02-test-report',contractId:job.id,day:accepted.day,outcome:'success',
  grade:'B',elapsed:49,participatingIds:['rook'],casualties:[],
  objective:true,events:[]
 });
 assert.equal(writeCampaignSlot(after,'sandbox',storage),true);
 assert.deepEqual(loadCampaignSlot('sandbox',storage),after);
 assert.deepEqual(loadCampaignSlot('legacy',storage),legacy);
 assert.deepEqual(resolveOperation(after,{
  id:'v02-test-report',contractId:job.id,day:accepted.day,outcome:'success',
  grade:'B',elapsed:49,participatingIds:['rook'],casualties:[],
  objective:true,events:[]
 }),after);
});

test('C0.2 fails closed under denied storage and cannot switch to invalid slot',()=>{
 const storage=fixture(),legacy=newCampaign(11),candidate=newCampaign(12);
 writeCampaignSlot(legacy,'legacy',storage);
 assert.equal(activateCampaignSlot('sandbox',storage),false);
 assert.equal(activeCampaignSlot(storage),'legacy');
 assert.equal(commitCampaignToSlot(candidate,'sandbox',null),false);
 assert.deepEqual(loadCampaignSlot('legacy',storage),legacy);
 const denied={...storage,setItem:(key,value)=>{
  if(key===BREACH_STORAGE_KEYS.activeCampaignSlot)throw Error('no pointer');
  storage.setItem(key,value);
 }};
 assert.equal(commitCampaignToSlot(candidate,'sandbox',denied),false);
 assert.equal(loadCampaignSlot('sandbox',storage),null,'candidate rollback');
 assert.deepEqual(loadCampaignSlot('legacy',storage),legacy);
 const bad={...storage,setItem:()=>{throw Error('quota');}};
 assert.equal(commitCampaignToSlot(candidate,'sandbox',bad),false);
 assert.equal(loadCampaignSlot('sandbox',storage),null);
 // A stale pointer must not force a sandbox campaign with corrupt JSON.
 storage.setItem(BREACH_STORAGE_KEYS.activeCampaignSlot,'sandbox');
 storage.setItem(BREACH_STORAGE_KEYS.sandboxCampaign,'{broken');
 assert.deepEqual(loadActiveCampaign(storage),{slot:'legacy',campaign:legacy});
 assert.equal(readCampaign(JSON.stringify({...legacy,name:''})),null);
 assert.equal(readCampaign(JSON.stringify({...legacy,name:'bad\\u0000name'})),null);
});

test('C0.2 source boundaries keep Quick Play separate and Studio slot-aware',()=>{
 const main=src('src/breach-main.ts'),flow=src('src/breach-campaign-flow.ts');
 const ui=src('src/campaign-ui.ts'),studio=src('src/operator-studio.ts');
 const quick=src('src/breach-quickplay-controller.ts');
 assert.match(main,/loadActiveCampaign\(\)/);
 assert.match(main,/writeCampaignSlot\(campaign,campaignSlot\)/);
 assert.match(flow,/validateCampaignDraft\(draft\)/);
 assert.match(flow,/replaceCampaignSlot\(next,'sandbox'\)/);
 assert.match(ui,/CONTINUE SANDBOX|SANDBOX CAMPAIGN/);
 assert.match(studio,/activeCampaignStorageKey\(\)/);
 assert.doesNotMatch(studio,/getItem\(BREACH_STORAGE_KEYS\.campaign\)/);
 assert.doesNotMatch(quick,/activeCampaignSlot|campaignDeploymentSettings|CampaignCreationDraft/);
});
