import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ReplayMotionRecorder} from '../src/breach-replay-motion.ts';
import {handlingPose} from '../src/breach-weapon-pose.ts';

const actor=(squeeze,squeezeYaw)=>({
  id:'a',p:{x:180,y:200},heading:0,squeeze,squeezeYaw,
  velocity:0,turning:0,posture:'stand',pace:'walk',injuryStage:0,
  health:100,aim:0,plan:[],blockedTime:0,nav:[]
});
test('190B: squeeze aligns pelvis and recorded feet with shoulder-first motion',()=>{
  const recorder=new ReplayMotionRecorder();
  recorder.record(0,[actor(true,-Math.PI/2)],[]);
  const p=recorder.presentation(0,['a']);
  assert.ok(p.feet.a);
  assert.ok(Math.abs(p.pelvisYaw.a-Math.PI/2)<.001);
});
test('190B: short-stock posture wins over active aiming while squeezed',()=>{
  const pose=handlingPose({aim:1,moving:.25,obstruction:false,
    friendlyNear:false,intent:'squeeze',weapon:'carbine'});
  assert.equal(pose,'short');
});
test('190B: replay persists squeeze state and live uses same gait facts',()=>{
  const s=readFileSync(new URL('../src/breach-replay.ts',import.meta.url),'utf8');
  assert.match(s,/squeeze:a\.squeeze,squeezeYaw:a\.squeezeYaw/);
  const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
  assert.match(scene,/gait:actor\.squeeze\?'squeeze'/);
  assert.match(scene,/handlingIntent:actor\.squeeze\?'squeeze'/);
});
