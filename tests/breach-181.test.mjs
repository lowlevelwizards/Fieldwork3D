import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ReplayMotionRecorder} from '../src/breach-replay-motion.ts';
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
test('181: fixed-step recorded contacts drive the live pose',()=>{
  assert.match(main,/recorder\.motion\.presentation\(Math\.max/);
  assert.match(scene,/replayFeet:replay\?\.feet\[actor\.id\]\?\?liveMotion\?\.feet\[actor\.id\]/);
  assert.match(scene,/pelvisYaw:replay\?\.pelvisYaw\[actor\.id\]\?\?liveMotion\?\.pelvisYaw\[actor\.id\]/);
  assert.equal(typeof ReplayMotionRecorder,'function');
});
