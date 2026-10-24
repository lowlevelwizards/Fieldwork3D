import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_COUNT, CLOUD_TRAVEL_SPAN, REGION_HALF_WIDTH, cloudAt,
  cloudCoverAtHour, cloudPresence, cloudShadowAt, cloudShadowStrength,
} from '../src/cloud-model.ts';

test('clouds always have deterministic positions from the existing clock', () => {
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const sample = cloudAt(i, 9.25);
    assert.deepEqual(sample, cloudAt(i, 9.25));
    assert.ok(Number.isFinite(sample.x) && Number.isFinite(sample.z));
    assert.ok(sample.y > 0 && sample.scale > 0);
    assert.ok(sample.rank > 0 && sample.rank < 1);
    assert.ok(sample.x >= -CLOUD_TRAVEL_SPAN / 2);
    assert.ok(sample.x < CLOUD_TRAVEL_SPAN / 2);
  }
});
test('clouds move across the region, but hourly drift loops seamlessly at midnight', () => {
  assert.equal(REGION_HALF_WIDTH, 5);
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const before = cloudAt(i, 0);
    const after = cloudAt(i, 24);
    assert.ok(Math.abs(before.x - after.x) < 1e-8);
    assert.ok(Math.abs(before.z - after.z) < 1e-8);
  }
  assert.notEqual(cloudAt(0, 10).x, cloudAt(0, 10.1).x);
});
test('cloud cover ranges between zero and one, densest at dawn', () => {
  assert.ok(cloudCoverAtHour(6) > cloudCoverAtHour(12.5));
  assert.ok(cloudCoverAtHour(19) > cloudCoverAtHour(12.5));
  assert.equal(cloudCoverAtHour(0), cloudCoverAtHour(24));
  assert.ok(Math.abs(cloudCoverAtHour(24-.0001)-cloudCoverAtHour(.0001)) < .0001);
  for (let hour = 0; hour <= 24; hour += .05) {
    const value = cloudCoverAtHour(hour);
    assert.ok(value >= 0 && value <= 1);
  }
});
test('coverage smoothly fades fixed cloud shapes without popping', () => {
  assert.equal(cloudPresence(0,.5),0);
  assert.equal(cloudPresence(1,.5),1);
  assert.ok(cloudPresence(.501,.5) > cloudPresence(.499,.5));
  for (let cover=0;cover<=1;cover+=.01) {
    assert.ok(cloudPresence(cover,.5)>=0 && cloudPresence(cover,.5)<=1);
  }
});
test('shadow projects away from sun and vanishes when the sun is down', () => {
  const cloud = { x: 0, z: 0, y: 4, scale: 1, rank: .3 };
  const p = cloudShadowAt(cloud,{x: .5, y: .7, z: -.5});
  assert.ok(p.x<0 && p.z>0);
  assert.equal(cloudShadowStrength(0,-.3,1),0);
  assert.equal(cloudShadowStrength(2,.7,0),0);
  assert.ok(cloudShadowStrength(2,.7,1)>.05);
});
