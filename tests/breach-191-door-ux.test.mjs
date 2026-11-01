import test from 'node:test';
import assert from 'node:assert/strict';
import {initDoor,kickDoor,doorReachable,doorApproach} from '../src/breach-door.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {intelFogLevel,initialIntel} from '../src/breach-intel.ts';

test('191: kicking from pull side cannot reverse the physical hinge',()=>{
 const make=()=>initDoor({id:'ISOLATED',a:{x:0,y:0},b:{x:40,y:0},
   open:false,openedAt:0,hinge:'a',swing:-1},0);
 const wrong=make(),correct=make();
 const pullSide={x:20,y:17},pushSide={x:20,y:-17};
 const blocked=kickDoor(wrong,pullSide);
 assert.equal(blocked.pushSide,false);
 assert.equal(wrong.open,false);
 assert.ok((wrong.latchIntegrity??0)>0);
 const forced=kickDoor(correct,pushSide);
 assert.equal(forced.pushSide,true);
 assert.equal(forced.opened,true);
 assert.equal(correct.open,true);
});
test('191: any point along the opened door leaf can be touched to close it',()=>{
 const door=initDoor({id:'TOUCH',a:{x:120,y:120},b:{x:165,y:120},
   open:true,openedAt:0,hinge:'a',swing:-1,openFraction:1},0);
 const leaf=doorLeafSegment(door);
 const nearTip={x:leaf.a.x+(leaf.b.x-leaf.a.x)*.85+7,
   y:leaf.a.y+(leaf.b.y-leaf.a.y)*.85};
 assert.equal(doorReachable(nearTip,door),true);
 assert.ok(doorApproach(nearTip,door));
});
test('191: contextual fixtures append after core palette order',()=>{
 const result=contextActionChoices({door:false,node:false,flashRemaining:2,
   posture:'stand',pace:'walk',firePolicy:'engage',reserve:30,
   magazine:20,nearWindow:true,nearMovable:true});
 const primaries=result.filter(a=>a.group==='primary').map(a=>a.id);
 assert.deepEqual(primaries.slice(0,6),
   ['ctxLook','ctxPie','ctxFlash','ctxWait','ctxFocus','ctxSuppress']);
 assert.deepEqual(primaries.slice(-2),['ctxPush','ctxWindow']);
});
test('191: full-view removes fog on unseen floor regardless of briefing',()=>{
 const intel=initialIntel('full-view',undefined,[]);
 assert.equal(intelFogLevel(intel,undefined,{x:300,y:300},false,false),0);
});
