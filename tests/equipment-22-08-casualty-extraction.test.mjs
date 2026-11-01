import test from 'node:test';import assert from 'node:assert/strict';
import {transferMedicalSupply,kitMedicalSupplies} from '../src/equipment-medical-supplies.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {newSession,debrief} from '../src/breach-game.ts';
import {newCampaign,acceptContract,resolveOperation} from '../src/campaign-state.ts';
test('22.08 physical medical supply transfers conserve both inventories',()=>{
 const basic=kitMedicalSupplies(initialEquipmentLoadout('carbine'));
 const donor={...basic},receiver={...basic,'tourniquet':0};
 const sum=donor['tourniquet']+receiver['tourniquet'];
 assert.equal(transferMedicalSupply(donor,receiver,basic),'tourniquet');
 assert.equal(donor['tourniquet']+receiver['tourniquet'],sum);
 assert.equal(transferMedicalSupply(donor,receiver,basic),null);
});
test('22.08 debrief credits an actually evacuated downed teammate',()=>{
 const s=newSession(),a=s.operators.find(o=>o.id==='moss');
 a.health=0;a.injuryStage=3;a.p={...s.scenario.extract};
 assert.ok(debrief(s).evacuatedCasualties.includes('moss'));
 a.p={x:30,y:30};
 assert.equal(debrief(s).evacuatedCasualties.includes('moss'),false);
});
test('22.08 Campaign recognizes extraction without duplicating settlement',()=>{
 const base=newCampaign(77),contract=base.contracts[0];
 const accepted=acceptContract(base,contract.id);
 const report={id:'22.08',contractId:contract.id,day:accepted.day,
  outcome:'success',grade:'B',elapsed:30,participatingIds:['rook','moss'],
  casualties:['rook','moss'],stabilizedIds:['rook','moss'],
  evacuatedIds:['rook'],criticalIds:[],objective:true,events:[]};
 const next=resolveOperation(accepted,report);
 assert.ok(next.operators.find(o=>o.id==='moss').recoveryDays>
  next.operators.find(o=>o.id==='rook').recoveryDays);
 assert.equal(resolveOperation(next,report),next);
});
