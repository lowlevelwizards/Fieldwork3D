import test from 'node:test';
import assert from 'node:assert/strict';
import {directorShoulderSide} from '../src/breach-replay-director-shots.ts';
const operatorPoint={x:100,y:100};
const actionAxis={x:1,y:0};
const shot=(x,y,axis=actionAxis)=>({
  cameraAnchor:{x,y},operatorPoint,actionAxis:axis
});
test('R10.1 accepts only genuine far-offset rear shoulders',()=>{
  assert.notEqual(directorShoulderSide(shot(50,45)),0);
  assert.notEqual(directorShoulderSide(shot(50,155)),0);
  assert.equal(directorShoulderSide(shot(150,45)),0);
  assert.equal(directorShoulderSide(shot(50,100)),0);
  assert.equal(directorShoulderSide(shot(50,90)),0);
});
test('R10.1 judges the action axis rather than the travel axis',()=>{
  assert.notEqual(directorShoulderSide(shot(50,45)),0);
  assert.equal(directorShoulderSide(shot(50,45,{x:-1,y:0})),0);
});
