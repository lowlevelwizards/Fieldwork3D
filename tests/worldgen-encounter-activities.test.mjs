import test from 'node:test';
import assert from 'node:assert/strict';
import {assignEncounterActivities} from '../src/worldgen/encounter-activities.ts';
test('initial activities face appropriate furniture and sentries remain alert',()=>{
 const site={rooms:[{kind:'room',id:'a',x:0,y:0,w:180,h:180}],
  cover:[{x:95,y:50,w:30,h:20,fixture:'desk'}],
  doors:[{a:{x:150,y:0},b:{x:170,y:0}}]};
 const occupants=[{id:'o',role:'occupant',position:{x:50,y:50},heading:0,
  activity:'idle',readiness:'attentive'}];
 const result=assignEncounterActivities(site,occupants,'routine',42);
 assert.equal(result[0].activity,'working');
 assert.equal(result[0].readiness,'relaxed');
 assert.equal(result[0].heading,0);
 assert.deepEqual(result,assignEncounterActivities(site,occupants,'routine',42));
 const guard=assignEncounterActivities(site,[{...occupants[0],role:'sentry'}],
  'defensive',42)[0];
 assert.equal(guard.readiness,'prepared');assert.equal(guard.activity,'watching');
});
