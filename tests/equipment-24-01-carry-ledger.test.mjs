import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {carryPlacementLedger,carryCapacityReport,carriedItemPlacement}
 from '../src/equipment-carry-placement.ts';
import {magazineKit} from '../src/breach-magazines.ts';
test('24.01 equipment capacity never overcommitted across medical and tool items',()=>{
 let kit=initialEquipmentLoadout('carbine');
 kit=setEquipmentChoice(kit,'utility','utility-breach');
 const mags=magazineKit('rook','carbine',180,30);
 const result=carryCapacityReport(kit,mags);
 for(const loc of ['rig','belt','pocket','backpack'])
  assert.ok(result.used[loc]<=result.capacity[loc],loc+' over capacity');
 assert.ok(result.placements.some(p=>p.kind==='medical'));
 assert.ok(result.placements.some(p=>p.kind==='utility'));
 assert.equal(result.placements.filter(p=>p.kind==='magazine').length,mags.length);
});
test('24.01 increased trauma pack volume selects accessible real containers',()=>{
 let kit=initialEquipmentLoadout('carbine');
 kit=setEquipmentChoice(kit,'medical','medical-trauma');
 const placement=carriedItemPlacement(kit,[], 'medical');
 assert.equal(placement.spaces,2);
 assert.equal(placement.location,'backpack');
 assert.ok(placement.accessSeconds>=.8);
});
test('24.01 full kit uses explicit slow overflow, no phantom or duplicate slots',()=>{
 let kit=initialEquipmentLoadout('carbine');
 kit=setEquipmentChoice(kit,'backpack','backpack-none');
 kit=setEquipmentChoice(kit,'rig','rig-none');
 kit=setEquipmentChoice(kit,'belt','belt-light');
 const mags=magazineKit('rook','carbine',300,30);
 const placed=carryPlacementLedger(kit,mags);
 const ids=placed.map(p=>p.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(placed.some(p=>p.location==='overflow'));
 assert.ok(placed.every(p=>p.accessSeconds>=0&&Number.isFinite(p.accessSeconds)));
});
test('24.01 no carried medical or utility slots means no imaginary stock',()=>{
 let kit=initialEquipmentLoadout('carbine');
 kit=setEquipmentChoice(kit,'medical','medical-none');
 kit=setEquipmentChoice(kit,'utility','utility-none');
 assert.equal(carryPlacementLedger(kit).filter(p=>p.kind!=='magazine').length,0);
});
