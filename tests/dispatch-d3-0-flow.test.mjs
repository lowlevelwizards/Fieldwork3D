import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newCampaign} from '../src/campaign-state.ts';
import {createCampaignRules} from '../src/campaign-rules.ts';
import {loadActiveCampaign,campaignSlotKey,commitCampaignToSlot}
 from '../src/campaign-save-slots.ts';
import {BREACH_STORAGE_KEYS} from '../src/breach-storage-keys.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const memory=()=>{
 const m=new Map();return {m,getItem:k=>m.get(k)??null,
  setItem:(k,v)=>{m.set(k,v);},removeItem:k=>{m.delete(k);}};
};

test('D3.0 creator, menu and flow route to dedicated Dispatch campaign',()=>{
 const ui=source('src/campaign-ui.ts'),main=source('src/breach-main.ts');
 const flow=source('src/breach-campaign-flow.ts');
 assert.match(ui,/CONTINUE DISPATCH/);
 assert.match(ui,/DISPATCH CAMPAIGN/);
 assert.match(ui,/this\.importPicker\('dispatch'\)/);
 assert.match(main,/campaignInSlot\('dispatch'\)/);
 assert.match(flow,/newDispatchPilotCampaign\\(config.randomSeed\\(\\),draft\\)/);
 assert.match(flow,/replaceCampaignSlot\(next,'dispatch'\)/);
 assert.match(flow,/continueDispatch:\(\)=>resumeSlot\('dispatch'\)/);
 assert.match(flow,/Save belongs to another mode/);
});

test('D3.0 uses existing campaign save envelope unchanged and remains portable',()=>{
 const s=memory(),c=newCampaign(101,createCampaignRules('dispatch'),'Dispatch SWAT Pilot');
 const before=JSON.stringify(c);
 assert.equal(commitCampaignToSlot(c,'dispatch',s),true);
 assert.equal(campaignSlotKey('legacy'),BREACH_STORAGE_KEYS.campaign);
 assert.equal(campaignSlotKey('sandbox'),BREACH_STORAGE_KEYS.sandboxCampaign);
 assert.deepEqual(loadActiveCampaign(s),{slot:'dispatch',campaign:c});
 assert.equal(JSON.stringify(c),before);
 assert.deepEqual(JSON.parse(s.m.get(BREACH_STORAGE_KEYS.dispatchCampaign)),c);
});
