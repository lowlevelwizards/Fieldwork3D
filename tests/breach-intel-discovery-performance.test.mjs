import test from 'node:test';
import assert from 'node:assert/strict';
import {WALLS,COVER} from '../src/breach-core.ts';
import {initialIntel,observeIntel} from '../src/breach-intel.ts';

test('known architecture and cover do not consume redundant discovery LOS',()=>{
  const intel=initialIntel('true-blind',undefined,[]);
  let calls=0;
  observeIntel(intel,undefined,[],()=>{calls++;return true;});
  assert.ok(calls>0,'first discovery should perform visibility probes');
  assert.equal(intel.walls.size,WALLS.length);
  assert.equal(intel.cover.size,COVER.length);
  calls=0;
  observeIntel(intel,undefined,[],()=>{calls++;return false;});
  assert.equal(calls,0,'monotonic knowledge must skip subsequent probes');
});

test('already discovered doors keep updating their last observed opening',()=>{
  const intel=initialIntel('true-blind',undefined,[]);
  // Known walls/cover should not obscure the door memory contract.
  WALLS.forEach((_,i)=>intel.walls.add(i));
  COVER.forEach((_,i)=>intel.cover.add(i));
  const door={id:'test-hinge',a:{x:0,y:0},b:{x:12,y:0},
    open:true,openFraction:.25};
  observeIntel(intel,undefined,[door],()=>true);
  assert.equal(intel.doorMemory.get(door.id),.25);
  door.openFraction=.75;
  observeIntel(intel,undefined,[door],()=>true);
  assert.equal(intel.doorMemory.get(door.id),.75);
});
