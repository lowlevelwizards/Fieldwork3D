import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 newCampaign,readCampaign,acceptContract,resolveOperation,
 equipCampaignFieldInventory,equipCampaignPreGoFieldInventory,
 equipCampaignGear,purchaseFieldStock,saveCampaignKitPreset,applyCampaignKitPreset
} from '../src/campaign-state.ts';
import {quoteCampaignFieldStockChange,replenishCampaignFieldPieces,
 FIELD_STOCK_PACKS,FIELD_STOCK_LIMIT}
 from '../src/equipment-campaign-field-stock.ts';
import {quoteCampaignSquadRefill,refillCampaignSquad}
 from '../src/equipment-campaign-squad-refill.ts';
import {fieldQuantity} from '../src/equipment-field-inventory.ts';

const kit=(c,id='rook')=>c.operators.find(o=>o.id===id).loadout;
const count=(c,id,item)=>fieldQuantity(kit(c,id).fieldInventory,item);
const withField=(c,stacks,id='rook')=>equipCampaignFieldInventory(c,id,{version:1,stacks});
const stock=(c,key)=>c.supplies[key]+c.operators.reduce((n,o)=>
 n+fieldQuantity(o.loadout.fieldInventory,key==='wedges'?'wedge':'zip-tie'),0);
const issuedCuff={itemId:'zip-tie',quantity:2,location:'backpack'};
test('F5.2 new Campaign has HQ reserves; historic save migrates missing stock as zero',()=>{
 const c=newCampaign(812);
 assert.equal(c.supplies.wedges,8);assert.equal(c.supplies.cuffs,12);
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
 const raw=structuredClone(c);delete raw.supplies.wedges;delete raw.supplies.cuffs;
 const old=readCampaign(JSON.stringify(raw));
 assert.equal(old.supplies.wedges,0);assert.equal(old.supplies.cuffs,0);
 const corrupt=structuredClone(c);corrupt.supplies.cuffs=10001;
 assert.equal(readCampaign(JSON.stringify(corrupt)),null);
 const invalid=structuredClone(c);invalid.supplies.wedges=-1;
 assert.equal(readCampaign(JSON.stringify(invalid)),null);
});
test('F5.2 issue, move and return one physical piece never create combined stock',()=>{
 const c=newCampaign(813),start=stock(c,'cuffs');
 const added=withField(c,[{itemId:'flashbang',quantity:1,location:'rig'},
  issuedCuff]);
 assert.notEqual(added,c,'operator should be able to carry an issued pair');
 assert.equal(added.supplies.cuffs,c.supplies.cuffs-2);
 assert.equal(stock(added,'cuffs'),start);
 assert.equal(count(added,'rook','zip-tie'),2);
 const moved=withField(added,[{itemId:'flashbang',quantity:1,location:'rig'},
  {...issuedCuff,location:'belt'}]);
 assert.equal(stock(moved,'cuffs'),start);
 assert.equal(moved.supplies.cuffs,added.supplies.cuffs);
 const returned=withField(moved,[{itemId:'flashbang',quantity:1,location:'rig'}]);
 assert.equal(returned.supplies.cuffs,c.supplies.cuffs);
 assert.equal(stock(returned,'cuffs'),start);
 assert.equal(count(returned,'rook','zip-tie'),0);
 assert.deepEqual(readCampaign(JSON.stringify(returned)),returned);
});
test('F5.2 insufficient HQ stock blocks whole issue atomically',()=>{
 let c=newCampaign(814);
 c={...c,supplies:{...c.supplies,cuffs:1}};
 const next=withField(c,[{itemId:'flashbang',quantity:1,location:'rig'},
  issuedCuff]);
 assert.equal(next,c);
 assert.equal(next.supplies.cuffs,1);
 const bad=quoteCampaignFieldStockChange(c,kit(c),{
  ...kit(c),fieldInventory:{version:1,stacks:[issuedCuff]}});
 assert.equal(bad.ok,false);
});
test('F5.2 paid packs charge once and cap/contract protect purchase',()=>{
 const c=newCampaign(815),next=purchaseFieldStock(c,'wedges');
 assert.equal(next.supplies.wedges,c.supplies.wedges+FIELD_STOCK_PACKS.wedges.quantity);
 assert.equal(next.funds,c.funds-FIELD_STOCK_PACKS.wedges.price);
 const second=purchaseFieldStock(next,'cuffs');
 assert.equal(second.supplies.cuffs,next.supplies.cuffs+FIELD_STOCK_PACKS.cuffs.quantity);
 assert.equal(second.funds,next.funds-FIELD_STOCK_PACKS.cuffs.price);
 const capped={...c,supplies:{...c.supplies,cuffs:FIELD_STOCK_LIMIT}};
 assert.equal(purchaseFieldStock(capped,'cuffs'),capped);
 const locked=acceptContract(c,c.contracts[0].id);
 assert.equal(purchaseFieldStock(locked,'wedges'),locked);
});
test('F5.2 mission loss preserves desired placement, refills only with HQ stock',()=>{
 let c=newCampaign(816);
 c=withField(c,[{itemId:'flashbang',quantity:1,location:'rig'},
  {itemId:'zip-tie',quantity:2,location:'backpack'}]);
 const before=c.supplies.cuffs;
 const job=c.contracts[0];c=acceptContract(c,job.id);
 const report={id:'f52-mission',contractId:job.id,day:c.day,outcome:'success',
  grade:'A',elapsed:60,participatingIds:['rook'],casualties:[],
  objective:true,events:[],fieldRemaining:{rook:{version:1,stacks:[
   {itemId:'flashbang',quantity:1,location:'rig'},
   {itemId:'zip-tie',quantity:1,location:'backpack'}]}}};
 const settled=resolveOperation(c,report);
 assert.equal(count(settled,'rook','zip-tie'),1);
 assert.equal(fieldQuantity(settled.operators[0].fieldRestockLayout,'zip-tie'),2);
 assert.equal(settled.supplies.cuffs,before,'mission consumption never returns spent stock');
 const quote=quoteCampaignSquadRefill(settled);
 assert.equal(quote.cuffsWanted,1);
 assert.equal(quote.cuffsIssued,1);
 const restocked=refillCampaignSquad(settled);
 assert.equal(count(restocked,'rook','zip-tie'),2);
 assert.equal(restocked.supplies.cuffs,before-1);
 assert.equal(stock(restocked,'cuffs'),stock(settled,'cuffs'));
 assert.equal(restocked.operators[0].loadout.fieldInventory.stacks
  .find(s=>s.itemId==='zip-tie').location,'backpack');
 assert.equal(refillCampaignSquad(restocked),restocked);
});
test('F5.2 capacity or zero stock prevents phantom restock',()=>{
 let c=newCampaign(817);
 c=withField(c,[{itemId:'flashbang',quantity:1,location:'rig'},issuedCuff]);
 c={...c,supplies:{...c.supplies,cuffs:0},
  operators:c.operators.map(o=>o.id==='rook'?{...o,loadout:{...o.loadout,
   fieldInventory:{version:1,stacks:[{itemId:'flashbang',quantity:1,location:'rig'}]}}}:o)};
 const quote=replenishCampaignFieldPieces(c,'rook');
 assert.equal(quote.cuffsWanted,2);assert.equal(quote.cuffsIssued,0);
 assert.equal(quote.cuffsShort,2);assert.equal(quote.result,c);
});
test('F5.2 field edit and stock purchase respect accepted contract GO phase',()=>{
 let c=newCampaign(818);
 const job=c.contracts[0];c=acceptContract(c,job.id);
 const added=equipCampaignPreGoFieldInventory(c,'rook',{
  version:1,stacks:[{itemId:'flashbang',quantity:1,location:'rig'},issuedCuff]});
 assert.equal(added.supplies.cuffs,c.supplies.cuffs-2);
 assert.equal(count(added,'rook','zip-tie'),2);
 assert.equal(equipCampaignFieldInventory(c,'rook',{
  version:1,stacks:[issuedCuff]}),c);
 assert.equal(purchaseFieldStock(c,'cuffs'),c);
 assert.equal(replenishCampaignFieldPieces(c,'rook').result,c);
});
test('F5.2 custom kit and presets cannot mint wedges or cuffs',()=>{
 let c=newCampaign(819);
 // Save a known issued kit as the authored recipe.
 c=withField(c,[{itemId:'flashbang',quantity:1,location:'rig'},issuedCuff]);
 const before=c.supplies.cuffs;
 c=saveCampaignKitPreset(c,'rook','restrained');
 const preset=c.kitPresets.at(-1);
 const cleared=withField(c,[{itemId:'flashbang',quantity:1,location:'rig'}]);
 const restored=applyCampaignKitPreset(cleared,'rook',preset.id);
 assert.equal(restored.supplies.cuffs,before);
 assert.equal(count(restored,'rook','zip-tie'),2);
 const empty={...cleared,supplies:{...cleared.supplies,cuffs:0}};
 assert.equal(applyCampaignKitPreset(empty,'rook',preset.id),empty);
 // Enabling wedge tool has to debit the actual two inserted wedges.
 const initial=newCampaign(820);
 const geared=equipCampaignGear(initial,'rook','utility','utility-wedge');
 if(geared!==initial)
  assert.equal(geared.supplies.wedges,initial.supplies.wedges-2);
 else assert.equal(initial.supplies.wedges,8,
  'an inability to fit the tool cannot spend inventory');
});
test('F5.2 UI wiring: reserve source, individual and squad quote, no free bypass',()=>{
 const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const ui=src('src/campaign-ui.ts'),flow=src('src/breach-campaign-flow.ts');
 const state=src('src/campaign-state.ts');
 assert.match(ui,/maxWedges:c\.supplies\.wedges,maxCuffs:c\.supplies\.cuffs/);
 assert.match(ui,/FIELD_STOCK_PACKS\.wedges\.name/);
 assert.match(ui,/this\.handlers\.resupplyField/);
 assert.match(flow,/purchaseFieldStock\(c,'wedges'\)/);
 assert.match(flow,/replenishCampaignFieldPieces\(c,id\)\.result/);
 assert.match(state,/quoteCampaignFieldStockChange\(c,member\.loadout,/);
 assert.match(state,/fieldRestockLayout:current\.fieldRestockLayout/);
});
