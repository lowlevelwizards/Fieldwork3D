import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,equipCampaignGear,
 equipCampaignOwnedPreset,buyCatalogWeapon,hireRecruit,equipCampaignWeaponFamilyPart,
 buyWeaponAttachment,equipCampaignWeaponAttachment,
 setCampaignWardrobe,applyCampaignKitPreset} from '../src/campaign-state.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {DISPATCH_PILOT_REFERENCE_ID} from '../src/dispatch-content-foundation.ts';
import {isDispatchPilot,mayChooseCampaignContent}
 from '../src/dispatch-campaign-eligibility.ts';
import {weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';
import {readCampaign} from '../src/campaign-state.ts';

test('D3.2 new pilot issues one existing SWAT look and consistent firearms',()=>{
 assert.equal(DISPATCH_PILOT_REFERENCE_ID,'us-swat-2015');
 const c=newDispatchPilotCampaign(107);
 assert.equal(c.rules?.template,'dispatch');
 assert.equal(c.operators.length,4);
 assert.deepEqual(weaponOwnershipIssues(c),[]);
 assert.equal(c.operators.every(o=>o.background==='Tactical Police'),true);
 for(const o of c.operators){
  assert.equal(o.weapon,'carbine');
  assert.equal(o.weaponConfiguration.build?.family,'ar');
  assert.equal(o.loadout.slots.primary,'primary-carbine');
  assert.equal(o.wardrobe?.styles.headwear,'mich-2001');
  assert.equal(o.wardrobe?.headwearColor,'black');
  assert.equal(o.wardrobe?.markings?.chest,'label-swat');
 }
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
});
test('D3.1 new Dispatch selections are guarded while existing saves survive',()=>{
 const c=newDispatchPilotCampaign(9),id=c.operators[0].id;
 const before=JSON.stringify(c);
 assert.equal(isDispatchPilot(c),true);
 assert.equal(mayChooseCampaignContent(c,'equipment','head-helmet','head'),true);
 assert.equal(mayChooseCampaignContent(c,'equipment','backpack-field','backpack'),false);
 assert.equal(equipCampaignGear(c,id,'backpack','backpack-field'),c);
 assert.equal(equipCampaignGear(c,id,'armor','armor-carrier'),c);
 assert.equal(equipCampaignOwnedPreset(c,id,'ar-m16a2'),c);
 assert.equal(equipCampaignOwnedPreset(c,id,'ak-aks74u'),c);
 assert.equal(buyCatalogWeapon(c,'ar-m16a2'),c);
 const recruit=hireRecruit(c);
 assert.equal(recruit.operators.at(-1)?.background,'Tactical Police');
 assert.equal(recruit.operators.at(-1)?.weapon,'carbine');
 assert.equal(recruit.funds,c.funds-450);
 assert.equal(buyWeaponAttachment(c,'optic-reflex'),c);
 assert.equal(equipCampaignWeaponAttachment(c,id,'optic','optic-reflex'),c);
 assert.equal(equipCampaignWeaponFamilyPart(c,id,'receiver','ak103'),c);
 assert.equal(setCampaignWardrobe(c,id,{version:1,styles:{}}),c);
 assert.equal(applyCampaignKitPreset(c,id,'any'),c);
 assert.equal(JSON.stringify(c),before);
});
test('D3.1 ordinary existing campaigns remain unrestricted by Dispatch policy',()=>{
 const c=newCampaign(14);
 assert.equal(isDispatchPilot(c),false);
 assert.equal(mayChooseCampaignContent(c,'equipment','backpack-field','backpack'),true);
 assert.notEqual(equipCampaignGear(c,c.operators[0].id,'backpack','backpack-field'),c);
 assert.notEqual(buyCatalogWeapon(c,'ar-m16a2'),c);
});
