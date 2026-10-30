import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentHitsBox} from '../src/breach-ray.ts';
const box={x:10,y:10,w:8,h:8};
test('141A: analytic cover ray supports crossing, tangency, and endpoints',()=>{
  assert.equal(segmentHitsBox({x:0,y:10},{x:20,y:10},box),true);
  assert.equal(segmentHitsBox({x:0,y:0},{x:20,y:0},box),false);
  assert.equal(segmentHitsBox({x:0,y:6},{x:20,y:6},box),true);
  assert.equal(segmentHitsBox({x:10,y:10},{x:30,y:30},box),true);
  assert.equal(segmentHitsBox({x:0,y:0},{x:0,y:20},box),false);
  assert.equal(segmentHitsBox({x:7,y:7},{x:12,y:12},box),true);
});