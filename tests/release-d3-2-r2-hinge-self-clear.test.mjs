import test from 'node:test';
import assert from 'node:assert/strict';
import {probeD32HingeSelfClearance} from '../src/breach-d3-hinge-escape-evidence.ts';
import {initDoor,doorWouldStrikeActors} from '../src/breach-door.ts';
import {doorLeafSegment,OPERATOR_RADIUS} from '../src/breach-core.ts';
test('D3.2 R2: no relief generated for locked, wedged or actively swinging leaves',()=>{
 const door=initDoor({id:'D',a:{x:100,y:100},b:{x:148,y:100},
  kind:'hinged',open:true,openedAt:0},0);
 door.openFraction=.44;door.angularVelocity=.4;
 assert.deepEqual(probeD32HingeSelfClearance({x:130,y:100},
   {x:150,y:150},door,[],()=>true),[]);
 door.angularVelocity=0;door.locked=true;
 assert.deepEqual(probeD32HingeSelfClearance({x:130,y:100},
   {x:150,y:150},door,[],()=>true),[]);
});
test('D3.2 R2: witness never invents a relief when no swept body step exists',()=>{
 const door=initDoor({id:'D',a:{x:100,y:100},b:{x:148,y:100},
  kind:'hinged',open:true,openedAt:0},0);
 door.openFraction=.4;door.angularVelocity=0;
 const leaf=doorLeafSegment(door),mid={
  x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
 assert.deepEqual(probeD32HingeSelfClearance(mid,{x:200,y:200},
   door,[],()=>false),[]);
});
