import test from 'node:test';
import assert from 'node:assert/strict';
import {doorLeafSegment,doorBlocksSegment,doorYaw} from '../src/breach-core.ts';
import {initDoor,advanceDoor,doorClear,kickDoor} from '../src/breach-door.ts';
import {generateSite} from '../src/breach-site.ts';
test('sliding leaves translate along their track, never rotate around a hinge',()=>{
 const input={id:'S',a:{x:10,y:30},b:{x:58,y:30},kind:'sliding',style:'glazed',
  slideDirection:1,open:false,openedAt:-1};
 const before=doorLeafSegment(input);
 assert.equal(doorYaw(input),0);
 assert.deepEqual(before,{a:{x:10,y:30},b:{x:58,y:30}});
 const opened=doorLeafSegment({...input,openFraction:1});
 assert.deepEqual(opened,{a:{x:58,y:30},b:{x:106,y:30}});
 assert.equal(doorBlocksSegment({...input,openFraction:1},
  {a:{x:34,y:20},b:{x:34,y:40}}),false);
 assert.equal(kickDoor(input,{x:30,y:10}).opened,false);
});
test('sliding doors animate to navigable opening fractions and appear in seeded properties',()=>{
 let sliders=0;
 for(let seed=1;seed<=77;seed++){
  const site=generateSite(seed);
  for(const d of site.doors.filter(d=>d.kind==='sliding')){
   sliders++;assert.ok(d.style==='glazed'||d.style==='steel');
   const active=initDoor(d,0);active.open=true;
   for(let i=0;i<120;i++)advanceDoor(active,1/60);
   assert.equal(doorClear(active),true);
  }
 }
 assert.ok(sliders>=2);
});
