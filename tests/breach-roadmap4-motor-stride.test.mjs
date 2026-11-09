import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {sampleActorMotorStride} from '../src/breach-actor-motor-stride.ts';
test('motor stride advances authoritative velocity while retaining physical limits',()=>{
 const s=newSession(),a=team(s)[0];
 a.velocity=0;a.posture='stand';a.suppression=0;a.injuryStage=0;
 const before={...a.p};
 const sample=sampleActorMotorStride(a,s,
  {x:before.x+100,y:before.y},a.heading,1/60,100,1);
 assert.ok(Number.isFinite(sample.move.x)&&Number.isFinite(sample.move.y));
 assert.ok(a.velocity>0&&a.velocity<=75);
 assert.ok(Math.hypot(sample.move.x-before.x,sample.move.y-before.y)<=a.velocity/60+.0001);
});
