import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,setWeaponAttachment,
 sameWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {quoteAttachmentTransfer}
 from '../src/equipment-weapon-transactions.ts';
import {newCampaign,readCampaign,buyWeaponAttachment,
 equipCampaignWeaponAttachment,purchaseAndEquipWeaponAttachment}
 from '../src/campaign-state.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {quoteCampaignArsenalEdit,commitCampaignArsenalEdit}
 from '../src/arsenal/campaign-adapter.ts';
const carbine=()=>initialWeaponConfiguration('carbine');
test('M2.6E stock quote is pure; returns obsolete unit before an authorized purchase',()=>{
 const old=setWeaponAttachment(carbine(),'optic','optic-reflex');
 const next=setWeaponAttachment(old,'optic','optic-magnified');
 const stock={...Object.fromEntries([['optic-reflex',0],['optic-magnified',0]])};
 const raw=structuredClone(stock);
 const q=quoteAttachmentTransfer(stock,old,next,500,true);
 assert.equal(q.valid,true);
 assert.equal(q.canCommit,true);
 assert.equal(q.cost,220);
 assert.deepEqual(q.purchases,[{partId:'optic-magnified',price:220}]);
 assert.equal(q.stockAfter['optic-reflex'],1);
 assert.equal(q.stockAfter['optic-magnified'],0);
 assert.deepEqual(stock,raw);
 assert.ok(!sameWeaponConfiguration(old,next));
});
test('M2.6E existing stored unit installs without purchase and cannot duplicate',()=>{
 const start=carbine(),next=setWeaponAttachment(start,'optic','optic-reflex');
 const q=quoteAttachmentTransfer({'optic-reflex':1},start,next,0,false);
 assert.equal(q.valid,true);assert.equal(q.canCommit,true);
 assert.equal(q.cost,0);
 assert.equal(q.stockAfter['optic-reflex'],0);
 const same=quoteAttachmentTransfer(q.stockAfter,next,next,0,false);
 assert.equal(same.cost,0);
 assert.equal(same.stockAfter['optic-reflex'],0);
 const back=quoteAttachmentTransfer(same.stockAfter,next,start,0,false);
 assert.equal(back.stockAfter['optic-reflex'],1);
});
test('M2.6E unavailable stock/negative funds/capacity fail without mutation',()=>{
 const start=carbine(),next=setWeaponAttachment(start,'optic','optic-reflex');
 const stock={'optic-reflex':0};
 assert.equal(quoteAttachmentTransfer(stock,start,next,999,false).valid,false);
 assert.equal(quoteAttachmentTransfer(stock,start,next,0,true).canCommit,false);
 assert.equal(quoteAttachmentTransfer(stock,start,next,-1,true).valid,false);
 assert.deepEqual(stock,{'optic-reflex':0});
 const mounted=setWeaponAttachment(start,'optic','optic-reflex');
 assert.equal(quoteAttachmentTransfer({'optic-reflex':999},mounted,start,
  500,false).valid,false);
});
test('M2.6E a coupled HK optic + mounting adapter is quoted as one purchase',()=>{
 const start=initialWeaponConfiguration('smg');
 const mid=setWeaponAttachment(start,'optic','optic-reflex');
 const previous={...mid,slots:{...mid.slots,optic:'optic-irons'}};
 const next={...mid,slots:{...mid.slots,opticMount:'optic-hk-claw'}};
 const q=quoteAttachmentTransfer({'optic-reflex':0,'optic-hk-claw':0},
  previous,next,1000,true);
 assert.equal(q.cost,230);
 assert.deepEqual(q.purchases.map(x=>x.partId),
  ['optic-hk-claw','optic-reflex']);
 assert.equal(q.canCommit,true);
});
test('M2.6F direct buy/equip matches Workbench quote and preserves serialized identity',()=>{
 const c=newCampaign(602),op=c.operators.find(x=>x.id==='rook');
 assert.ok(op);
 const recipe=arsenalRecipeFromLegacy(op.weaponConfiguration);assert.ok(recipe);
 const requested={...recipe,accessories:{...recipe.accessories,optic:'optic-reflex'}};
 const quoted=quoteCampaignArsenalEdit(c,op.id,requested);
 assert.equal(quoted.canCommit,true);assert.equal(quoted.cost,120);
 const direct=purchaseAndEquipWeaponAttachment(c,op.id,'optic','optic-reflex');
 const fromWorkbench=commitCampaignArsenalEdit(c,op.id,requested).state;
 assert.equal(direct.funds,fromWorkbench.funds);
 assert.deepEqual(direct.inventory.attachments,fromWorkbench.inventory.attachments);
 assert.equal(direct.operators.find(x=>x.id===op.id).weaponSerialId,op.weaponSerialId);
 assert.equal(fromWorkbench.operators.find(x=>x.id===op.id).weaponSerialId,op.weaponSerialId);
 assert.deepEqual(direct.operators.find(x=>x.id===op.id).magazines,op.magazines);
 assert.deepEqual(readCampaign(JSON.stringify(direct)),direct);
 const repeating=purchaseAndEquipWeaponAttachment(direct,op.id,'optic','optic-reflex');
 assert.strictEqual(repeating,direct,'already equipped part cannot charge twice');
});
test('M2.6F stock-only Armory and direct purchase reuse identical single stock item',()=>{
 const original=newCampaign(603),held=buyWeaponAttachment(original,'optic-reflex');
 const paidFunds=held.funds;
 const equipped=equipCampaignWeaponAttachment(held,'rook','optic','optic-reflex');
 assert.equal(equipped.funds,paidFunds);
 assert.equal(equipped.inventory.attachments['optic-reflex'],0);
 const restored=equipCampaignWeaponAttachment(equipped,'rook','optic','optic-irons');
 assert.equal(restored.inventory.attachments['optic-reflex'],1);
 const reinstall=purchaseAndEquipWeaponAttachment(restored,'rook','optic','optic-reflex');
 assert.equal(reinstall.funds,paidFunds);
 assert.equal(reinstall.inventory.attachments['optic-reflex'],0);
});
