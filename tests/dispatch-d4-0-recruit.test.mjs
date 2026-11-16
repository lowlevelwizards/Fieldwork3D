import test from 'node:test';
import assert from 'node:assert/strict';
import {hireRecruit,newCampaign,acceptContract,resolveOperation} from '../src/campaign-state.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {issueDispatchPilotOperator} from '../src/dispatch-pilot-operator.ts';
import {weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';
import {readCampaign} from '../src/campaign-state.ts';

test('D4.0 recruits get the same supported SWAT issue without losing personal career data',()=>{
 const original=newDispatchPilotCampaign(321),before=JSON.stringify(original);
 const c=hireRecruit(original);
 assert.notEqual(c,original);
 assert.equal(c.operators.length,5);
 assert.equal(c.funds,original.funds-450);
 assert.equal(JSON.stringify(original),before);
 const member=c.operators.at(-1),first=c.operators[0];
 assert.equal(member.status,'reserve');
 assert.equal(member.joinedDay,c.day);
 assert.equal(member.background,'Tactical Police');
 assert.equal(member.weapon,'carbine');
 assert.equal(member.weaponConfiguration.build?.family,'ar');
 assert.deepEqual(member.loadout.slots,first.loadout.slots);
 assert.equal(member.wardrobe?.markings?.chest,'label-swat');
 assert.equal(member.medicalSupplies['tourniquet'],first.medicalSupplies['tourniquet']);
 assert.ok(member.magazines.length>0);
 assert.ok(member.weaponSerialId);
 assert.equal(new Set(c.operators.map(o=>o.weaponSerialId)).size,5);
 assert.deepEqual(weaponOwnershipIssues(c),[]);
 assert.equal(c.journal.at(-1)?.kind,'joined');
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
});

test('D4.0 issue factory retains identity and never inherits another operator serial',()=>{
 const c=newDispatchPilotCampaign(100),person=c.operators[0];
 const custom={...person,callsign:'CUSTOM',missions:12,successful:7,
  weaponSerialId:'existing-serial'};
 const next=issueDispatchPilotOperator(custom);
 assert.equal(next.callsign,'CUSTOM');
 assert.equal(next.missions,12);
 assert.equal(next.successful,7);
 assert.equal(next.weaponSerialId,null);
 assert.equal(next.weapon,'carbine');
 assert.notStrictEqual(next.loadout,c.operators[0].loadout);
});

test('D4.0 recruitment still obeys campaign constraints and leaves legacy kits alone',()=>{
 const d={...newDispatchPilotCampaign(72),funds:2700};
 let next=d;
 for(let i=0;i<4;i++)next=hireRecruit(next);
 assert.equal(next.operators.length,8);
 assert.equal(hireRecruit(next),next);
 const active=acceptContract(d,d.contracts[0].id);
 assert.equal(hireRecruit(active),active);
 const old=newCampaign(72);
 const legacy=hireRecruit(old);
 assert.equal(legacy.operators.length,5);
 assert.equal(legacy.operators[4].background,'Patrol');
 assert.deepEqual(weaponOwnershipIssues(legacy),[]);
});
