import test from 'node:test';
import assert from 'node:assert/strict';
import {stageMagazines,magazinePlacementSummary,reloadMagazineDelay}
 from '../src/equipment-magazine-placement.ts';
import {newCampaign,readCampaign,moveCampaignMagazine,equipCampaignGear,
 acceptContract} from '../src/campaign-state.ts';
import {reserveRounds} from '../src/breach-magazines.ts';

test('manual magazine placement survives save/load and changes physical access',()=>{
 const base=newCampaign(18);
 const soldier=base.operators[0];
 const magazineId=soldier.magazines[0].id;
 const before=stageMagazines(soldier.magazines,soldier.loadout)[0];
 assert.equal(before.location,'rig');
 const next=moveCampaignMagazine(base,soldier.id,magazineId,'backpack');
 const moved=stageMagazines(next.operators[0].magazines,next.operators[0].loadout)[0];
 assert.equal(moved.id,magazineId);
 assert.equal(moved.location,'backpack');
 assert.ok(reloadMagazineDelay(moved)>reloadMagazineDelay(before));
 assert.equal(reserveRounds(next.operators[0].magazines),soldier.reserve);
 assert.deepEqual(readCampaign(JSON.stringify(next)),next);
});
test('equipment removal repacks only invalid locations; IDs and rounds survive',()=>{
 let c=newCampaign(27);
 const original=c.operators[0].magazines.map(m=>({...m}));
 c=moveCampaignMagazine(c,'rook',original[0].id,'backpack');
 c=equipCampaignGear(c,'rook','backpack','backpack-none');
 const after=stageMagazines(c.operators[0].magazines,c.operators[0].loadout);
 assert.notEqual(after[0].location,'backpack');
 assert.equal(reserveRounds(after),reserveRounds(original));
 assert.deepEqual(after.map(m=>m.id),original.map(m=>m.id));
 const summary=magazinePlacementSummary(c.operators[0].magazines,c.operators[0].loadout);
 assert.equal(Object.values(summary).reduce((sum,n)=>sum+n,0),original.length);
});
test('capacity prevents impossible moves and combat locks magazine changes',()=>{
 let c=newCampaign(33);
 c=equipCampaignGear(c,'rook','rig','rig-none');
 c=equipCampaignGear(c,'rook','belt','belt-light');
 c=equipCampaignGear(c,'rook','backpack','backpack-none');
 const mags=stageMagazines(c.operators[0].magazines,c.operators[0].loadout);
 assert.deepEqual(mags.map(m=>m.location),['belt','pocket','overflow']);
 assert.equal(moveCampaignMagazine(c,'rook',mags[2].id,'belt'),c);
 assert.equal(moveCampaignMagazine(c,'rook',mags[0].id,'not-a-location'),c);
 const accepted=acceptContract(c,c.contracts[0].id);
 assert.equal(moveCampaignMagazine(accepted,'rook',mags[0].id,'backpack'),accepted);
});
