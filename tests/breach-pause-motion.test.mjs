import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ReplayMotionRecorder} from '../src/breach-replay-motion.ts';
test('planning retains fixed-step contacts and live direction',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(main,/!replaying\?recorder\.motion\.presentation\(/);
 assert.match(scene,/liveMotion\?\.travelYaw\[actor\.id\]/);
 assert.match(scene,/liveMotion\?\.feet\[actor\.id\]/);
});
test('paused motion presentation does not schedule new steps',()=>{
 const film=new ReplayMotionRecorder();
 const actor={id:'one',p:{x:120,y:180},velocity:0,heading:0,turning:0,
  posture:'stand',injuryStage:0,health:100,aim:0,pace:'walk',squeeze:false,
  squeezeYaw:0,plan:[],blockedTime:0,nav:[]};
 film.record(0,[actor],[]);
 const n=film.stepEventCount;
 assert.deepEqual(film.presentation(0,['one']),film.presentation(0,['one']));
 assert.equal(film.stepEventCount,n);
});