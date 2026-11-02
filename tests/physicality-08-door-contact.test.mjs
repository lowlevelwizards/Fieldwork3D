import test from 'node:test';
import assert from 'node:assert/strict';
import {approachingDoorLeaf,advanceDoor,initDoor,pushDoor,PUSHED_OPEN_LIMIT}
 from '../src/breach-door.ts';
import {pointToSegment,doorLeafSegment} from '../src/breach-core.ts';
const sample=()=>initDoor({id:'PUSH',a:{x:300,y:230},
 b:{x:352,y:230},open:true,openedAt:0,hinge:'a',swing:-1},0);
test('approaching open hinged leaf triggers assisted pressure, not sliding or held leaves',()=>{
 const d=sample(),mid={x:326,y:230};
 assert.equal(approachingDoorLeaf({x:326,y:207},mid,d),true);
 assert.equal(approachingDoorLeaf({x:326,y:207},mid,{...d,heldBy:'x'}),false);
 assert.equal(approachingDoorLeaf({x:326,y:207},mid,{...d,kind:'sliding'}),false);
});
test('door responds to repeated pressure beyond its standard stopping angle',()=>{
 const d=sample();d.openFraction=.99;
 for(let i=0;i<40;i++)pushDoor(d,2.1);
 assert.ok(d.pushTarget>1.12&&d.pushTarget<=PUSHED_OPEN_LIMIT);
 for(let i=0;i<120;i++)advanceDoor(d,1/60);
 assert.ok(d.openFraction>1.08);
});
test('slightly nearby actor does not jam an opening leaf',()=>{
 const d=sample();d.openFraction=.4;
 const leaf=doorLeafSegment({...d,openFraction:.41});
 const center={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
 // A character offset from the thin leaf is a navigation obstacle,
 // not necessarily a solid obstruction to every additional degree.
 const actor={x:center.x+5,y:center.y+5};
 advanceDoor(d,1/30,[actor]);
 assert.ok(d.openFraction>.4);
 assert.ok(pointToSegment(actor,doorLeafSegment(d))>=0);
});
