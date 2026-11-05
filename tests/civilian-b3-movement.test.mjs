import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {stepCivilianMovement}
 from '../src/breach-civilian-movement.ts';
const fixture={id:'civ:5:0',role:'resident',persona:'steady',
 activity:'working',position:{x:40,y:50},heading:0,roomId:'a',
 routine:[{x:40,y:50},{x:110,y:50}],appearanceSeed:10};
test('E5-B3: civilian pauses then walks a verified short routine',()=>{
 const c=createCivilian(fixture),clear=()=>true,occupied=()=>false;
 stepCivilianMovement(c,1,1/60,clear,occupied);
 assert.equal(c.routineIndex,1);
 const until=c.dwellUntil;
 stepCivilianMovement(c,until+.05,1/60,clear,occupied);
 assert.ok(c.p.x>40&&c.p.x<110);
 for(let i=1;i<500;i++)
  stepCivilianMovement(c,until+i/60,1/60,clear,occupied);
 assert.ok(c.routineIndex>=2);
 assert.ok(c.p.x<=110);
});
test('E5-B3: walls, doors and occupants veto each individual step',()=>{
 const c=createCivilian(fixture);
 stepCivilianMovement(c,1,1/60,()=>true,()=>false);
 let checks=0;
 stepCivilianMovement(c,c.dwellUntil+.1,1/60,()=>{checks++;return false},()=>false);
 assert.equal(c.p.x,40);
 assert.equal(c.velocity,0);
 assert.ok(checks>0);
 const d=createCivilian(fixture);
 stepCivilianMovement(d,1,1/60,()=>true,()=>false);
 stepCivilianMovement(d,d.dwellUntil+.1,1/60,()=>true,()=>true);
 assert.equal(d.p.x,40);
});
test('E5-B3: frozen and injured people never move autonomously',()=>{
 for(const state of ['frozen','compliant','wounded','incapacitated']){
  const c=createCivilian(fixture);c.state=state;
  c.routineIndex=1;
  stepCivilianMovement(c,20,1,()=>true,()=>false);
  assert.deepEqual(c.p,fixture.position);
  assert.equal(c.velocity,0);
 }
});
