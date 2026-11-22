import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 newCampaign,readCampaign,acceptContract,
 equipCampaignFieldInventory,equipCampaignPreGoFieldInventory,
 equipCampaignGear,purchaseFieldStock,saveCampaignKitPreset,applyCampaignKitPreset
} from '../src/campaign-state.ts';
import {quoteCampaignFieldStockChange,replenishCampaignFieldPieces,
 FIELD_STOCK_PACKS,FIELD_STOCK_LIMIT}
 from '../src/equipment-campaign-field-stock.ts';
import {quoteCampaignSquadRefill,refillCampaignSquad}
 from '../src/equipment-campaign-squad-refill.ts';
import {fieldQuantity,readFieldInventory,FIELD_ITEMS}
 from '../src/equipment-field-inventory.ts';

const kit=(c,id='rook')=>c.operators.find(o=>o.id===id).loadout;
const count=(c,id,item)=>fieldQuantity(kit(c,id).fieldInventory,item);
const withField=(c,stacks,id='rook')=>
 equipCampaignFieldInventory(c,id,{version:1,stacks});
const legacyCuff={itemId:'zip-tie',quantity:2,location:'backpack'};
const wedges={itemId:'wedge',quantity:2,location:'belt'};

test('F5.2 old Campaign HQ cuff reserve fields remain readable without inventing field gear',()=>{
 const c=newCampaign(812);
 assert.equal(c.supplies.wedges,8);
 assert.equal(c.supplies.cuffs,12);
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
 const raw=structuredClone(c);
 delete raw.supplies.wedges;delete raw.supplies.cuffs;
 const old=readCampaign(JSON.stringify(raw));
 assert.equal(old.supplies.wedges,0);
 assert.equal(old.supplies.cuffs,0);
 const corrupt=structuredClone(c);corrupt.supplies.cuffs=10001;
 assert.equal(readCampaign(JSON.stringify(corrupt)),null);
 const invalid=structuredClone(c);invalid.supplies.wedges=-1;
 assert.equal(readCampaign(JSON.stringify(invalid)),null);
});

test('F5.2 legacy cuffs cannot be equipped or subtract campaign stock',()=>{
 const c=newCampaign(813);
 const next=withField(c,[{itemId:'flashbang',quantity:1,location:'rig'},legacyCuff]);
 assert.equal(next,c,'cuff item is no longer issuable');
 assert.equal(count(next,'rook','zip-tie'),0);
 assert.equal(next.supplies.cuffs,c.supplies.cuffs);
 assert.equal(FIELD_ITEMS['zip-tie'].usable,false);
 const read=readFieldInventory({version:1,stacks:[legacyCuff]},kit(c));
 assert.equal(fieldQuantity(read,'zip-tie'),0);
});

test('F5.2 wedge stock still has exact atomic issue and return accounting',()=>{
 const c=newCampaign(814);
 const before=kit(c);
 const issued={...before,fieldInventory:{version:1,stacks:[wedges]}};
 const issue=quoteCampaignFieldStockChange(c,before,issued);
 assert.equal(issue.ok,true);
 assert.equal(issue.stock.wedges,c.supplies.wedges-2);
 assert.equal(issue.wedgesIssued,2);
 assert.equal(issue.cuffsIssued,0);
 const returned=quoteCampaignFieldStockChange(
  {...c,supplies:issue.stock},issued,before);
 assert.equal(returned.ok,true);
 assert.equal(returned.stock.wedges,c.supplies.wedges);
 assert.equal(returned.wedgesReturned,2);
});

test('F5.2 only wedges are purchasable; legacy cuff purchase is inert',()=>{
 const c=newCampaign(815),next=purchaseFieldStock(c,'wedges');
 assert.equal(next.supplies.wedges,c.supplies.wedges+FIELD_STOCK_PACKS.wedges.quantity);
 assert.equal(next.funds,c.funds-FIELD_STOCK_PACKS.wedges.price);
 assert.equal(purchaseFieldStock(next,'cuffs'),next,
  'restraints must never charge credits or increase unused cuff reserves');
 const capped={...c,supplies:{...c.supplies,wedges:FIELD_STOCK_LIMIT}};
 assert.equal(purchaseFieldStock(capped,'wedges'),capped);
 const locked=acceptContract(c,c.contracts[0].id);
 assert.equal(purchaseFieldStock(locked,'wedges'),locked);
});

test('F5.2 physical wedge refills never issue legacy cuffs',()=>{
 const c=newCampaign(816);
 const geared=equipCampaignGear(c,'rook','utility','utility-wedge');
 assert.ok(geared.supplies.wedges<=c.supplies.wedges);
 assert.equal(geared.supplies.cuffs,c.supplies.cuffs);
 const quote=quoteCampaignSquadRefill(geared);
 assert.equal(quote.cuffsWanted,0);
 assert.equal(quote.cuffsIssued,0);
 const stocked=refillCampaignSquad(geared);
 assert.equal(stocked.supplies.cuffs,geared.supplies.cuffs);
 assert.equal(count(stocked,'rook','zip-tie'),0);
});

test('F5.2 even a stale legacy restock preference cannot mint cuffs',()=>{
 let c=newCampaign(817);
 c={...c,operators:c.operators.map(o=>o.id==='rook'?{
  ...o,fieldRestockLayout:{version:1,stacks:[legacyCuff]}
 }:o)};
 const q=replenishCampaignFieldPieces(c,'rook');
 assert.equal(q.cuffsWanted,0);
 assert.equal(q.cuffsIssued,0);
 assert.equal(q.cuffsShort,0);
 assert.equal(q.result,c);
});

test('F5.2 accepted contract allows legitimate pre-GO gear, not consumable cuffs',()=>{
 const c=newCampaign(818),deployed=acceptContract(c,c.contracts[0].id);
 const attempted=equipCampaignPreGoFieldInventory(deployed,'rook',{
  version:1,stacks:[{itemId:'flashbang',quantity:1,location:'rig'},legacyCuff]});
 assert.equal(attempted,deployed);
 assert.equal(equipCampaignFieldInventory(deployed,'rook',
  {version:1,stacks:[legacyCuff]}),deployed);
 assert.equal(purchaseFieldStock(deployed,'cuffs'),deployed);
 assert.equal(replenishCampaignFieldPieces(deployed,'rook').result,deployed);
});

test('F5.2 custom presets never turn archived cuffs into spendable gadgets',()=>{
 let c=newCampaign(819);
 c=saveCampaignKitPreset(c,'rook','default');
 const preset=c.kitPresets.at(-1);
 assert.ok(preset);
 const restored=applyCampaignKitPreset(c,'rook',preset.id);
 assert.equal(count(restored,'rook','zip-tie'),0);
 assert.equal(restored.supplies.cuffs,c.supplies.cuffs);
 const custom=withField(c,[legacyCuff]);
 assert.equal(custom,c);
});

test('F5.2 UI wiring hides obsolete cuff purchase/refill, retains wedge stock ownership',()=>{
 const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const ui=src('src/campaign-ui.ts'),flow=src('src/breach-campaign-flow.ts');
 const state=src('src/campaign-state.ts');
 assert.match(ui,/maxWedges:c\.supplies\.wedges/);
 assert.doesNotMatch(ui,/maxCuffs:c\.supplies\.cuffs/);
 assert.match(ui,/FIELD_STOCK_PACKS\.wedges\.name/);
 assert.doesNotMatch(ui,/\[FIELD_STOCK_PACKS\.cuffs\.name,/);
 assert.match(ui,/this\.handlers\.resupplyField/);
 assert.match(flow,/purchaseFieldStock\(c,'wedges'\)/);
 assert.match(flow,/replenishCampaignFieldPieces\(c,id\)\.result/);
 assert.match(state,/quoteCampaignFieldStockChange\(c,member\.loadout,/);
});
