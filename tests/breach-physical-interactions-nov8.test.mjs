import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,doorLeafSegment,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {initDoor,pressDoorOnBodyAttempt,advanceDoor} from '../src/breach-door.ts';
import {doorInteraction} from '../src/breach-interactions.ts';
import {entryToolVerdict} from '../src/breach-entry-tools.ts';
import {equippedEntryMethods,canUseEntryTool} from '../src/equipment-entry-tools.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {handlingPose} from '../src/breach-weapon-pose.ts';
import {chooseMuzzleRecoveryStep} from '../src/breach-combat-reactions.ts';

const fixture=()=>initDoor({
  id:'TEST-HINGE',a:{x:200,y:250},b:{x:238,y:250},
  open:true,openedAt:0,hinge:'a',swing:1
},0);
const request=(door,action)=>doorInteraction({
  target:door,action,actorId:'rook',actorPosition:{x:219,y:250}
});
test('partly open hinged door can receive OPEN and CLOSE, including mid-closing',()=>{
 activateSite({walls:[],doors:[],cover:[]});
 try{
  const d=fixture();d.openFraction=.5;
  assert.equal(request(d,'open').allowed,true);
  assert.equal(request(d,'close').allowed,true);
  d.open=false;
  assert.equal(request(d,'close').allowed,true);
  const menu=contextActionChoices({
   door:true,doorPartial:true,doorOpen:false,node:false,
   flashRemaining:1,posture:'stand',pace:'walk',firePolicy:'engage',
   reserve:40,magazine:20
  });
  assert.ok(menu.some(x=>x.id==='ctxOpen'));
  assert.ok(menu.some(x=>x.id==='ctxClose'));
 }finally{activateSite(null);}
});
test('body contact supplies physically signed open and close pressure',()=>{
 activateSite({walls:[],doors:[],cover:[]});
 try{
  const d=fixture();d.openFraction=.64;
  const panel=doorLeafSegment(d);
  const mid={x:(panel.a.x+panel.b.x)/2,y:(panel.a.y+panel.b.y)/2};
  const vx=panel.b.x-panel.a.x,vy=panel.b.y-panel.a.y;
  const size=Math.hypot(vx,vy);
  const normal={x:(d.swing??1)*vy/size,y:-(d.swing??1)*vx/size};
  const reach=OPERATOR_RADIUS+2;
  const fromClose={x:mid.x+normal.x*reach,y:mid.y+normal.y*reach};
  const toClose={x:fromClose.x-normal.x*4,y:fromClose.y-normal.y*4};
  const closed=pressDoorOnBodyAttempt(fromClose,toClose,[d],1/60,[]);
  assert.ok(closed,'reverse pressure should contact the leaf');
  assert.equal(d.open,false,'opposite-side pressure asks hinge to close');
  const afterClose=d.openFraction;
  for(let i=0;i<15;i++)advanceDoor(d,1/60,[]);
  assert.ok(d.openFraction<afterClose,'leaf actually rotates toward frame');
  d.open=true;d.openFraction=.64;d.angularVelocity=0;
  const fromOpen={x:mid.x-normal.x*reach,y:mid.y-normal.y*reach};
  const toOpen={x:fromOpen.x+normal.x*4,y:fromOpen.y+normal.y*4};
  const opened=pressDoorOnBodyAttempt(fromOpen,toOpen,[d],1/60,[]);
  assert.ok(opened,'forward pressure should contact the leaf');
  assert.equal(d.open,true);
  assert.ok(d.pushTarget>=1);
 }finally{activateSite(null);}
});
test('basic lockpick handles a mechanical latch but cannot bypass physical barriers',()=>{
 const d=fixture();d.open=false;d.openFraction=0;d.locked=true;
 assert.ok(equippedEntryMethods().includes('pick'));
 assert.equal(canUseEntryTool(undefined,'pick'),true);
 assert.equal(entryToolVerdict(d,'pick').allowed,true);
 assert.ok(entryToolVerdict(d,'pick').seconds>=5);
 d.wedged=true;assert.equal(entryToolVerdict(d,'pick').allowed,false);
 d.wedged=false;d.jammed=true;
 assert.equal(entryToolVerdict(d,'pick').allowed,false);
 d.jammed=false;d.locked=false;
 assert.equal(entryToolVerdict(d,'pick').allowed,false);
});
test('stack context prefers high ready without overriding true obstruction',()=>{
 const base={aim:0,moving:.2,obstruction:false,
  friendlyNear:false,intent:'stack',weapon:'carbine'};
 assert.equal(handlingPose(base),'high');
 assert.equal(handlingPose({...base,obstruction:true}),'short');
 assert.equal(handlingPose({...base,aim:.9,intent:'engage'}),'ads');
});
test('muzzle recovery tries genuinely small swept, legal steps first',()=>{
 const p={x:100,y:100};
 const move=chooseMuzzleRecoveryStep(p,0,
  target=>target.x<=93,target=>target.x<=93);
 assert.ok(move);
 assert.equal(Math.round(move.x),93);
 assert.equal(Math.round(move.y),100);
});
