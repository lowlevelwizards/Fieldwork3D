import test from 'node:test';
import assert from 'node:assert/strict';
import {DOOR_RANGE_CASES,doorRangeCase,doorRangeSite,prepareDoorRangeCase}
 from '../src/breach-door-test-cases.ts';
import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {entryDoorState} from '../src/breach-entry-coordination.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';

test('D0 range: ten reproducible real-world configurations without shared mutation',()=>{
 assert.equal(new Set(DOOR_RANGE_CASES.map(x=>x.id)).size,10);
 const cases=DOOR_RANGE_CASES.map(x=>doorRangeSite(x.id));
 assert.equal(cases.length,10);
 assert.ok(cases.every(site=>site.training&&site.spawn.length===4&&
   site.doors.length===1&&site.walls.length===2));
 assert.equal(doorRangeCase('outward-left').swing,1);
 assert.equal(doorRangeCase('outward-right').swing,-1);
 assert.deepEqual(doorRangeSite('outward-left'),doorRangeSite('outward-left'));
 const a=doorRangeSite('swing-furniture');
 a.cover[0].x=99;
 assert.notEqual(doorRangeSite('swing-furniture').cover[0].x,99);
});
test('D0 gate always uses its own Session world, not a subsequently activated lab',()=>{
 const clear=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('inward-left'),{enableCivilians:false});
 const blocked=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('swing-furniture'),{enableCivilians:false});
 try{
  const a=clear.doors[0],b=blocked.doors[0];
  a.open=true;a.openFraction=1.3;
  b.open=true;b.openFraction=.4;
  assert.equal(team(clear).length>=4,true);
  const worldA=sessionWorldGeometry(clear);
  const worldB=sessionWorldGeometry(blocked);
  assert.equal(entryDoorState(a,worldA),entryDoorState(a,worldA));
  assert.equal(entryDoorState(b,worldB),entryDoorState(b,worldB));
  const before=entryDoorState(a,worldA);
  activateSite(doorRangeSite('locked'));
  assert.equal(entryDoorState(a,worldA),before,
   'another lab activation cannot change session-qualified clearance');
  assert.equal(entryDoorState(undefined,worldA),'missing');
  prepareDoorRangeCase(blocked,'ajar-outward');
  assert.equal(blocked.doors[0].openFraction,.45);
 }finally{activateSite(null);}
});
