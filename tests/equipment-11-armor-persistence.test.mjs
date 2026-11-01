import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,readCampaign,equipCampaignGear,armorRepairCost,
 repairCampaignArmor,acceptContract,resolveOperation}
 from '../src/campaign-state.ts';
import {initialArmorIntegrity} from '../src/equipment-armor.ts';
test('armor starts full and old campaign saves migrate safely',()=>{
 const c=newCampaign(54);
 assert.deepEqual(c.operators[0].armorCondition,
  initialArmorIntegrity(c.operators[0].loadout));
 const old=JSON.parse(JSON.stringify(c));
 for(const m of old.operators)delete m.armorCondition;
 assert.deepEqual(readCampaign(JSON.stringify(old)),c);
});
test('settlement retains worn protection even when mission failed',()=>{
 let c=newCampaign(11);const job=c.contracts[0];
 c=acceptContract(c,job.id);
 const report={id:'wear-11',contractId:job.id,day:c.day,
  outcome:'failure',grade:'C',elapsed:15,objective:false,
  participatingIds:['rook'],casualties:[],events:[],
  performance:[{id:'rook',shots:3,hits:0,pointShots:1,aimedShots:2,
    longHits:0,injuryStage:0,survived:true,magazine:10,reserve:30,
    armorIntegrity:2,helmetIntegrity:3}]};
 const result=resolveOperation(c,report);
 assert.deepEqual(result.operators[0].armorCondition,{torso:2,head:3});
 assert.deepEqual(resolveOperation(result,report),result);
 assert.deepEqual(readCampaign(JSON.stringify(result)),result);
});
test('swapping gear cannot replenish worn armor; repairs debit funds',()=>{
 const c=newCampaign(8);
 const worn={...c,operators:c.operators.map((o,i)=>i===0?
  {...o,armorCondition:{torso:1,head:2}}:o)};
 const changed=equipCampaignGear(worn,'rook','armor','armor-carrier');
 assert.equal(changed.operators[0].armorCondition.torso,1);
 const price=armorRepairCost(changed.operators[0]);
 assert.ok(price>0);
 const repaired=repairCampaignArmor(changed,'rook');
 assert.equal(repaired.funds,changed.funds-price);
 assert.deepEqual(repaired.operators[0].armorCondition,
  initialArmorIntegrity(repaired.operators[0].loadout));
 assert.equal(armorRepairCost(repaired.operators[0]),0);
 assert.equal(repairCampaignArmor(repaired,'rook'),repaired);
});
