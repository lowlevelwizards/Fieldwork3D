import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {stepCivilianResponse} from '../src/breach-civilian-response.ts';

const subject=(id='civ:firefight')=>createCivilian({
 id,role:'visitor',persona:'steady',activity:'idle',
 position:{x:0,y:0},heading:0,roomId:'hall',appearanceSeed:15
});
const blue={
 id:'BLUE',p:{x:70,y:0},heading:Math.PI,health:4,
 velocity:0,posture:'stand',side:'blue',aim:0,lastShotAt:-100
};
const firing={
 id:'RED',p:{x:130,y:6},heading:Math.PI,health:4,
 velocity:0,posture:'stand',side:'red',aim:0,lastShotAt:.39
};
const world=(people,canSee=()=>true)=>({
 noise:[],people,doors:[],walls:[],windows:[],
 canSee,canReach:()=>true,routeTo:()=>[]
});
const primed=()=>{
 const c=subject();
 // Both shapes were progressively recognized on earlier physical sight
 // ticks. Only the present tick may decide whether shooting was witnessed.
 c.visualProgress.BLUE=1;c.visualProgress.RED=1;
 c.lastVisualId='BLUE/caution';
 return c;
};
test('EQA3.12 a witnessed shooter outranks a closer familiar operator in either order',()=>{
 for(const people of [[blue,firing],[firing,blue]]){
  const c=primed();
  stepCivilianResponse(c,.42,.2,world(people));
  assert.equal(c.lastVisualId,'RED/alarm');
  assert.deepEqual(c.threatEstimate,firing.p);
  assert.equal(c.lastFlinchAt,.42);
  assert.equal(c.state,'startled');
  assert.ok(c.visualProgress.BLUE>0,'secondary sight confidence still advances');
  assert.ok(c.visualProgress.RED>0);
  // A continuing alarm is not a fresh flinch on every observer tick.
  stepCivilianResponse(c,.62,.2,world(people));
  assert.equal(c.lastFlinchAt,.42);
 }
});
test('EQA3.12 retained confidence behind a wall never grants a new visual alarm',()=>{
 const c=primed();
 stepCivilianResponse(c,.42,.2,world([blue,firing],
  (_from,to)=>to.x!==firing.p.x));
 assert.equal(c.lastVisualId,'BLUE/caution');
 assert.equal(c.lastFlinchAt,-100);
 assert.equal(c.threatEstimate,null);
});
test('EQA3.12 peripheral or rear unseen shooter is not treated as witnessed',()=>{
 const c=primed();
 const behind={...firing,p:{x:-100,y:6}};
 stepCivilianResponse(c,.42,.2,world([blue,behind]));
 assert.equal(c.lastVisualId,'BLUE/caution');
 assert.equal(c.lastFlinchAt,-100);
 assert.equal(c.threatEstimate,null);
});
test('EQA3.12 visibly aimed hostile outranks a familiar operator without shots',()=>{
 const c=primed();
 const aimed={...firing,lastShotAt:-100,aim:1};
 stepCivilianResponse(c,.42,.2,world([blue,aimed]));
 assert.equal(c.lastVisualId,'RED/alarm');
 assert.deepEqual(c.threatEstimate,aimed.p);
});
