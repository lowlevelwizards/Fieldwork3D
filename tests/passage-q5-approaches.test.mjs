import test from 'node:test';
import assert from 'node:assert/strict';
import {DOOR_RANGE_APPROACHES,doorRangeApproachSpawn,doorRangeSite}
 from '../src/breach-door-test-cases.ts';
import {Q5_HINGE_CASES} from '../src/door-range-q5-benchmark.ts';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('Q5 five distinct formations stay outside door and never spawn overlapping',()=>{
 const signature=new Set();
 for(const {id} of DOOR_RANGE_APPROACHES){
  const spawn=doorRangeApproachSpawn(id);
  assert.equal(spawn.length,4);
  assert.ok(spawn.every(x=>x.y<240&&x.x>90&&x.x<550));
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)
   assert.ok(distance(spawn[i],spawn[j])>20,
    'full-radius operators must not be placed within one another');
  signature.add(JSON.stringify(spawn));
 }
 assert.equal(signature.size,5);
});
test('Q5 all four hinges use the SAME approach preset geometry',()=>{
 for(const {id} of DOOR_RANGE_APPROACHES){
  const shared=doorRangeApproachSpawn(id);
  for(const door of Q5_HINGE_CASES)
   assert.deepEqual(doorRangeSite(door,id).spawn,shared);
 }
});
test('Q5 left/right/jamb and split/45 geometry physically differ',()=>{
 const left=doorRangeApproachSpawn('left'),
  right=doorRangeApproachSpawn('right'),
  split=doorRangeApproachSpawn('split'),
  angled=doorRangeApproachSpawn('angle45');
 assert.ok(left.every(p=>p.x<290));
 assert.ok(right.every(p=>p.x>332));
 assert.equal(split.filter(p=>p.x<290).length,2);
 assert.equal(split.filter(p=>p.x>332).length,2);
 assert.ok(angled.every((p,i)=>i===0||
  Math.abs((p.x-angled[i-1].x)-(p.y-angled[i-1].y))<.001));
});
