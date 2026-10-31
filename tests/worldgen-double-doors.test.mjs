import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {doorBlocksSegment,doorCenter} from '../src/breach-core.ts';
import {initDoor,advanceDoor} from '../src/breach-door.ts';
test('paired retail and restaurant doors have two separate physical swinging leaves',()=>{
 let pairs=0;
 for(const kind of ['retail','restaurant'])for(let seed=0;seed<34;seed++){
  const site=compileArchitecturalSite(kind,seed,'standard');
  const left=site.doors.find(d=>d.id==='DOUBLE-L');
  const right=site.doors.find(d=>d.id==='DOUBLE-R');
  if(!left){assert.equal(right,undefined);continue;}
  pairs++;
  assert.equal(left.pairedWith,'DOUBLE-R');
  assert.equal(right.pairedWith,'DOUBLE-L');
  assert.equal(left.hinge,'a');assert.equal(right.hinge,'b');
  assert.deepEqual(left.b,right.a);
  for(const d of [left,right]){
   assert.ok(Math.abs(Math.hypot(d.b.x-d.a.x,d.b.y-d.a.y)-48)<.001);
   const p=doorCenter(d),horizontal=Math.abs(d.a.y-d.b.y)<1;
   const crossing=horizontal?{a:{x:p.x,y:p.y-19},b:{x:p.x,y:p.y+19}}:
     {a:{x:p.x-19,y:p.y},b:{x:p.x+19,y:p.y}};
   const closed=initDoor(d,0);
   assert.ok(doorBlocksSegment(closed,crossing));
   closed.open=true;
   for(let i=0;i<100;i++)advanceDoor(closed,1/60);
   assert.equal(doorBlocksSegment(closed,crossing),false);
  }
 }
 assert.ok(pairs>=8);
});
