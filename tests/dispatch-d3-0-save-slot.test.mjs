import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,acceptContract,resolveOperation} from '../src/campaign-state.ts';
import {createCampaignRules} from '../src/campaign-rules.ts';
import {BREACH_STORAGE_KEYS} from '../src/breach-storage-keys.ts';
import {campaignMatchesSlot,campaignSlotKey,commitCampaignToSlot,
 loadCampaignSlot,loadActiveCampaign,activeCampaignSlot,activeCampaignStorageKey,
 activateCampaignSlot,writeCampaignSlot} from '../src/campaign-save-slots.ts';

function storage(){
 const values=new Map();
 return {values,getItem:key=>values.get(key)??null,
  setItem:(key,value)=>values.set(key,value),
  removeItem:key=>values.delete(key)};
}
const dispatch=seed=>newCampaign(seed,createCampaignRules('dispatch'),'Dispatch SWAT');

test('D3.0 dispatch uses a distinct key and never replaces legacy or Sandbox',()=>{
 const s=storage(),old=newCampaign(1),sandbox=newCampaign(2,createCampaignRules('custom'),'Sandbox');
 const active=dispatch(3);
 assert.equal(campaignSlotKey('dispatch'),BREACH_STORAGE_KEYS.dispatchCampaign);
 assert.notEqual(campaignSlotKey('dispatch'),campaignSlotKey('sandbox'));
 assert.notEqual(campaignSlotKey('dispatch'),campaignSlotKey('legacy'));
 assert.equal(commitCampaignToSlot(old,'legacy',s),true);
 assert.equal(commitCampaignToSlot(sandbox,'sandbox',s),true);
 assert.equal(commitCampaignToSlot(active,'dispatch',s),true);
 assert.equal(activeCampaignSlot(s),'dispatch');
 assert.equal(activeCampaignStorageKey(s),BREACH_STORAGE_KEYS.dispatchCampaign);
 assert.deepEqual(loadActiveCampaign(s),{slot:'dispatch',campaign:active});
 assert.deepEqual(loadCampaignSlot('legacy',s),old);
 assert.deepEqual(loadCampaignSlot('sandbox',s),sandbox);
 assert.equal(activateCampaignSlot('legacy',s),true);
 assert.equal(activateCampaignSlot('dispatch',s),true);
 assert.deepEqual(loadActiveCampaign(s).campaign,active);
});

test('D3.0 wrong-template imports cannot contaminate a campaign slot',()=>{
 const s=storage(),d=dispatch(13),legacy=newCampaign(14);
 assert.equal(campaignMatchesSlot(d,'dispatch'),true);
 assert.equal(campaignMatchesSlot(legacy,'dispatch'),false);
 assert.equal(campaignMatchesSlot(d,'sandbox'),false);
 assert.equal(campaignMatchesSlot(d,'legacy'),false);
 assert.equal(commitCampaignToSlot(legacy,'dispatch',s),false);
 assert.equal(commitCampaignToSlot(d,'legacy',s),false);
 assert.equal(writeCampaignSlot(d,'sandbox',s),false);
 assert.equal(commitCampaignToSlot(d,'dispatch',s),true);
 const original=s.getItem(BREACH_STORAGE_KEYS.dispatchCampaign);
 assert.equal(commitCampaignToSlot(legacy,'dispatch',s),false);
 assert.equal(s.getItem(BREACH_STORAGE_KEYS.dispatchCampaign),original);
 assert.equal(activeCampaignSlot(s),'dispatch');
});

test('D3.0 failed activation rolls back Dispatch without damaging other saves',()=>{
 const s=storage(),l=newCampaign(21),d=dispatch(22);
 assert.equal(commitCampaignToSlot(l,'legacy',s),true);
 const broken={...s,setItem:(key,value)=>{
  if(key===BREACH_STORAGE_KEYS.activeCampaignSlot)throw Error('denied');
  s.setItem(key,value);
 }};
 assert.equal(commitCampaignToSlot(d,'dispatch',broken),false);
 assert.equal(loadCampaignSlot('dispatch',s),null);
 assert.deepEqual(loadCampaignSlot('legacy',s),l);
 s.setItem(BREACH_STORAGE_KEYS.dispatchCampaign,'{corrupt');
 s.setItem(BREACH_STORAGE_KEYS.activeCampaignSlot,'dispatch');
 assert.deepEqual(loadActiveCampaign(s),{slot:'legacy',campaign:l});
 s.setItem(BREACH_STORAGE_KEYS.dispatchCampaign,JSON.stringify(l));
 assert.equal(loadCampaignSlot('dispatch',s),null);
 assert.deepEqual(loadActiveCampaign(s),{slot:'legacy',campaign:l});
});

test('D3.0 Dispatch continuity uses existing mission settlement deterministically',()=>{
 const s=storage(),d=dispatch(33);
 assert.equal(commitCampaignToSlot(d,'dispatch',s),true);
 const job=d.contracts[0],assigned=acceptContract(d,job.id);
 const result={id:'dispatch-op-1',contractId:job.id,day:d.day,outcome:'success',
  grade:'B',elapsed:44,participatingIds:[],casualties:[],objective:true,events:[]};
 const after=resolveOperation(assigned,result);
 assert.equal(writeCampaignSlot(after,'dispatch',s),true);
 assert.deepEqual(loadCampaignSlot('dispatch',s),after);
 assert.deepEqual(resolveOperation(after,result),after);
 assert.equal(loadCampaignSlot('sandbox',s),null);
});
