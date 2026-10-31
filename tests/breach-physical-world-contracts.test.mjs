import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,doorLeafSegment} from '../src/breach-core.ts';
import {initDoor,kickDoor,advanceDoor} from '../src/breach-door.ts';
import {discoverContactCover,initialIntel} from '../src/breach-intel.ts';
const makeDoor=()=>initDoor({
  id:'TEST',a:{x:200,y:250},b:{x:240,y:250},
  hinge:'a',swing:1,open:false,openedAt:-1
},0);
test('push-side kick opens a light latch; pull side requires repeated force',()=>{
  const push=makeDoor(),pull=makeDoor();
  assert.equal(kickDoor(push,{x:220,y:290}).opened,true);
  assert.equal(push.open,true);
  const original=pull.swing;
  assert.equal(kickDoor(pull,{x:220,y:210}).opened,false);
  assert.equal(pull.open,false);
  assert.equal(kickDoor(pull,{x:220,y:210}).opened,false);
  assert.equal(kickDoor(pull,{x:220,y:210}).opened,true);
  assert.equal(pull.swing,original,'kicking cannot flip hinges');
});
test('physical bracing resists one kick but yields under accumulated damage',()=>{
  const door=makeDoor();door.heldBy='rook';
  assert.equal(kickDoor(door,{x:220,y:290}).opened,false);
  assert.equal(door.heldBy,'rook');
  kickDoor(door,{x:220,y:290});
  assert.equal(kickDoor(door,{x:220,y:290}).opened,true);
  assert.equal(door.heldBy,null);
});
test('furniture contact reveals the touched obstacle, not the whole room',()=>{
  activateSite({walls:[],doors:[],cover:[
    {x:100,y:100,w:40,h:40},{x:400,y:400,w:30,h:30}
  ]});
  try{
    const intel=initialIntel('true-blind',undefined,[]);
    assert.deepEqual(discoverContactCover(intel,{x:70,y:100},12),[0]);
    assert.equal(intel.cover.has(0),true);
    assert.equal(intel.cover.has(1),false);
  }finally{activateSite(null);}
});
test('closing leaf stops before passing through a standing actor',()=>{
  const door=makeDoor();door.open=true;door.openFraction=1;
  activateSite({walls:[],doors:[door],cover:[]});
  try{
    door.open=false;
    const leaf=doorLeafSegment({...door,openFraction:.95});
    const midpoint={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
    advanceDoor(door,.2,[midpoint]);
    assert.ok(door.openFraction>.95,'leaf must not close through a person');
  }finally{activateSite(null);}
});
