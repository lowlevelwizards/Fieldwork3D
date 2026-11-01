import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice,loadMovementScale,
 loadMobilityDescription,totalEquipmentMass} from '../src/equipment-loadouts.ts';
import {newCampaign,equipCampaignGear} from '../src/campaign-state.ts';

test('mobility penalty is bounded, monotonic, and computed from physical kit',()=>{
 let c=initialEquipmentLoadout();
 const standard=loadMovementScale(c);
 assert.ok(standard>0&&standard<=1);
 c=setEquipmentChoice(c,'armor','armor-none');
 c=setEquipmentChoice(c,'backpack','backpack-none');
 const light=loadMovementScale(c);
 assert.ok(light>=standard);
 c=setEquipmentChoice(c,'armor','armor-carrier');
 c=setEquipmentChoice(c,'backpack','backpack-field');
 c=setEquipmentChoice(c,'medical','medical-trauma');
 c=setEquipmentChoice(c,'utility','utility-breach');
 const heavy=loadMovementScale(c);
 assert.ok(heavy<standard);
 assert.ok(heavy>=.72);
 assert.ok(totalEquipmentMass(c)>totalEquipmentMass(initialEquipmentLoadout()));
 assert.ok(['LIGHT','STANDARD','HEAVY','OVERLOADED'].includes(loadMobilityDescription(c)));
});
test('campaign kit customization changes derived mass without altering ammo or health',()=>{
 const original=newCampaign(12);
 const next=equipCampaignGear(original,'rook','armor','armor-carrier');
 assert.ok(loadMovementScale(next.operators[0].loadout)<
  loadMovementScale(original.operators[0].loadout));
 assert.equal(original.operators[0].magazine,next.operators[0].magazine);
 assert.equal(original.operators[0].reserve,next.operators[0].reserve);
});
