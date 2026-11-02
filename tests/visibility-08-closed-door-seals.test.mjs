import test from 'node:test';
import assert from 'node:assert/strict';
import {doorBlocksSightRay,doorOpticalSegment,doorLeafSegment}
 from '../src/breach-core.ts';
import {opticalBlockerSegments} from '../src/breach-optical-occlusion.ts';
import {DOOR_FRAME_INSET,DOOR_PANEL_END_RECESS,doorProportions}
 from '../src/breach-door-proportions.ts';
const closed=(style='wood')=>({
 id:'D',a:{x:0,y:0},b:{x:36,y:0},open:false,openedAt:-1,style});
test('closed door has no optical ray sliver at recessed latch',()=>{
 const d=closed(),ray={a:{x:35,y:-10},b:{x:35,y:10}};
 assert.equal(doorLeafSegment(d).b.x,36-DOOR_PANEL_END_RECESS);
 assert.equal(doorBlocksSightRay([d],ray),true);
 assert.equal(doorOpticalSegment(d).b.x,36);
 assert.equal(opticalBlockerSegments([], [d], []).length,1);
 assert.equal(opticalBlockerSegments([], [d], [])[0].b.x,36);
});
test('opened doors retain physical swing / do not block closed aperture',()=>{
 const d={...closed(),open:true,openFraction:1};
 assert.deepEqual(doorOpticalSegment(d),doorLeafSegment(d));
 assert.equal(doorBlocksSightRay([d],{a:{x:35,y:-10},b:{x:35,y:10}}),false);
});
test('transparent doors remain optically transmissive and jamb overlap covers the gap',()=>{
 assert.equal(doorBlocksSightRay([closed('glazed')],
  {a:{x:35,y:-10},b:{x:35,y:10}}),false);
 const p=doorProportions({style:'wood',kind:'hinged'});
 assert.ok(p.jambWidth>=5);
 assert.ok(DOOR_FRAME_INSET>DOOR_PANEL_END_RECESS);
 // Inside edge is inside the panel's recessed end, sealing visual cracks.
 const inside=36/2 + p.jambWidth/2-DOOR_FRAME_INSET-p.jambWidth/2;
 assert.ok(inside < 36/2-DOOR_PANEL_END_RECESS);
});
