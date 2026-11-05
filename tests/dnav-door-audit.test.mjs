import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleDoorBlock} from '../src/breach-door-navigation-audit.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
const door={id:'ENTRY',a:{x:120,y:100},b:{x:168,y:100},
 hinge:'a',swing:-1,open:true,openFraction:.83,locked:false};
const actor={
 id:'rook',p:{x:142,y:108},nav:[{x:142,y:170}],
 plan:[{p:{x:150,y:250}}],blockedTime:2.3,
 lastBlocker:'door',motorPause:null,recoveryAttempts:3,velocity:0
};
test('DNav-A records an actual nearby leaf, its open fraction and intended order',()=>{
 const leaf=doorLeafSegment(door);
 const midpoint={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
 const x=sampleDoorBlock({...actor,p:midpoint},[door]);
 assert.equal(x.doorId,'ENTRY');
 assert.equal(x.fraction,.83);
 assert.equal(x.nearPhysicalContact,true);
 assert.equal(x.pause,'none');
 assert.equal(x.repairs,3);
 assert.deepEqual(x.goal,{x:150,y:250});
});
test('DNav-A does not invent a door for a distant actor',()=>{
 const x=sampleDoorBlock({...actor,p:{x:500,y:520}},[door]);
 assert.equal(x.doorId,null);
 assert.equal(x.leafGap,null);
 assert.equal(x.nearPhysicalContact,false);
});
test('DNav-A reports actual lock/hold and never changes door state',()=>{
 const d={...door,open:false,openFraction:0,locked:true,wedged:true,
 heldBy:'enemy'};
 const before=structuredClone(d);
 const leaf=doorLeafSegment(d);
 const x=sampleDoorBlock({...actor,p:{
  x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2
 }},[d]);
 assert.equal(x.locked,true);assert.equal(x.wedged,true);
 assert.equal(x.held,true);assert.deepEqual(d,before);
});

test('DNav-A reports authored door order identity to distinguish premature crossing',()=>{
 const x=sampleDoorBlock({...actor,plan:[{kind:'door',doorId:'ENTRY',
  method:'open',p:{x:142,y:160}}]},[door]);
 assert.equal(x.orderKind,'door');
 assert.equal(x.orderDoorId,'ENTRY');
 assert.equal(x.orderMethod,'open');
});
