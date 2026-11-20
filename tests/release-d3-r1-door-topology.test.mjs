import test from 'node:test';
import assert from 'node:assert/strict';
import {doorApproach,lockpickApproach} from '../src/breach-door.ts';
import {bodyClear} from '../src/breach-navigation.ts';

const p=(x,y)=>({x,y});
const target={id:'TARGET',kind:'hinged',a:p(200,200),b:p(246,200),
 hinge:'a',swing:-1,open:false,openFraction:0};
const intervening={id:'INTERVENING',kind:'hinged',a:p(200,231),b:p(246,231),
 hinge:'a',swing:-1,open:false,openFraction:0};
const world={passable:()=>true,walls:[]};
test('R1.05b: live door staging cannot select a point inside any intervening leaf',()=>{
 const from=p(223,263),doors=[target,intervening];
 for(const candidate of [
  doorApproach(from,target,world,[],0,doors),
  lockpickApproach(from,target,world,doors)
 ]){
  if(!candidate)continue; // No full-body route is a legitimate refusal.
  assert.ok(bodyClear(candidate,doors,9,world),
   'real selected stance must respect all nearby panels');
 }
});
test('R1.05b: ordinary one-door callers retain backward-compatible staging',()=>{
 const from=p(223,270),candidate=doorApproach(from,target,world);
 if(candidate)assert.ok(bodyClear(candidate,[target],9,world));
});
