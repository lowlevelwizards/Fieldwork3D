import test from 'node:test';
import assert from 'node:assert/strict';
import {doorLeafSegment,doorBlocksSegment,isClear} from '../src/breach-core.ts';
import {initDoor,advanceDoor,pushDoor,doorClear} from '../src/breach-door.ts';
test('134: the same leaf blocks ray intersections in closed and swung positions',()=>{
 const door=initDoor({id:'door-test',a:{x:240,y:240},b:{x:270,y:240},
    open:false,openedAt:0},0);
 const across={a:{x:255,y:215},b:{x:255,y:260}};
 assert.equal(doorBlocksSegment(door,across),true);
 door.open=true;
 for(let i=0;i<90;i++)advanceDoor(door,1/60);
 assert.equal(doorClear(door),true);
 const leaf=doorLeafSegment(door);
 assert.ok(Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y)>29);
 assert.equal(doorBlocksSegment(door,across),false);
 const side={a:{x:220,y:225},b:{x:265,y:225}};
 assert.equal(doorBlocksSegment(door,side),true);
 assert.equal(isClear(side.a,side.b,[door]),false);
});
test('134: hinge advances fixed-step and remains within physical stops',()=>{
 const door=initDoor({id:'d',a:{x:200,y:200},b:{x:230,y:200},
    open:true,openedAt:0},0);
 door.openFraction=.3;
 assert.ok(pushDoor(door,1));
 for(let i=0;i<200;i++)advanceDoor(door,1/60);
 assert.ok(door.openFraction>=0&&door.openFraction<=1);
 assert.equal(door.openFraction,1);
 assert.equal(door.angularVelocity,0);
});
