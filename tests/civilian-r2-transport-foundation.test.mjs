import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianTransportEligible,takeCivilianCustody,
 dropCivilianCustody,proposedCivilianTransportStep}
 from '../src/breach-civilian-transport.ts';
const person=()=>createCivilian({id:'civ:r2:1',role:'rescue',
 persona:'steady',activity:'waiting',position:{x:20,y:0},
 heading:0,roomId:'r',appearanceSeed:8,isRescueTarget:true});
test('R2-A1 civilian custody is exclusive and only for incapacitated people',()=>{
 const c=person(),a={id:'a',health:4,carryingId:null},
 b={id:'b',health:4,carryingId:null};
 assert.equal(civilianTransportEligible(c,a),false);
 c.health=0;c.injuryStage=3;c.following='b';
 assert.equal(takeCivilianCustody(c,a),true);
 assert.equal(c.carriedById,'a');assert.equal(a.carryingId,c.id);
 assert.equal(c.following,null);
 assert.equal(takeCivilianCustody(c,b),false);
 assert.equal(dropCivilianCustody(c,b),false);
 assert.equal(dropCivilianCustody(c,a),true);
 assert.equal(c.carriedById,null);assert.equal(a.carryingId,null);
});
test('R2-A1 physical trailing moves no faster than bounded carrier displacement',()=>{
 const p=proposedCivilianTransportStep({x:20,y:0},{x:0,y:0},
  {x:1,y:0},0,'drag',()=>true,[]);
 assert.ok(p);
 assert.ok(Math.hypot(p.x-20,p.y)<=2.0001);
 assert.ok(p.x<20);
});
test('R2-A1 body refuses blocked geometry and occupied landing',()=>{
 const from={x:20,y:0},a={x:0,y:0},to={x:2,y:0};
 assert.equal(proposedCivilianTransportStep(from,a,to,0,'drag',
  ()=>false,[]),null);
 const candidate=proposedCivilianTransportStep(from,a,to,0,'drag',
  ()=>true,[]);
 assert.ok(candidate);
 assert.equal(proposedCivilianTransportStep(from,a,to,0,'drag',
  ()=>true,[candidate]),null);
});
