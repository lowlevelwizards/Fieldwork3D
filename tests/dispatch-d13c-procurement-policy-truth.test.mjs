import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchPresetDraft,DISPATCH_PRESETS} from '../src/dispatch-campaign-setup.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {campaignWeaponQuote} from '../src/campaign-weapon-procurement.ts';
import {newCampaign,buyWeapon} from '../src/campaign-state.ts';
import {createCampaignRules} from '../src/campaign-rules.ts';

test('D13.6 unavailable policy is not falsely described as explicitly refused',()=>{
 for(const preset of ['career','historical','decades','open']){
  const c=newDispatchPilotCampaign(1616,dispatchPresetDraft(preset));
  const quote=campaignWeaponQuote(c,'rifle');
  assert.equal(quote.status,'not-assessed',preset);
  assert.equal(quote.canPurchase,false);
  assert.match(quote.authorization,/NOT ASSESSED.*No playable Dispatch reference/);
  assert.strictEqual(buyWeapon(c,'rifle'),c);
 }
});

test('D13.6 restricted choice exists elsewhere, while standing alone can unlock a specialist',()=>{
 const omon=newDispatchPilotCampaign(1617,{
  ...dispatchPresetDraft('historical'),referenceId:'russian-omon-2002'
 });
 assert.equal(campaignWeaponQuote(omon,'smg').status,'reference-locked');
 assert.match(campaignWeaponQuote(omon,'smg').authorization,/NOT OFFERED/);
 const career=newDispatchPilotCampaign(1617,dispatchPresetDraft('career'));
 assert.equal(campaignWeaponQuote(career,'smg').status,'standing-locked');
 const standing70={...career,dispatchDepartment:{...career.dispatchDepartment,standing:70}};
 assert.equal(campaignWeaponQuote(standing70,'smg').status,'ready');
 assert.equal(campaignWeaponQuote(newDispatchPilotCampaign(1617,
  dispatchPresetDraft('historical')),'smg').status,'ready');
});

test('D13.6 unrestricted global and non-Dispatch modes retain their existing ability to buy',()=>{
 for(const preset of DISPATCH_PRESETS){
  const c=newDispatchPilotCampaign(1618,dispatchPresetDraft(preset));
  assert.equal(campaignWeaponQuote(c,'carbine').canPurchase,
   campaignWeaponQuote(c,'carbine').status==='ready');
  assert.equal(campaignWeaponQuote(c,'rifle').status,
   preset==='creative'?'ready':'not-assessed');
 }
 const creative=newDispatchPilotCampaign(1619,dispatchPresetDraft('creative'));
 assert.equal(campaignWeaponQuote(creative,'rifle').priceLabel,'NO CHARGE');
 const bought=buyWeapon(creative,'rifle');
 assert.equal(bought.funds,creative.funds);
 assert.equal(stockByPlatform(bought).rifle,stockByPlatform(creative).rifle+1);
 const operations=newCampaign(1619,createCampaignRules('operations'));
 assert.equal(campaignWeaponQuote(operations,'rifle').status,'ready');
 assert.equal(buyWeapon(operations,'rifle').funds,operations.funds-420);
});

import {catalogOwnedStock} from '../src/equipment-weapon-ownership.ts';
const stockByPlatform=c=>Object.fromEntries(['carbine','smg','rifle','shotgun'].map(p=>[p,catalogOwnedStock(c).filter(w=>w.platform===p).length]));
