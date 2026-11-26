import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchPresetDraft,DISPATCH_PRESETS} from '../src/dispatch-campaign-setup.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {catalogWeaponQuote} from '../src/campaign-weapon-procurement.ts';
import {newCampaign,buyCatalogWeapon} from '../src/campaign-state.ts';
import {createCampaignRules} from '../src/campaign-rules.ts';

test('D13.6 unavailable policy is not falsely described as explicitly refused',()=>{
 for(const preset of ['career','historical','decades','open']){
  const c=newDispatchPilotCampaign(1616,dispatchPresetDraft(preset));
  const quote=catalogWeaponQuote(c,'ar-m16a2');
  assert.equal(quote.status,'not-assessed',preset);
  assert.equal(quote.canPurchase,false);
  assert.match(quote.authorization,/NOT ASSESSED.*No playable Dispatch reference/);
  assert.strictEqual(buyCatalogWeapon(c,'ar-m16a2'),c);
 }
});

test('D13.6 restricted choice exists elsewhere, while standing alone can unlock a specialist',()=>{
 const omon=newDispatchPilotCampaign(1617,{
  ...dispatchPresetDraft('historical'),referenceId:'russian-omon-2002'
 });
 assert.equal(catalogWeaponQuote(omon,'hk-mp5a3').status,'reference-locked');
 assert.match(catalogWeaponQuote(omon,'hk-mp5a3').authorization,/NOT OFFERED/);
 const career=newDispatchPilotCampaign(1617,dispatchPresetDraft('career'));
 assert.equal(catalogWeaponQuote(career,'hk-mp5a3').status,'standing-locked');
 const standing70={...career,dispatchDepartment:{...career.dispatchDepartment,standing:70}};
 assert.equal(catalogWeaponQuote(standing70,'hk-mp5a3').status,'ready');
 assert.equal(catalogWeaponQuote(newDispatchPilotCampaign(1617,
  dispatchPresetDraft('historical')),'hk-mp5a3').status,'ready');
});

test('D13.6 unrestricted global and non-Dispatch modes retain their existing ability to buy',()=>{
 for(const preset of DISPATCH_PRESETS){
  const c=newDispatchPilotCampaign(1618,dispatchPresetDraft(preset));
  assert.equal(catalogWeaponQuote(c,'ar-m4a1').canPurchase,
   catalogWeaponQuote(c,'ar-m4a1').status==='ready');
  assert.equal(catalogWeaponQuote(c,'ar-m16a2').status,
   preset==='creative'?'ready':'not-assessed');
 }
 const creative=newDispatchPilotCampaign(1619,dispatchPresetDraft('creative'));
 assert.equal(catalogWeaponQuote(creative,'ar-m16a2').priceLabel,'NO CHARGE');
 const bought=buyCatalogWeapon(creative,'ar-m16a2');
 assert.equal(bought.funds,creative.funds);
 assert.equal(stockByPlatform(bought).rifle,stockByPlatform(creative).rifle+1);
 const operations=newCampaign(1619,createCampaignRules('operations'));
 assert.equal(catalogWeaponQuote(operations,'ar-m16a2').status,'ready');
 assert.equal(buyCatalogWeapon(operations,'ar-m16a2').funds,operations.funds-420);
});

import {catalogOwnedStock} from '../src/equipment-weapon-ownership.ts';
const stockByPlatform=c=>Object.fromEntries(['carbine','smg','rifle','shotgun'].map(p=>[p,catalogOwnedStock(c).filter(w=>w.platform===p).length]));
