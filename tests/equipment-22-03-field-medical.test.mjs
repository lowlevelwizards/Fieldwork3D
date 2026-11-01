import test from 'node:test';import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {kitMedicalSupplies,spendMedicalSupply,normalizedMedicalSupplies,medicalSupplyCount}
 from '../src/equipment-medical-supplies.ts';
import {newSession} from '../src/breach-game.ts';
import {initialRoster,applyRosterIdentity} from '../src/breach-roster.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
test('22.03 medical kits have finite, distinguishable inventory',()=>{
 let kit=initialEquipmentLoadout('carbine');
 const basic=kitMedicalSupplies(kit);
 assert.equal(medicalSupplyCount(basic),3);
 kit=setEquipmentChoice(kit,'medical','medical-trauma');
 assert.ok(medicalSupplyCount(kitMedicalSupplies(kit))>3);
 kit=setEquipmentChoice(kit,'medical','medical-none');
 assert.equal(medicalSupplyCount(kitMedicalSupplies(kit)),0);
});
test('22.03 no phantom supplies, exactly one unit spent',()=>{
 const supplies=kitMedicalSupplies(initialEquipmentLoadout('carbine'));
 assert.equal(spendMedicalSupply(supplies,'trauma-dressing'),false);
 assert.equal(spendMedicalSupply(supplies,'tourniquet'),true);
 assert.equal(spendMedicalSupply(supplies,'tourniquet'),false);
 assert.equal(supplies['tourniquet'],0);
 assert.deepEqual(normalizedMedicalSupplies({'tourniquet':100,'field-dressing':-1},
  kitMedicalSupplies(initialEquipmentLoadout('carbine'))),
  {'tourniquet':1,'field-dressing':0,'trauma-dressing':0});
});
test('22.03 Quick Play fresh kits and replay copy',()=>{
 const s=newSession(),roster=initialRoster();applyRosterIdentity(s,roster);
 const a=s.operators.find(o=>o.id==='rook');
 assert.equal(medicalSupplyCount(a.medicalSupplies),3);
 const frame=snapshot(s);spendMedicalSupply(a.medicalSupplies,'tourniquet');
 assert.equal(frame.actors.find(o=>o.id==='rook').medicalSupplies['tourniquet'],1);
 applyReplayFrame(s,frame);assert.equal(a.medicalSupplies['tourniquet'],1);
 const next=newSession();applyRosterIdentity(next,roster);
 assert.equal(next.operators.find(o=>o.id==='rook').medicalSupplies['tourniquet'],1);
});
