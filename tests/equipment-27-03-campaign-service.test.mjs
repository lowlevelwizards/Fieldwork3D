import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,acceptContract,serviceCampaignWeapon,weaponServiceCost}
 from '../src/campaign-state.ts';
import {recordWeaponRounds} from '../src/equipment-weapon-identity.ts';
test('27.03 servicing restores physical serial and debits campaign funds exactly once',()=>{
 const c=newCampaign(22);
 const serial=c.operators[0].weaponSerialId;
 const worn={...c,inventory:{...c.inventory,
  serializedWeapons:c.inventory.serializedWeapons.map(w=>w.id===serial?
   recordWeaponRounds(w,225,1,'test-mission'):w)}};
 const gun=worn.inventory.serializedWeapons.find(w=>w.id===serial);
 assert.equal(gun.condition,97);
 assert.equal(weaponServiceCost(gun),52);
 const repaired=serviceCampaignWeapon(worn,'rook');
 assert.equal(repaired.funds,worn.funds-52);
 const after=repaired.inventory.serializedWeapons.find(w=>w.id===serial);
 assert.equal(after.condition,100);
 assert.equal(after.roundsFired,225);
 assert.equal(after.lastServiceDay,repaired.day);
 assert.equal(serviceCampaignWeapon(repaired,'rook'),repaired);
 assert.equal(worn.inventory.serializedWeapons.find(w=>w.id===serial).condition,97);
});
test('27.03 active contracts, pristine guns, and insufficient credits cannot service',()=>{
 const c=newCampaign(23);
 assert.equal(serviceCampaignWeapon(c,'rook'),c);
 const serial=c.operators[0].weaponSerialId;
 const gun=recordWeaponRounds(c.inventory.serializedWeapons.find(w=>w.id===serial),750,1);
 const worn={...c,inventory:{...c.inventory,
  serializedWeapons:c.inventory.serializedWeapons.map(w=>w.id===serial?gun:w)}};
 const contract=c.contracts.find(k=>k.status==='available');
 assert.equal(serviceCampaignWeapon(acceptContract(worn,contract.id),'rook').funds,worn.funds);
 assert.equal(serviceCampaignWeapon({...worn,funds:0},'rook').funds,0);
 assert.equal(serviceCampaignWeapon(worn,'not-operator'),worn);
});
