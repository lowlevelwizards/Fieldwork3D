import test from 'node:test';
import assert from 'node:assert/strict';
import {generatedLeadAcrossSameDoor} from '../src/breach-entry-coordination.ts';
import {recordCompletedGeneratedEntry,completedGeneratedEntryAt}
 from '../src/breach-completed-entry-leaf-yield.ts';

const p=(x,y)=>({x,y});
const door={id:'FRONT',kind:'hinged',a:p(0,0),b:p(50,0),
 hinge:'a',swing:1,open:true,openFraction:1.12};
const wait={id:'waiting',side:'blue',health:4,p:p(25,-21),plan:[]};
const goal=p(30,50);
const peer=(id,position,plan=[])=>({
 id,side:'blue',health:4,p:position,plan
});
const entry=(doorId,destination=p(25,50))=>[{kind:'move',entryDoorId:doorId,p:destination}];

test('R1.02: unrelated first living teammate cannot release a follower gate',()=>{
 const unrelated=peer('rook',p(25,30));
 const actualLead=peer('ash',p(25,30),entry('FRONT'));
 assert.equal(generatedLeadAcrossSameDoor(door,wait,goal,
   [unrelated,wait]),false);
 assert.equal(generatedLeadAcrossSameDoor(door,wait,goal,
   [unrelated,wait,actualLead]),true,
   'the actual threshold lead must be considered regardless of roster order');
 assert.equal(generatedLeadAcrossSameDoor(door,wait,goal,
   [actualLead,unrelated,wait]),true);
});

test('R1.02: no wrong door, same-side, dead or opposite-team lead grants entry',()=>{
 const badDoor=peer('bad-door',p(25,30),entry('SERVICE'));
 const nearSide=peer('near-side',p(25,-21),entry('FRONT'));
 const wrongDirection=peer('wrong-direction',p(25,30),entry('FRONT',p(25,-50)));
 const dead={...peer('dead',p(25,30),entry('FRONT')),health:0};
 const red={...peer('red',p(25,30),entry('FRONT')),side:'red'};
 for(const invalid of [badDoor,nearSide,wrongDirection,dead,red]){
  assert.equal(generatedLeadAcrossSameDoor(door,wait,goal,
    [invalid,wait]),false,invalid.id);
 }
 assert.equal(generatedLeadAcrossSameDoor(
   {...door,open:false},wait,goal,
   [peer('lead',p(25,30),entry('FRONT'))]),false);
 assert.equal(generatedLeadAcrossSameDoor(
   {...door,locked:true},wait,goal,
   [peer('lead',p(25,30),entry('FRONT'))]),false);
});

test('R1.02: only genuine completed same-door ENTRY remains a rest witness',()=>{
 const lead=peer('lead',p(25,30));
 assert.equal(completedGeneratedEntryAt(lead,'FRONT'),false);
 recordCompletedGeneratedEntry(lead,{id:22,entryDoorId:'FRONT',p:p(25,35)});
 assert.equal(completedGeneratedEntryAt(lead,'FRONT'),true);
 assert.equal(completedGeneratedEntryAt(lead,'SERVICE'),false);
 assert.equal(generatedLeadAcrossSameDoor(door,wait,goal,
  [wait,lead]),true);
 lead.plan=[{kind:'move',p:p(100,100)}];
 assert.equal(completedGeneratedEntryAt(lead,'FRONT'),false,
   'a later active order cannot keep an old completed entry witness alive');
 assert.equal(generatedLeadAcrossSameDoor(door,wait,goal,
  [wait,lead]),false);
});
