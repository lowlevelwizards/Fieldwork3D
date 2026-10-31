import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {turnHierarchy} from '../src/breach-turn-hierarchy.ts';
test('185: exactly one final pelvis/root yaw assignment in rig pose',()=>{
  const s=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
  const pose=s.slice(s.indexOf('export function poseOperator('));
  assert.equal((pose.match(/r\.root\.rotation\.y=/g)||[]).length,1);
  assert.match(pose,/const scheduledYaw=p\.pelvisYaw/);
  assert.match(pose,/const turn=turnHierarchy/);
});
test('185: head and torso yaw remain bounded',()=>{
  const r=turnHierarchy({pelvisYaw:0,bodyHeading:2.9,
    targetHeading:-2.9,speed:0,aiming:true});
  assert.ok(Math.abs(r.chestYaw)<=.7);
  assert.ok(Math.abs(r.headYaw)<=.43);
});
