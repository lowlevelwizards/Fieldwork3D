import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,initialDoors} from '../src/breach-core.ts';
import {initDoor,advanceDoor} from '../src/breach-door.ts';
import {validateThrow} from '../src/breach-flash.ts';
import {casingAt} from '../src/breach-effects.ts';
test('141C: authored-open door predicts grenade clearance',()=>{
  activateSite(null);const doors=initialDoors();
  const a={x:351,y:326},b={x:415,y:326};
  assert.equal(validateThrow(a,b,doors).valid,false);
  assert.equal(validateThrow(a,b,doors,['INNER']).valid,true);
});
test('141C: brass settles on the floor and stops',()=>{
  const c={id:1,at:0,weapon:'carbine',side:'blue',x:60,z:70,y:23,heading:0};
  assert.ok(casingAt(c,.2).y>1);
  const settled=casingAt(c,3);
  assert.equal(settled.y,.82);
  assert.equal(settled.settled,true);
  assert.deepEqual(settled,casingAt(c,9));
});
test('141C: unobstructed hinge reaches passable open state',()=>{
  activateSite(null);
  const d=initDoor(initialDoors()[0],0);d.open=true;
  for(let i=0;i<90;i++)advanceDoor(d,1/60);
  assert.ok((d.openFraction??0)>.7);
});