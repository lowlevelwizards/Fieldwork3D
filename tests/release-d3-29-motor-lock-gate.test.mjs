import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {initDoor} from '../src/breach-door.ts';
import {doorInteraction} from '../src/breach-interactions.ts';
import {newSession,team} from '../src/breach-game.ts';
import {implicitOpenDenial,handleMotorDoor}
 from '../src/breach-motor-door.ts';

const verdict=(allowed,reason)=>({allowed,reason});
test('D3.29D: a rejected OPEN never gains automatic hinge authority',()=>{
 const normal={locked:false,jammed:false,wedged:false,heldBy:null};
 // Out-of-reach on an otherwise operable unlocked leaf is normal
 // while a physical threshold crossing is in progress, not a lock.
 assert.equal(implicitOpenDenial(normal,verdict(false,'out-of-reach'),'ash'),null);
 for(const reason of ['already-open','unsupported']){
  assert.equal(implicitOpenDenial(normal,verdict(false,reason),'ash'),reason);
 }
 assert.equal(implicitOpenDenial(normal,verdict(true,null),'ash'),null);
});
test('D3.29D: a lock supersedes out-of-reach and cannot be opened',()=>{
 const d={locked:true,jammed:false,wedged:false,heldBy:null};
 assert.equal(implicitOpenDenial(d,verdict(false,'out-of-reach'),'ash'),'locked');
 assert.equal(implicitOpenDenial(d,verdict(false,'already-open'),'ash'),'locked');
});
test('D3.29D: wedge, jam and someone else holding remain physically denied',()=>{
 const d={locked:false,jammed:false,wedged:false,heldBy:null};
 assert.equal(implicitOpenDenial({...d,jammed:true},verdict(false,'out-of-reach'),'ash'),'obstructed');
 assert.equal(implicitOpenDenial({...d,wedged:true},verdict(false,'out-of-reach'),'ash'),'obstructed');
 assert.equal(implicitOpenDenial({...d,heldBy:'rook'},verdict(false,'out-of-reach'),'ash'),'held');
 assert.equal(implicitOpenDenial({...d,heldBy:'ash'},verdict(true,null),'ash'),null);
});
test('D3.29D: physical long-leaf contact cannot remotely unlatch locked panel',()=>{
 const s=newSession(),a=team(s)[0],events=[];
 try{
  const door=initDoor({id:'LONG-LOCK',a:{x:200,y:250},
   b:{x:380,y:250},open:false,openedAt:-1,locked:true,
   hinge:'a',swing:1},0);
  s.doors=[door];
  a.p={x:203,y:267};
  const move={id:9901,kind:'move',p:{x:203,y:220}};
  const next={id:9902,kind:'wait',p:{...a.p},duration:.5};
  a.plan=[move,next];a.actionTimer=.36;
  const denied=doorInteraction({target:door,actorId:a.id,
   actorPosition:a.p,action:'open'});
  assert.equal(denied.reason,'out-of-reach');
  handleMotorDoor(a,{x:203,y:258},{x:203,y:232},
   {x:203,y:253},1/60,s,{
    notify:(_s,x)=>events.push(x),hear:()=>{},battleEvent:()=>{}
   });
  assert.equal(door.locked,true);
  assert.equal(door.open,false,'refused implicit OPEN must never rotate the latch');
  assert.equal(door.openFraction,0);
  assert.ok(a.failedOrders>=0);
 }finally{activateSite(null);}
});
