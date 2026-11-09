import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,WALLS,COVER} from '../src/breach-core.ts';
import {releaseEmbeddedMotorActor} from '../src/breach-locomotion-clearance.ts';
const actor=point=>({
 p:{...point},priorP:{...point},velocity:30,squeeze:true,squeezeTime:.4,
 blockedTime:2,lastBlocker:'furniture',nav:[{x:210,y:100}],
 retryRouteAt:20
});
test('ordinary collision-free positions do not mutate motor state',()=>{
 activateSite({walls:[],cover:[],doors:[]});
 try{
  const a=actor({x:200,y:200}),before=structuredClone(a);
  assert.equal(releaseEmbeddedMotorActor(a,{x:250,y:200},[],1/60),false);
  assert.deepEqual(a,before);
 }finally{activateSite(null);}
});
test('shallow embedded furniture releases outward, retaining authored commands',()=>{
 activateSite({walls:[],cover:[{x:100,y:100,w:20,h:20,low:false}],doors:[]});
 try{
  const a=actor({x:115,y:100}),goal={x:170,y:100};
  const moved=releaseEmbeddedMotorActor(a,goal,[],1/60);
  assert.equal(moved,true);
  assert.ok(a.p.x>115,'only monotonic outward physical step permitted');
  assert.deepEqual(a.priorP,{x:115,y:100});
  assert.equal(a.lastBlocker,'clear');
  assert.equal(a.velocity,0);
  assert.equal(a.squeeze,false);
  assert.deepEqual(a.nav,[]);
  assert.equal(COVER.length,1);
 }finally{activateSite(null);}
});
test('a shallow wall embed can only depart without removing static walls',()=>{
 activateSite({walls:[{a:{x:100,y:80},b:{x:100,y:140}}],cover:[],doors:[]});
 try{
  const a=actor({x:104,y:100});
  assert.equal(releaseEmbeddedMotorActor(a,{x:155,y:100},[],1/60),true);
  assert.ok(a.p.x>104);
  assert.equal(WALLS.length,1);
 }finally{activateSite(null);}
});
