import test from 'node:test';
import assert from 'node:assert/strict';
import {initDoor,kickDoor,advanceDoor} from '../src/breach-door.ts';
import {doorInteraction} from '../src/breach-interactions.ts';
import {retreatDoorClosureEligible} from '../src/breach-ai-door-response.ts';

const make=(locked=true)=>initDoor({
 id:'BROKEN-LATCH',a:{x:0,y:0},b:{x:40,y:0},
 open:false,openedAt:-1,hinge:'a',swing:-1,locked
},0);
const from={x:20,y:-17};
const interact=(d,action)=>doorInteraction({
 target:d,action,actorId:'ash',actorPosition:from
});
test('D3.29I: repeated correct-side kicks sever a locked latch permanently',()=>{
 const d=make();
 assert.equal(kickDoor(d,from).opened,false);
 assert.equal(d.locked,true);
 assert.notEqual(d.latchBroken,true);
 assert.equal(kickDoor(d,from).opened,true);
 assert.equal(d.latchBroken,true);
 assert.equal(d.locked,false);
 assert.equal(d.open,true);
 assert.equal(d.forced,true);
 assert.ok(d.pushTarget>1);
});
test('D3.29I: wrong-side kick cannot sever the latch',()=>{
 const d=make();
 for(let i=0;i<3;i++)
  assert.equal(kickDoor(d,{x:20,y:17}).opened,false);
 assert.equal(d.latchBroken,undefined);
 assert.equal(d.locked,true);
});
test('D3.29I: damaged door refuses handle open, close, and brace but permits push',()=>{
 const d=make(false);
 assert.equal(kickDoor(d,from).opened,true);
 for(const action of ['open','close','hold'])
  assert.equal(interact(d,action).reason,'unsupported');
 assert.equal(interact(d,'push').allowed,true);
});
test('D3.29I: full hinge motor cannot relatch even after stale CLOSE mutation',()=>{
 const d=make(false);kickDoor(d,from);
 d.open=false;d.locked=true;d.pushTarget=0;
 advanceDoor(d,1/60);
 assert.equal(d.open,true);
 assert.equal(d.locked,false);
 assert.ok(d.pushTarget>=1);
});
test('D3.29I: AI never closes a permanently damaged hinge',()=>{
 const d=make(false);kickDoor(d,from);
 d.openFraction=1;
 assert.equal(retreatDoorClosureEligible(from,d,20,-10,false,null),false);
});
