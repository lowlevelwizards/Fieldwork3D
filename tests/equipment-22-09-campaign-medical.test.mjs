import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,readCampaign,acceptContract,resolveOperation,
 resupplyMedicalOperator,equipCampaignGear} from '../src/campaign-state.ts';
import {kitMedicalSupplies,medicalSupplyCount} from '../src/equipment-medical-supplies.ts';
test('22.09 new and legacy campaigns issue medical stock safely',()=>{
 const c=newCampaign(13);
 assert.equal(medicalSupplyCount(c.operators[0].medicalSupplies),3);
 const legacy=structuredClone(c);
 for(const person of legacy.operators)delete person.medicalSupplies;
 const migrated=readCampaign(JSON.stringify(legacy));
 assert.ok(migrated);assert.equal(medicalSupplyCount(migrated.operators[0].medicalSupplies),3);
});
test('22.09 settled mission conserves deployed supplies and reissues with HQ cost',()=>{
 let c=newCampaign(9),contract=c.contracts[0].id;
 c=acceptContract(c,contract);
 const report={id:'medical-22-09',contractId:contract,day:c.day,outcome:'success',
  grade:'A',elapsed:40,participatingIds:['rook'],casualties:[],
  objective:true,events:[],medicalRemaining:{rook:{
   'tourniquet':0,'field-dressing':1,'trauma-dressing':0}}};
 c=resolveOperation(c,report);
 const member=c.operators.find(o=>o.id==='rook');
 assert.equal(medicalSupplyCount(member.medicalSupplies),1);
 assert.equal(readCampaign(JSON.stringify(c)).operators[0].medicalSupplies['tourniquet'],0);
 const reserve=c.supplies.medical;
 c=resupplyMedicalOperator(c,'rook');
 assert.equal(c.supplies.medical,reserve-1);
 assert.equal(medicalSupplyCount(c.operators[0].medicalSupplies),3);
 assert.equal(resupplyMedicalOperator(c,'rook'),c);
});
test('22.09 changing medical kit does not create free items',()=>{
 let c=newCampaign(22);
 const prev=medicalSupplyCount(c.operators[0].medicalSupplies);
 c=equipCampaignGear(c,'rook','medical','medical-none');
 assert.equal(medicalSupplyCount(c.operators[0].medicalSupplies),0);
 c=equipCampaignGear(c,'rook','medical','medical-basic');
 assert.equal(medicalSupplyCount(c.operators[0].medicalSupplies),0);
 assert.equal(prev,medicalSupplyCount(kitMedicalSupplies(c.operators[0].loadout)));
});
test('22.09 medical reissue blocked by contract and no HQ reserves',()=>{
 let c=newCampaign(22);
 c={...c,operators:c.operators.map(o=>o.id==='rook'?
  {...o,medicalSupplies:{'tourniquet':0,'field-dressing':0,'trauma-dressing':0}}:o)};
 const locked=acceptContract(c,c.contracts[0].id);
 assert.equal(resupplyMedicalOperator(locked,'rook'),locked);
 assert.equal(resupplyMedicalOperator({...c,supplies:{...c.supplies,medical:0}},'rook')
   .operators[0].medicalSupplies['tourniquet'],0);
});
