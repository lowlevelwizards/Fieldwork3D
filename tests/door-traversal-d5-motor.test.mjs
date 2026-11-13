import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {autoDoorAtBodyContact,doorClear,doorReachable,
 initDoor,pressDoorOnBodyAttempt,canAutoOpenEnRoute}
 from '../src/breach-door.ts';
import {doorLeafSegment,pointToSegment,OPERATOR_RADIUS}
 from '../src/breach-core.ts';
import {sessionDoorPressurePolicy}
 from '../src/breach-door-pressure-frame.ts';
const at=(x,y)=>({x,y});
const from=at(116,89),toward=at(116,87);
const door=(id,y=80,x=100)=>({
 id,a:at(x,y),b:at(x+48,y),open:false,openFraction:0,
 kind:'hinged',locked:false
});
// D5 must choose exactly the old physically reachable candidate, regardless
// of array order. The oracle reproduces the PRE-D5 stable sort algorithm.
function oldContact(from,to,doors){
 const touching=doors.filter(d=>{
  if((d.open&&doorClear(d))||!doorReachable(from,d))return false;
  const leaf=doorLeafSegment(d);
  const before=pointToSegment(from,leaf),after=pointToSegment(to,leaf);
  return before<OPERATOR_RADIUS+7&&after<OPERATOR_RADIUS+7&&
   after<before-.015;
 });
 return touching.sort((a,b)=>
  pointToSegment(to,doorLeafSegment(a))-
  pointToSegment(to,doorLeafSegment(b))||
  a.id.localeCompare(b.id))[0];
}
test('D5 single-pass contact matches stable-sort oracle on 256 seeded door sets',()=>{
 let seed=0x62feaba9;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/0x100000000;};
 for(let i=0;i<256;i++){
  const doors=Array.from({length:7},(_,j)=>{
   const d=door('D'+j,76+Math.floor(random()*16),
    85+Math.floor(random()*55));
   if(random()<.16){d.open=true;d.openFraction=1;}
   return d;
  });
  if(i%2)doors.reverse();
  assert.equal(autoDoorAtBodyContact(from,toward,doors),
   oldContact(from,toward,doors),'seeded layout '+i);
 }
});
test('D5 deterministic nearest contact breaks exact ties by door ID',()=>{
 const a=door('A'),b=door('B');
 assert.equal(autoDoorAtBodyContact(from,toward,[b,a]),a);
 assert.equal(autoDoorAtBodyContact(from,toward,[a,b]),a);
 assert.equal(autoDoorAtBodyContact(toward,from,[a,b]),undefined);
 const mixed=[door('B'),door('a')];
 assert.equal(autoDoorAtBodyContact(from,toward,mixed),
  mixed.slice().sort((x,y)=>x.id.localeCompare(y.id))[0],
  'locale-aware tie order must match historical stable sorting');
});
test('D5 preserves authored KICK, CLOSE, HOLD and intervening-leaf priority',()=>{
 for(const method of ['kick','close','hold']){
  const order={kind:'door',doorId:'TARGET',method};
  assert.equal(canAutoOpenEnRoute(order,'TARGET'),false);
  assert.equal(canAutoOpenEnRoute(order,'INTERVENING'),true);
 }
 assert.equal(canAutoOpenEnRoute({kind:'move'},'TARGET'),true);
});
test('D5 only evaluates live actor occupancy after real leaf contact',()=>{
 let calls=0;
 const occupied=()=>{calls++;return [from];};
 assert.equal(pressDoorOnBodyAttempt(from,toward,[],1/60,occupied),
  null);
 assert.equal(calls,0,'empty world should never snapshot actors');
 const d=initDoor({id:'CONTACT',a:at(290,260),b:at(332,260),
  hinge:'a',swing:-1,kind:'hinged',open:true,openedAt:0},0);
 d.openFraction=1;
 const leaf=doorLeafSegment(d),len=Math.hypot(
  leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y);
 const mid=at((leaf.a.x+leaf.b.x)/2,(leaf.a.y+leaf.b.y)/2);
 const nx=-(leaf.b.y-leaf.a.y)/len,ny=(leaf.b.x-leaf.a.x)/len;
 const start=at(mid.x+nx*14,mid.y+ny*14);
 const end=at(mid.x-nx*14,mid.y-ny*14);
 const contact=pressDoorOnBodyAttempt(start,end,[d],1/60,
  ()=>{calls++;return [start];});
 assert.equal(contact?.doorId,'CONTACT');
 assert.equal(calls,1,'actual hinge contact samples positions once');
});
test('D5 touched-door claim remains one impulse per door per fixed tick',()=>{
 const d=initDoor({id:'D',a:at(290,260),b:at(332,260),
  kind:'hinged',open:true,openedAt:0},0);
 const actor={id:'A',side:'blue',health:4,p:at(310,225),plan:[],
  nav:[],doorTraversal:null};
 const session={seconds:2,operators:[actor],doors:[d]};
 const policy=sessionDoorPressurePolicy(session,actor);
 assert.equal(policy.claimContact(d),true);
 assert.equal(policy.claimContact(d),false);
 session.seconds+=1/60;
 assert.equal(policy.claimContact(d),true,
  'a new fixed tick grants exactly one new physical contact');
});
test('D5 hot motor avoids per-stride filter/sort and preserves exact sweeps',()=>{
 const root=new URL('../',import.meta.url);
 const source=readFileSync(new URL('src/breach-motor-door.ts',root),'utf8');
 assert.doesNotMatch(source,/\.sort\(/);
 assert.match(source,/autoDoorAtBodyContact/);
 assert.match(source,/doorInteraction\(/);
 assert.match(source,/sweptBodyClear\(/);
});