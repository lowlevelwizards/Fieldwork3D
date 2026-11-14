import test from 'node:test';
import assert from 'node:assert/strict';
import {canClearStalledOpening} from '../src/breach-motor-door.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
const door={id:'D',a:{x:100,y:100},b:{x:150,y:100},
 hinge:'a',swing:-1,kind:'hinged',open:true,openFraction:.61,
 angularVelocity:0,locked:false,wedged:false,heldBy:null};
const leaf=doorLeafSegment(door);
const middle={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
const len=Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y);
const normal={x:-(leaf.b.y-leaf.a.y)/len,y:(leaf.b.x-leaf.a.x)/len};
const offset=d=>({x:middle.x+normal.x*d,y:middle.y+normal.y*d});
test('D3.2.1: stalled hinge yields only to actual LEAF-SEPARATING route leg',()=>{
 assert.equal(canClearStalledOpening(offset(14),offset(15),offset(28),door,.7),true);
 assert.equal(canClearStalledOpening(offset(15),offset(14),offset(28),door,.7),false);
 assert.equal(canClearStalledOpening(offset(14),offset(14),offset(28),door,.7),false);
 assert.equal(canClearStalledOpening(offset(14),offset(15),offset(14.3),door,.7),false);
});
test('D3.2.1: normal opening, explicit closure and early movement still wait',()=>{
 assert.equal(canClearStalledOpening(offset(14),offset(15),offset(28),door,.2),false);
 assert.equal(canClearStalledOpening(offset(14),offset(15),offset(28),
  {...door,angularVelocity:.3},.9),false);
 assert.equal(canClearStalledOpening(offset(14),offset(15),offset(28),
  {...door,open:false},.9),false);
 assert.equal(canClearStalledOpening(offset(14),offset(15),offset(28),
  {...door,heldBy:'B'},.9),false);
});
