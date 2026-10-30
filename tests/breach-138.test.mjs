import test from 'node:test';
import assert from 'node:assert/strict';
import {initDoor,advanceDoor,pushDoor,kickDoor,doorSwingBlocked} from '../src/breach-door.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
import {localDetour} from '../src/breach-cooperation.ts';
test('138: kick opens faster than deliberate push, with hinge bounds',()=>{
 const fixture=()=>initDoor({id:'test',a:{x:280,y:300},b:{x:315,y:300},open:true,openedAt:0},1);
 const kick=fixture(),push=fixture();kick.openFraction=0;push.openFraction=0;
 kickDoor(kick);pushDoor(push,.45);
 for(let i=0;i<8;i++){advanceDoor(kick,1/60);advanceDoor(push,1/60)}
 assert.ok(kick.openFraction>push.openFraction+.10,
   'kick should slam the leaf markedly faster');
 for(let i=0;i<100;i++)advanceDoor(kick,1/60);
 assert.ok(kick.openFraction>=0&&kick.openFraction<=1);
 assert.ok(Number.isFinite(doorLeafSegment(kick).b.x));
 assert.equal(typeof doorSwingBlocked(kick,.8),'boolean');
});
test('138: transient detour avoids occupied teammate without changing destination',()=>{
 const origin={x:230,y:620},dest={x:290,y:610};
 const neighbor={x:252,y:618};
 const a=localDetour(origin,dest,[],[neighbor]);
 if(a){assert.ok(Math.hypot(a.x-neighbor.x,a.y-neighbor.y)>16)}
 assert.deepEqual(dest,{x:290,y:610});
});
