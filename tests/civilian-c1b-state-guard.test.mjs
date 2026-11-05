import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian,civilianCondition,setCivilianState}
 from '../src/breach-civilian-types.ts';
const mk=()=>createCivilian({id:'civ:condition',role:'visitor',
 persona:'steady',activity:'idle',position:{x:40,y:40},
 heading:0,roomId:'r',appearanceSeed:4});
test('E5-C1b physical condition cannot be accidentally overwritten by routine',()=>{
 const c=mk();
 assert.equal(civilianCondition(c),'healthy');
 assert.equal(setCivilianState(c,'fleeing',3),true);
 c.health=1;c.injuryStage=1;
 assert.equal(civilianCondition(c),'injured');
 assert.equal(setCivilianState(c,'wounded',4),true);
 assert.equal(setCivilianState(c,'routine',5),false);
 assert.equal(c.state,'wounded');
});
test('E5-C1b incapacitated person cannot flee or restart after replay state correction',()=>{
 const c=mk();c.health=0;c.injuryStage=3;
 assert.equal(setCivilianState(c,'incapacitated',2),true);
 assert.equal(setCivilianState(c,'fleeing',3),false);
 assert.equal(setCivilianState(c,'compliant',4),false);
 assert.equal(c.state,'incapacitated');
});
test('E5-C1b transition clears stale movement destination',()=>{
 const c=mk();c.goal={x:150,y:150};c.nav=[{x:45,y:45}];
 assert.equal(setCivilianState(c,'compliant',2),true);
 assert.equal(c.goal,null);
 assert.deepEqual(c.nav,[]);
 assert.equal(c.stateSince,2);
});
