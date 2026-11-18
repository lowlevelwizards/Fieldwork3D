import test from 'node:test';
import assert from 'node:assert/strict';
import {projectReachableGoal} from '../src/breach-nav-diagnostics.ts';
import {intelNudgeSegmentClear} from '../src/breach-intel.ts';
import {newSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

test('D3.24C goal correction consults the injected knowledge-safe segment',()=>{
 const from={x:70,y:70},requested={x:100,y:100};
 const options={
  canStand:p=>p.x!==100||p.y!==100,
  routeTo:(from,to)=>[{...to}],
 };
 assert.equal(projectReachableGoal(from,requested,{
  ...options,canNudgeAcross:()=>false}),null,
  'an unacceptable known crossing must never be nudged past');
 const result=projectReachableGoal(from,requested,{
  ...options,canNudgeAcross:()=>true});
 assert.ok(result?.adjusted,'known-safe local nudge remains supported');
 assert.ok(Math.hypot(result.point.x-requested.x,
  result.point.y-requested.y)<=13.001);
});

test('D3.24C hidden wall is not tested or disclosed during known-only nudge',()=>{
 const scene={
  seed:2424,name:'D3.24C UNKNOWN WALL',training:true,layout:'corridor',
  rooms:[],roomCount:0,doors:[],cover:[],windows:[],
  walls:[{a:{x:180,y:80},b:{x:180,y:220}}],
  entrance:{x:120,y:120},
  spawn:[{x:120,y:120},{x:116,y:160},{x:136,y:180},{x:140,y:200}],
  enemies:[],objective:{x:300,y:120},extract:{x:300,y:120},
  bounds:{minX:0,minY:0,maxX:400,maxY:320}
 };
 const s=newSession(0,undefined,'true-blind','standard','intel',scene);
 try{
  const a={x:174,y:120},b={x:186,y:120};
  s.intel.walls.clear();
  assert.equal(intelNudgeSegmentClear(s.intel,a,b),true,
    'undiscovered geometry cannot change player planning outcome');
  assert.equal(s.intel.walls.size,0,'nudge never reveals unknown walls');
  s.intel.walls.add(0);
  assert.equal(intelNudgeSegmentClear(s.intel,a,b),false,
    'the same already-discovered wall cannot be nudged across');
 }finally{activateSite(null);}
});
