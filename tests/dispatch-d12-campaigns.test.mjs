import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDispatchSetup,dispatchPresetDraft,DISPATCH_PRESETS,
 effectiveDispatchSetup,currentDispatchReference,validDispatchSetup}
 from '../src/dispatch-campaign-setup.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {newCampaign,readCampaign,hireRecruit,buyCatalogWeapon,purchaseAmmo,setCampaignWardrobe}
 from '../src/campaign-state.ts';
import {mayChooseCampaignContent} from '../src/dispatch-campaign-eligibility.ts';
import {weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';
import {commitCampaignToSlot,loadCampaignSlot} from '../src/campaign-save-slots.ts';
import {createCampaignRules} from '../src/campaign-rules.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const memory=()=>{const values=new Map();return {
 getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),
 removeItem:k=>values.delete(k)};};

test('D12 independent preset axes are validated; no fake years or foreign progression',()=>{
 assert.equal(DISPATCH_PRESETS.length,5);
 for(const preset of DISPATCH_PRESETS)assert.equal(
  validDispatchSetup(createDispatchSetup(dispatchPresetDraft(preset))),true);
 assert.equal(createDispatchSetup(dispatchPresetDraft('historical')).referenceId,'us-swat-mp5-1995');
 assert.equal(createDispatchSetup(dispatchPresetDraft('creative')).equipmentScope,'global');
 assert.equal(validDispatchSetup({...createDispatchSetup(dispatchPresetDraft('decades')),
  referenceId:'russian-omon-2002'}),false);
 assert.equal(validDispatchSetup({...createDispatchSetup(dispatchPresetDraft('open')),
  startingInventory:'all'}),false);
 assert.equal(validDispatchSetup({...createDispatchSetup(dispatchPresetDraft('career')),
  extra:'unverified'}),false);
});
test('D12 live issue uses historical reference, correct weapon classes and magazine ownership',()=>{
 for(const [preset,expected,weapon] of [
  ['historical','us-swat-mp5-1995','smg'],
  ['career','us-swat-2015','carbine']
 ]){
  const c=newDispatchPilotCampaign(1718,dispatchPresetDraft(preset));
  assert.equal(currentDispatchReference(c),expected);
  assert.ok(c.operators.every(x=>x.weapon===weapon));
  assert.deepEqual(weaponOwnershipIssues(c),[]);
  const p=hireRecruit({...c,funds:2000});
  assert.equal(p.operators.at(-1).weapon,weapon);
  assert.deepEqual(weaponOwnershipIssues(p),[]);
  assert.deepEqual(readCampaign(JSON.stringify(c)),c);
 }
 const omon=newDispatchPilotCampaign(1920,{
  ...dispatchPresetDraft('historical'),referenceId:'russian-omon-2002'
 });
 assert.ok(omon.operators.every(p=>p.weapon==='carbine'));
 assert.deepEqual(weaponOwnershipIssues(omon),[]);
});
test('D12 department, Dispatch-wide and global catalogs have distinct authorizations',()=>{
 const historical=newDispatchPilotCampaign(55,dispatchPresetDraft('historical'));
 const open=newDispatchPilotCampaign(55,dispatchPresetDraft('open'));
 const creative=newDispatchPilotCampaign(55,dispatchPresetDraft('creative'));
 assert.equal(mayChooseCampaignContent(historical,'weapon-preset','hk-mp5a3'),true);
 assert.equal(mayChooseCampaignContent(historical,'weapon-preset','ar-m4a1'),false);
 assert.equal(mayChooseCampaignContent(open,'weapon-preset','hk-mp5a3'),true);
 assert.equal(mayChooseCampaignContent(open,'weapon-preset','ar-m4a1'),true);
 assert.equal(mayChooseCampaignContent(creative,'weapon-preset','g36-service'),true);
 assert.equal(mayChooseCampaignContent(historical,'weapon-preset','g36-service'),false);
 const old=newCampaign(55,createCampaignRules('dispatch'));
 assert.equal(effectiveDispatchSetup(old).referenceId,'us-swat-2015');
 assert.equal(mayChooseCampaignContent(old,'weapon-preset','hk-mp5a3'),false);
});
test('D12 chapter progression changes newly issued kit but never rewrites existing owners',()=>{
 const initial=newDispatchPilotCampaign(15,dispatchPresetDraft('decades'));
 assert.equal(currentDispatchReference(initial),'us-swat-mp5-1995');
 const later={...initial,history:Array.from({length:10},(_,i)=>({id:'historic-'+i}))};
 assert.equal(currentDispatchReference(later),'us-swat-2015');
 const recruited=hireRecruit({...later,funds:2000});
 assert.equal(recruited.operators[0].weapon,'smg');
 assert.equal(recruited.operators.at(-1).weapon,'carbine');
 assert.deepEqual(weaponOwnershipIssues(recruited),[]);
});
test('D12 open catalog retains paid ownership; creative has zero-cost economy',()=>{
 const open=newDispatchPilotCampaign(79,dispatchPresetDraft('open'));
 const bought=buyCatalogWeapon(open,'hk-mp5a3');
 assert.equal(bought.funds,open.funds-260);
 const creative=newDispatchPilotCampaign(79,dispatchPresetDraft('creative'));
 assert.equal(creative.funds,1000000);
 assert.equal(buyCatalogWeapon(creative,'hk-mp5a3').funds,creative.funds);
 assert.equal(purchaseAmmo(creative).funds,creative.funds);
 const p=creative.operators[0],w={...p.wardrobe,styles:{...p.wardrobe.styles,top:'polo-shirt'}};
 assert.notStrictEqual(setCampaignWardrobe(creative,p.id,w),creative);
});
test('D12 save isolation and malformed profile rejection preserve legacy campaigns',()=>{
 const storage=memory(),newMode=newDispatchPilotCampaign(31,dispatchPresetDraft('open'));
 assert.equal(commitCampaignToSlot(newMode,'dispatch',storage),true);
 assert.deepEqual(loadCampaignSlot('dispatch',storage),newMode);
 assert.equal(commitCampaignToSlot(newMode,'sandbox',storage),false);
 const corrupt={...newMode,dispatchSetup:{...newMode.dispatchSetup,referenceId:'us-police-polo-2020'}};
 assert.equal(readCampaign(JSON.stringify(corrupt)),null);
 const foreign={...newCampaign(31),dispatchSetup:newMode.dispatchSetup};
 assert.equal(readCampaign(JSON.stringify(foreign)),null);
 const old=newDispatchPilotCampaign(19);
 const restored=readCampaign(JSON.stringify({...old,dispatchSetup:undefined}));
 assert.equal(effectiveDispatchSetup(restored).referenceId,'us-swat-2015');
});
test('D12 creator and Studio go through one authoritative campaign context',()=>{
 const ui=source('src/campaign-ui.ts'),flow=source('src/breach-campaign-flow.ts');
 const bridge=source('src/operator-studio-bridge.ts');
 assert.match(ui,/renderDispatchCampaignCreator/);
 assert.match(flow,/createDispatch:async/);
 assert.match(flow,/replaceCampaignSlot\(next,'dispatch'\)/);
 assert.match(bridge,/dispatchReferenceId/);
 assert.match(source('src/campaign-state.ts'),/currentDispatchReference\(c\)/);
});
