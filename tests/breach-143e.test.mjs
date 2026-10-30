import test from 'node:test';
import assert from 'node:assert/strict';
import {doorYaw,doorLeafSegment} from '../src/breach-core.ts';
import {initDoor,advanceDoor} from '../src/breach-door.ts';
test('143E: fully open door clears the aperture at near right-angle',()=>{
  const d=initDoor({id:'TEST',a:{x:0,y:0},b:{x:48,y:0},
    open:true,openedAt:0},1);
  d.openFraction=1;
  assert.ok(Math.abs(doorYaw(d))>1.5);
  const leaf=doorLeafSegment(d);
  assert.ok(Math.abs(leaf.b.x-leaf.a.x)<2.0);
});
test('143E: free-swinging door reaches the near-90-degree stop',()=>{
  const d=initDoor({id:'TEST',a:{x:0,y:0},b:{x:48,y:0},
    open:true,openedAt:0},0);
  d.openFraction=0;
  for(let i=0;i<130;i++)advanceDoor(d,1/60);
  assert.ok((d.openFraction??0)>.97);
});