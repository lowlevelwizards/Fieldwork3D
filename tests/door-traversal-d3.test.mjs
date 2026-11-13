import test from 'node:test';
import assert from 'node:assert/strict';
import {doorPressureTick,sessionDoorPressurePolicy,doorClosingContested}
 from '../src/breach-door-pressure-frame.ts';
import {initDoor,pressDoorOnBodyAttempt} from '../src/breach-door.ts';
import {doorLeafSegment,pointToSegment} from '../src/breach-core.ts';
const p=(x,y)=>({x,y});
const createDoor=()=>{const d=initDoor({id:'ENTRY',a:p(290,260),
 b:p(332,260),hinge:'a',swing:-1,kind:'hinged',
 open:true,openedAt:0},0);d.openFraction=1;
 return d;};
const actor=(id,from,goal,kind='move')=>({
 id,side:'blue',health:4,p:from,
 plan:[{id:id==='lead'?1:2,kind,p:goal,doorId:'ENTRY',
  ...(kind==='door'?{method:'close'}:{})}],
 nav:[goal],blockedTime:0,doorTraversal:null
});
function pressure(door){
 const leaf=doorLeafSegment(door);
 const mid=p((leaf.a.x+leaf.b.x)/2,(leaf.a.y+leaf.b.y)/2);
 const length=Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y);
 const normal=p(-(leaf.b.y-leaf.a.y)/length,
  (leaf.b.x-leaf.a.x)/length);
 const future=doorLeafSegment({...door,openFraction:1.08});
 const probe=sign=>p(mid.x+normal.x*sign*14,
  mid.y+normal.y*sign*14);
 const a=probe(1),b=probe(-1);
 const advance=x=>pointToSegment(x,future)-pointToSegment(x,leaf);
 const opening=advance(a)>advance(b)?a:b;
 const closing=opening===a?b:a;
 return {opening:{from:opening,to:closing},
  closing:{from:closing,to:opening}};
}
test('D3 one session/tick snapshot and one incidental contact per door',()=>{
 const d=createDoor(),lead=actor('lead',p(309,222),p(310,350));
 const follower=actor('follower',p(300,185),p(300,345));
 const s={seconds:3,operators:[lead,follower],doors:[d]};
 const snapshot=doorPressureTick(s);
 assert.equal(snapshot,doorPressureTick(s),
  'same physics tick must reuse the same crossing claim snapshot');
 const first=sessionDoorPressurePolicy(s,lead);
 const second=sessionDoorPressurePolicy(s,follower);
 assert.equal(first.preferOpening(d),true);
 assert.equal(second.deferClosing(d),true);
 assert.equal(first.claimContact(d),true);
 assert.equal(second.claimContact(d),false,
  'other motor actor cannot inject another hinge impulse this tick');
 s.seconds+=1/60;
 assert.notEqual(doorPressureTick(s),snapshot);
 assert.equal(sessionDoorPressurePolicy(s,lead).claimContact(d),true);
});
test('D3 crossing takes precedence over wrong-side pressure',()=>{
 const d=createDoor(),faces=pressure(d);
 const lead=actor('lead',faces.closing.from,
  p(311,faces.closing.from.y>260?170:350));
 const other=actor('follower',p(305,180),p(307,350));
 const s={seconds:6,operators:[lead,other],doors:[d]};
 const policy=sessionDoorPressurePolicy(s,lead);
 assert.equal(policy.deferClosing(d),true);
 const start=d.openFraction;
 const result=pressDoorOnBodyAttempt(faces.closing.from,
  faces.closing.to,[d],1/60,[faces.closing.from],policy);
 assert.equal(d.open,true);
 assert.ok(result===null||result.handAssist,
  'closing pressure cannot slam into an active crossing');
 assert.ok(d.openFraction>=start-.01);
});
test('D3 automatic pressure remains physical when no one is crossing',()=>{
 const d=createDoor(),faces=pressure(d);
 const idle=actor('lead',p(310,200),p(312,202));
 const s={seconds:9,operators:[idle],doors:[d]};
 const policy=sessionDoorPressurePolicy(s,idle);
 assert.equal(policy.deferClosing(d),false);
 const result=pressDoorOnBodyAttempt(faces.closing.from,
  faces.closing.to,[d],1/60,[faces.closing.from],policy);
 assert.equal(result?.doorId,d.id);
 assert.equal(d.open,false,'incidental physical closing remains supported');
 const again=pressDoorOnBodyAttempt(faces.closing.from,
  faces.closing.to,[d],1/60,[faces.closing.from],policy);
 assert.equal(again,null,'second impulse rejected within same fixed tick');
});
test('D3 deliberate CLOSE waits for passage but no distant idle claim',()=>{
 const d=createDoor(),lead=actor('lead',p(309,220),p(309,352));
 const closer=actor('closer',p(323,210),p(310,215),'door');
 const s={seconds:5,operators:[lead,closer],doors:[d]};
 assert.equal(doorClosingContested(s,d),true);
 lead.plan=[];s.seconds+=1/60;
 assert.equal(doorClosingContested(s,d),false);
 assert.equal(sessionDoorPressurePolicy(s,closer).preferOpening(d),false);
});

test('D3 never scans unrelated doors or repeats same-leaf claims within one tick',()=>{
 const first=createDoor(),second={...createDoor(),id:'OTHER',
  a:p(490,260),b:p(532,260)};
 const lead=actor('lead',p(309,224),p(310,350));
 const s={seconds:17,operators:[lead],doors:[first,second]};
 const frame=doorPressureTick(s);
 assert.equal(frame.inspected.size,0,'lazy: no checks before contact');
 const policy=sessionDoorPressurePolicy(s,lead);
 assert.equal(policy.preferOpening(first),true);
 assert.equal(frame.inspected.size,1);
 assert.equal(policy.deferClosing(first),true);
 assert.equal(frame.inspected.size,1,'no duplicate near-actor scan');
 assert.equal(policy.deferClosing(second),false);
 assert.equal(frame.inspected.size,2);
 assert.equal(policy.claimContact(first),true);
 assert.equal(policy.claimContact(first),false);
});
