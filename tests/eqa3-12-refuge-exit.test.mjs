import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {chooseCivilianRefuge} from '../src/breach-civilian-refuge.ts';
import {stepCivilianMovement} from '../src/breach-civilian-movement.ts';

const far={x:320,y:70};
const side={x:70,y:140};
const civilian=()=>{
 const c=createCivilian({
  id:'civ:eqa3-12-exit',role:'employee',persona:'steady',
  activity:'working',position:{x:70,y:70},heading:0,
  roomId:'hall',appearanceSeed:12
 });
 // Only an observed/audibly estimated location is available to the
 // civilian, not the hostile's truth or its chosen combat target.
 c.threatEstimate={x:100,y:70};
 c.fear=.85; // Active alarm, not a calm person's stale estimate.
 c.refugePoints=[far,side];
 return c;
};
test('EQA3.12 a highly ranked destination beyond danger cannot lure a fleeing civilian through it',()=>{
 const c=civilian();
 const chosen=chooseCivilianRefuge(c,{canReach:()=>true});
 assert.deepEqual(chosen?.goal,side,
  'the physically clear lateral refuge wins over a long run through danger');
 assert.deepEqual(chosen?.path,[]);
});
test('EQA3.12 a blocked lateral exit uses verified detour rather than danger shortcut',()=>{
 const c=civilian();
 const detour=[{x:40,y:70},{x:40,y:140},side];
 const clear=(a,b)=>!(
  a.x===70&&a.y===70&&b.x===70&&b.y===140
 );
 const chosen=chooseCivilianRefuge(c,{
  canReach:clear,
  routeTo:(_a,to)=>to===side?detour:[],
  isCrowded:()=>false
 });
 assert.deepEqual(chosen?.goal,side);
 assert.deepEqual(chosen?.path,detour);
 c.state='fleeing';c.goal=chosen.goal;c.nav=chosen.path;
 for(let i=0;i<520;i++)stepCivilianMovement(c,1+i/60,1/60,
  clear,()=>false);
 assert.ok(Math.hypot(c.p.x-side.x,c.p.y-side.y)<10);
 assert.equal(c.state,'hiding','movement still reaches the verified refuge');
});
test('EQA3.12 blocked or crowded safe exits leave person frozen, never teleport',()=>{
 const c=civilian(),start={...c.p};
 assert.equal(chooseCivilianRefuge(c,{
  canReach:()=>true,
  isCrowded:p=>p===side
 }),null,'an unsafe remaining corridor is not a fallback');
 assert.equal(chooseCivilianRefuge(c,{
  canReach:()=>false,routeTo:()=>[]
 }),null,'a blocked exit cannot be traversed without a physical route');
 assert.deepEqual(c.p,start);
});
