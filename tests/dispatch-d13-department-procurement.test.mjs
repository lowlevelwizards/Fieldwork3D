import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {dispatchPresetDraft} from '../src/dispatch-campaign-setup.ts';
import {dispatchDepartmentView} from '../src/dispatch-department-view.ts';
import {CAMPAIGN_WEAPON_PLATFORMS,campaignWeaponQuote}
 from '../src/campaign-weapon-procurement.ts';
import {buyWeapon,canAffordCampaignPurchase,campaignWeaponStockAtCapacity,
 hireRecruit,readCampaign,acceptContract,resolveOperation,newCampaign}
 from '../src/campaign-state.ts';
import {weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';
import {createCampaignRules} from '../src/campaign-rules.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('D13 curated procurement surfaces all four supported classes without claiming every gun is eligible',()=>{
 assert.deepEqual(CAMPAIGN_WEAPON_PLATFORMS,['carbine','smg','rifle','shotgun']);
 const c=newDispatchPilotCampaign(131,dispatchPresetDraft('historical'));
 const mp5=campaignWeaponQuote(c,'smg');
 assert.equal(mp5.status,'ready');
 assert.equal(mp5.issued,4);
 assert.equal(mp5.stock,0);
 assert.equal(mp5.price,260);
 const modern=campaignWeaponQuote(c,'rifle');
 assert.equal(modern.status,'not-assessed');
 assert.match(modern.authorization,/No playable Dispatch reference/);
 assert.strictEqual(buyWeapon(c,'rifle'),c);
 const shotgun=campaignWeaponQuote(c,'shotgun');
 assert.equal(shotgun.status,'ready',
  'historical preset deliberately grants authored specialist variants');
 const bought=buyWeapon(c,'smg');
 assert.equal(bought.inventory.weapons.smg,1);
 assert.equal(bought.funds,c.funds-260);
 assert.deepEqual(weaponOwnershipIssues(bought),[]);
});

test('D13 standing 70 distinguishes authorization from ownership, is enforced at purchase time',()=>{
 const c=newDispatchPilotCampaign(132,dispatchPresetDraft('career'));
 assert.equal(campaignWeaponQuote(c,'smg').status,'standing-locked');
 assert.match(campaignWeaponQuote(c,'smg').authorization,/Standing 70/);
 assert.strictEqual(buyWeapon(c,'smg'),c);
 const authorized={...c,dispatchDepartment:{...c.dispatchDepartment,standing:70}};
 assert.equal(campaignWeaponQuote(authorized,'smg').status,'ready');
 const next=buyWeapon(authorized,'smg');
 assert.equal(next.inventory.weapons.smg,1);
 assert.equal(next.funds,c.funds-260);
 assert.equal(campaignWeaponQuote(next,'smg').stock,1);
 const standingDropped={...next,dispatchDepartment:{...c.dispatchDepartment,standing:40}};
 assert.equal(campaignWeaponQuote(standingDropped,'smg').status,'standing-locked');
 assert.equal(standingDropped.inventory.weapons.smg,1,
  'standing drop never confiscates previously purchased gear');
});

test('D13 Open Department offers Dispatch inventory; creative is no-charge yet finite',()=>{
 const open=newDispatchPilotCampaign(133,dispatchPresetDraft('open'));
 assert.equal(campaignWeaponQuote(open,'smg').status,'ready');
 assert.equal(campaignWeaponQuote(open,'shotgun').status,'ready');
 assert.equal(campaignWeaponQuote(open,'rifle').status,'not-assessed');
 assert.equal(canAffordCampaignPurchase(open,open.funds+1),false);
 const creative=newDispatchPilotCampaign(133,dispatchPresetDraft('creative'));
 assert.equal(campaignWeaponQuote(creative,'shotgun').priceLabel,'NO CHARGE');
 assert.equal(canAffordCampaignPurchase({...creative,funds:0},3000),true);
 const free=buyWeapon({...creative,funds:0},'smg');
 assert.equal(free.funds,0);
 assert.equal(free.inventory.weapons.smg,creative.inventory.weapons.smg+1);
 assert.deepEqual(weaponOwnershipIssues(free),[]);
});

test('D13 frozen, unaffordable and saturated transactions do not charge money',()=>{
 const open=newDispatchPilotCampaign(134,dispatchPresetDraft('open'));
 const broke={...open,funds:1};
 assert.equal(campaignWeaponQuote(broke,'smg').status,'funds-locked');
 assert.strictEqual(buyWeapon(broke,'smg'),broke);
 const deployed=acceptContract(open,open.contracts[0].id);
 assert.equal(campaignWeaponQuote(deployed,'smg').status,'deployment-locked');
 assert.strictEqual(buyWeapon(deployed,'smg'),deployed);
 const atCap={...open,inventory:{...open.inventory,
  weapons:{...open.inventory.weapons,smg:124}}};
 assert.equal(campaignWeaponStockAtCapacity(atCap),true);
 assert.equal(campaignWeaponQuote(atCap,'smg').status,'armory-full');
 assert.strictEqual(buyWeapon(atCap,'smg'),atCap);
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
 assert.equal(campaignWeaponQuote(c,'smg').status,'reference-locked');
});

test('D13 legacy saves and original campaigns preserve their old procurement behavior',()=>{
 const old=newDispatchPilotCampaign(137);
 const legacy=readCampaign(JSON.stringify({...old,dispatchSetup:undefined}));
 assert.equal(dispatchDepartmentView(legacy).period,'2015');
 assert.equal(campaignWeaponQuote(legacy,'smg').status,'standing-locked');
 const nonDispatch=newCampaign(137,createCampaignRules('operations'));
 assert.equal(campaignWeaponQuote(nonDispatch,'rifle').status,'ready');
 assert.deepEqual(readCampaign(JSON.stringify(nonDispatch)),nonDispatch);
 const ui=source('src/campaign-ui.ts');
 assert.match(ui,/catalogWeaponOfferings\(c\)/);
 assert.match(ui,/dispatchDepartmentView\(c\)/);
 assert.match(ui,/this\.handlers\.buyCatalogWeapon\(quote\.presetId\)/);
 assert.doesNotMatch(ui,/CAMPAIGN_WEAPON_PLATFORMS/);
});
