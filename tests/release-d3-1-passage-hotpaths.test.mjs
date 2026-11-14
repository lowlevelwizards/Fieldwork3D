import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {autoDoorAtBodyContact,canAutoOpenEnRoute} from '../src/breach-door.ts';
import {coordinatePassage} from '../src/breach-passage-coordinator.ts';
const p=(x,y)=>({x,y});
const leaf=(id,y=80)=>({id,a:p(100,y),b:p(148,y),
 open:false,openFraction:0,locked:false,kind:'hinged'});
const from=p(116,89),toward=p(116,87);
test('D3.1: contact fallback respects authored target while opening intervening doors',()=>{
 for(const method of ['kick','close','hold']){
  const authored={kind:'door',doorId:'TARGET',method};
  const target=leaf('TARGET'),intervening=leaf('OTHER');
  assert.equal(autoDoorAtBodyContact(from,toward,[target,intervening],
    undefined,authored,false),intervening);
  assert.equal(autoDoorAtBodyContact(from,toward,[target],
    undefined,authored,false),undefined);
  assert.equal(autoDoorAtBodyContact(from,toward,[target],
    undefined,authored,true),target,'AI retains original policy');
 }
 assert.equal(autoDoorAtBodyContact(from,toward,[leaf('D')],
  undefined,undefined,false),undefined,'no blue order is not an auto-open order');
 assert.equal(autoDoorAtBodyContact(from,toward,[leaf('D')],
  undefined,{kind:'move'},false)?.id,'D');
});
test('D3.1: filtered direct-contact result matches preconsolidation array oracle',()=>{
 let seed=0xD301;const random=()=>{
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/0x100000000;
 };
 for(let i=0;i<160;i++){
  const doors=Array.from({length:6},(_,j)=>{
   const d=leaf('D'+j,78+Math.floor(random()*10));
   if(random()<.2){d.open=true;d.openFraction=1;}
   return d;
  });
  if(i%2)doors.reverse();
  const policy=i%3===0?{kind:'move'}:i%3===1?{
   kind:'door',doorId:'D2',method:'kick'}:{kind:'wait'};
  const ai=i%5===0;
  const oldEligible=doors.filter(d=>canAutoOpenEnRoute(policy,d.id,ai));
  const expected=autoDoorAtBodyContact(from,toward,oldEligible);
  const actual=autoDoorAtBodyContact(from,toward,doors,
   undefined,policy,ai);
  assert.equal(actual,expected,'case '+i);
 }
});
test('D3.1: single-side queue avoids an irrelevant owner readiness pass',()=>{
 let planReads=0;const move=[{kind:'move',id:1,p:p(110,40)}];
 const lead={id:'lead',side:'blue',health:4,p:p(110,125),
  blockedTime:0,nav:[]};
 Object.defineProperty(lead,'plan',{get(){planReads++;return move;}});
 const follow={id:'follow',side:'blue',health:4,p:p(110,145),
  plan:[{kind:'move',id:1,p:p(110,40)}],blockedTime:0,nav:[]};
 const door={id:'ENTRY',a:p(80,100),b:p(140,100),
  open:true,openFraction:1,kind:'hinged'};
 const schedule=new Map([
  ['lead',[{actorId:'lead',doorId:'ENTRY',fromSide:1,rank:0,eta:1}]],
  ['follow',[{actorId:'follow',doorId:'ENTRY',fromSide:1,rank:1,eta:2}]]
 ]);
 const s={operators:[lead,follow],doors:[door],seconds:0,events:[]};
 const step=coordinatePassage(s,lead,p(110,124),schedule);
 assert.equal(step.hold,false);
 assert.ok(planReads<=2,'no extra owner readiness scan for same-direction entry');
});
test('D3.1: production motor uses direct fallback, not a stride-sized filtered roster',()=>{
 const src=readFileSync(new URL('../src/breach-motor-door.ts',import.meta.url),'utf8');
 assert.doesNotMatch(src,/automaticCandidates/);
 assert.match(src,/autoDoorAtBodyContact\(a\.p,move,\s*s\.doors,/);
});
