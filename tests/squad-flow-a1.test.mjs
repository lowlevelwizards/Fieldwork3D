import test from 'node:test';
import assert from 'node:assert/strict';
import {passageFollowerStep,passageWait,PASSAGE_FOLLOW_GAP}
 from '../src/breach-passage.ts';

const door={id:'ENTRY',a:{x:40,y:100},b:{x:88,y:100},open:true};
const at=(x,y)=>({x,y});
const actor=(id,x,y,goalY=180,side='blue')=>({
 id,side,p:at(x,y),goal:at(x,goalY),
 health:4,blockedTime:0,active:true
});
const d=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);

test('A1: a follower uses legal partial forward room instead of fully stopping',()=>{
 const lead=actor('lead',64,113),follow=actor('follow',64,90);
 const members=[follow,lead],wanted=at(64,95),before=structuredClone(members);
 assert.equal(passageWait(follow,[door],members,{},1,wanted),true);
 const actual=passageFollowerStep(follow,[door],members,wanted);
 assert.ok(actual.y>follow.p.y+.5&&actual.y<wanted.y-1,
  'partial legal travel must remain available: '+JSON.stringify(actual));
 assert.ok(d(actual,lead.p)>=PASSAGE_FOLLOW_GAP-.001);
 assert.equal(passageWait(follow,[door],members,{},1,actual),false,
  'a capped forward stride must pass the existing lease gate');
 assert.deepEqual(members,before,'neither actor nor authored goal was changed');
});

test('A1: an exactly full queue gap returns a zero step without passing through',()=>{
 const lead=actor('lead',64,110),follow=actor('follow',64,90);
 const candidate=passageFollowerStep(follow,[door],[lead,follow],at(64,94));
 assert.deepEqual(candidate,follow.p);
 assert.equal(passageWait(follow,[door],[lead,follow],{},1,at(64,94)),true);
});

test('A1: a spacious convoy retains the intended motor step',()=>{
 const lead=actor('lead',64,123),follow=actor('follow',64,90);
 const wanted=at(64,92);
 assert.deepEqual(passageFollowerStep(follow,[door],[lead,follow],wanted),
  wanted);
});

test('A1: a genuine diagonal exit to another full-body lane is not clamped',()=>{
 const lead=actor('lead',68,107),follow=actor('follow',50,92);
 const wanted=at(48,95);
 assert.deepEqual(passageFollowerStep(follow,[door],[follow,lead],wanted),
  wanted);
});

test('A1: retreat, inactive actors and different factions remain unrestricted',()=>{
 const lead=actor('lead',64,109),follow=actor('follow',64,91);
 const reverse=at(64,89);
 assert.deepEqual(passageFollowerStep(follow,[door],[lead,follow],reverse),
  reverse);
 const held={...follow,active:false};
 assert.deepEqual(passageFollowerStep(held,[door],[lead,held],at(64,94)),
  at(64,94));
 const enemy={...lead,id:'hostile',side:'red'};
 assert.deepEqual(passageFollowerStep(follow,[door],[enemy,follow],at(64,94)),
  at(64,94));
});

test('A1: four same-lane operators preserve individual authored destinations',()=>{
 const members=[
  actor('one',64,113),actor('two',64,90),
  actor('three',64,66),actor('four',64,42)
 ];
 const old=structuredClone(members);
 const intended=members.map(a=>at(a.p.x,a.p.y+5));
 const limited=members.map((a,i)=>
  passageFollowerStep(a,[door],members,intended[i]));
 assert.deepEqual(members,old);
 assert.ok(limited[1].y>90&&limited[1].y<95);
 assert.ok(limited[2].y<=71);
 assert.deepEqual(limited[3],intended[3],
  'distant fourth member should continue into the stack');
});

test('A1: a wide passage does not gain synthetic single-file throttling',()=>{
 const wide={...door,b:at(125,100)};
 const lead=actor('lead',64,111),follow=actor('follow',64,91);
 const wanted=at(64,95);
 assert.deepEqual(passageFollowerStep(follow,[wide],[lead,follow],wanted),
  wanted);
});
