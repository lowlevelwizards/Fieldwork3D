import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {dispatchPresetDraft} from '../src/dispatch-campaign-setup.ts';
import {dispatchDepartmentView} from '../src/dispatch-department-view.ts';
import {catalogWeaponQuote,catalogWeaponOfferings}
 from '../src/campaign-weapon-procurement.ts';
import {buyCatalogWeapon,canAffordCampaignPurchase,campaignCatalogStockAtCapacity,
 hireRecruit,readCampaign,acceptContract,resolveOperation,newCampaign}
 from '../src/campaign-state.ts';
import {weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';
import {createCampaignRules} from '../src/campaign-rules.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('D13 curated procurement surfaces actual catalog models without claiming every model is eligible',()=>{
 const c=newDispatchPilotCampaign(131,dispatchPresetDraft('historical'));
 assert.ok(catalogWeaponOfferings(c).length>4);
 const mp5=catalogWeaponQuote(c,'hk-mp5a3');
 assert.equal(mp5.status,'ready');
 assert.equal(mp5.issued,4);
 assert.equal(mp5.stock,0);
 assert.equal(mp5.price,260);
 const modern=catalogWeaponQuote(c,'ar-m16a2');
 assert.equal(modern.status,'not-assessed');
 assert.match(modern.authorization,/No playable Dispatch reference/);
 assert.strictEqual(buyCatalogWeapon(c,'ar-m16a2'),c);
 const shotgun=catalogWeaponQuote(c,'r870-police-wood');
 assert.equal(shotgun.status,'ready',
  'historical preset deliberately grants authored specialist variants');
 const bought=buyCatalogWeapon(c,'hk-mp5a3');
 assert.equal(stockByPlatform(bought).smg,1);
 assert.equal(bought.funds,c.funds-260);
 assert.deepEqual(weaponOwnershipIssues(bought),[]);
});

test('D13 standing 70 distinguishes authorization from ownership, is enforced at purchase time',()=>{
 const c=newDispatchPilotCampaign(132,dispatchPresetDraft('career'));
 assert.equal(catalogWeaponQuote(c,'hk-mp5a3').status,'standing-locked');
 assert.match(catalogWeaponQuote(c,'hk-mp5a3').authorization,/Standing 70/);
 assert.strictEqual(buyCatalogWeapon(c,'hk-mp5a3'),c);
 const authorized={...c,dispatchDepartment:{...c.dispatchDepartment,standing:70}};
 assert.equal(catalogWeaponQuote(authorized,'hk-mp5a3').status,'ready');
 const next=buyCatalogWeapon(authorized,'hk-mp5a3');
 assert.equal(stockByPlatform(next).smg,1);
 assert.equal(next.funds,c.funds-260);
 assert.equal(catalogWeaponQuote(next,'hk-mp5a3').stock,1);
 const standingDropped={...next,dispatchDepartment:{...c.dispatchDepartment,standing:40}};
 assert.equal(catalogWeaponQuote(standingDropped,'hk-mp5a3').status,'standing-locked');
 assert.equal(stockByPlatform(standingDropped).smg,1,
  'standing drop never confiscates previously purchased gear');
});

test('D13 Open Department offers Dispatch inventory; creative is no-charge yet finite',()=>{
 const open=newDispatchPilotCampaign(133,dispatchPresetDraft('open'));
 assert.equal(catalogWeaponQuote(open,'hk-mp5a3').status,'ready');
 assert.equal(catalogWeaponQuote(open,'r870-police-wood').status,'ready');
 assert.equal(catalogWeaponQuote(open,'ar-m16a2').status,'not-assessed');
 assert.equal(canAffordCampaignPurchase(open,open.funds+1),false);
 const creative=newDispatchPilotCampaign(133,dispatchPresetDraft('creative'));
 assert.equal(catalogWeaponQuote(creative,'r870-police-wood').priceLabel,'NO CHARGE');
 assert.equal(canAffordCampaignPurchase({...creative,funds:0},3000),true);
 const free=buyCatalogWeapon({...creative,funds:0},'hk-mp5a3');
 assert.equal(free.funds,0);
 assert.equal(stockByPlatform(free).smg,stockByPlatform(creative).smg+1);
 assert.deepEqual(weaponOwnershipIssues(free),[]);
});

test('D13 frozen, unaffordable and saturated transactions do not charge money',()=>{
 const open=newDispatchPilotCampaign(134,dispatchPresetDraft('open'));
 const broke={...open,funds:1};
 assert.equal(catalogWeaponQuote(broke,'hk-mp5a3').status,'funds-locked');
 assert.strictEqual(buyCatalogWeapon(broke,'hk-mp5a3'),broke);
 const deployed=acceptContract(open,open.contracts[0].id);
 assert.equal(catalogWeaponQuote(deployed,'hk-mp5a3').status,'deployment-locked');
 assert.strictEqual(buyCatalogWeapon(deployed,'hk-mp5a3'),deployed);
 const atCap={...open,inventory:{...open.inventory,
  serializedWeapons:[...open.inventory.serializedWeapons,...Array.from({length:128-open.inventory.serializedWeapons.length},(_,i)=>({...open.inventory.serializedWeapons[0],id:'capacity-'+i}))]}};
 assert.equal(campaignCatalogStockAtCapacity(atCap),true);
 assert.equal(catalogWeaponQuote(atCap,'hk-mp5a3').status,'armory-full');
 assert.strictEqual(buyCatalogWeapon(atCap,'hk-mp5a3'),atCap);
});

test('D13 department identity is accurate and historical 2-chapter progression is visible',()=>{
 let c=newDispatchPilotCampaign(135,dispatchPresetDraft('decades'));
 const oldIds=c.operators.map(o=>o.weaponSerialId);
 let view=dispatchDepartmentView(c);
 assert.equal(view.chapterGoal,10);
 assert.equal(view.chapterProgress,0);
 assert.match(view.organization,/agency-neutral/);
 assert.match(view.chapterDetail,/future|after 10 completed responses/);
 for(let i=0;i<10;i++){
  const job=c.contracts.find(x=>x.status==='available'&&x.deadline>=c.day);
  assert.ok(job,'there must be a valid new job');
  const accepted=acceptContract(c,job.id);
  c=resolveOperation(accepted,{id:'d13-'+i,contractId:job.id,
   day:accepted.day,outcome:'success',grade:'B',elapsed:35,
   participatingIds:['rook'],casualties:[],objective:true,events:[]});
 }
 view=dispatchDepartmentView(c);
 assert.equal(view.chapterGoal,null);
 assert.equal(view.chapterJustUnlocked,true);
 assert.match(view.chapterLabel,/2015/);
 assert.match(view.chapterDetail,/future recruits/);
 assert.deepEqual(c.operators.map(o=>o.weaponSerialId),oldIds);
 assert.equal(c.operators[0].weapon,'smg');
 const recruited=hireRecruit({...c,funds:5000});
 assert.equal(recruited.operators.at(-1).weapon,'carbine');
 assert.deepEqual(weaponOwnershipIssues(recruited),[]);
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
});

test('D13 OMON fixed reference is not mislabeled American or historically progressed',()=>{
 const c=newDispatchPilotCampaign(136,{
  ...dispatchPresetDraft('historical'),referenceId:'russian-omon-2002'
 });
 const v=dispatchDepartmentView(c);
 assert.match(v.organization,/Russian OMON/);
 assert.equal(v.period,'2002');
 assert.equal(v.chapterGoal,null);
 assert.equal(catalogWeaponQuote(c,'hk-mp5a3').status,'reference-locked');
});

test('D13 legacy saves and original campaigns preserve their old procurement behavior',()=>{
 const old=newDispatchPilotCampaign(137);
 const legacy=readCampaign(JSON.stringify({...old,dispatchSetup:undefined}));
 assert.equal(dispatchDepartmentView(legacy).period,'2015');
 assert.equal(catalogWeaponQuote(legacy,'hk-mp5a3').status,'standing-locked');
 const nonDispatch=newCampaign(137,createCampaignRules('operations'));
 assert.equal(catalogWeaponQuote(nonDispatch,'ar-m16a2').status,'ready');
 assert.deepEqual(readCampaign(JSON.stringify(nonDispatch)),nonDispatch);
 const ui=source('src/campaign-ui.ts');
 assert.match(ui,/catalogWeaponOfferings\(c\)/);
 assert.match(ui,/dispatchDepartmentView\(c\)/);
 assert.match(ui,/this\.handlers\.buyCatalogWeapon\(quote\.presetId\)/);
 assert.doesNotMatch(ui,/CAMPAIGN_WEAPON_PLATFORMS/);
});

import {catalogOwnedStock} from '../src/equipment-weapon-ownership.ts';
const stockByPlatform=c=>Object.fromEntries(['carbine','smg','rifle','shotgun'].map(p=>[p,catalogOwnedStock(c).filter(w=>w.platform===p).length]));
