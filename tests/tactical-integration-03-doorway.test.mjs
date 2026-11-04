import test from 'node:test';
import assert from 'node:assert/strict';
import {approachingNarrowThreshold}
 from '../src/breach-passage.ts';
const narrow={id:'DOOR',a:{x:40,y:100},b:{x:88,y:100}};
const wide={...narrow,b:{x:120,y:100}};
test('narrow-passage convoy remains aligned through the approach',()=>{
 assert.equal(approachingNarrowThreshold(
  {x:64,y:32},{x:64,y:190},[narrow]),true);
 assert.equal(approachingNarrowThreshold(
  {x:64,y:160},{x:64,y:190},[narrow]),false);
 assert.equal(approachingNarrowThreshold(
  {x:170,y:32},{x:170,y:190},[narrow]),false);
 assert.equal(approachingNarrowThreshold(
  {x:64,y:-120},{x:64,y:190},[narrow]),false);
 assert.equal(approachingNarrowThreshold(
  {x:64,y:32},{x:64,y:190},[wide]),false);
});
