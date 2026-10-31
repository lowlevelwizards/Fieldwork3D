import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
const foot=(x,side)=>({position:{x,y:side},phase:'planted',
  contact:true,progress:0,worldYaw:0,height:0});
const input=(x)=>({velocity:30,heading:0,travelYaw:0,
  turning:0,injury:0,posture:'stand',position:{x:0,y:0},
  feet:[foot(x,-5.6),foot(0,5.6)]});
test('184: contact geometry produces actual reach compression',()=>{
  const balanced=bodyFromContacts(input(1));
  const stretched=bodyFromContacts(input(14));
  assert.ok(stretched.pelvisY<balanced.pelvisY);
  assert.ok(stretched.pelvisY>=-3.5);
});
test('184: no accumulated idle sway',()=>{
  const s=bodyFromContacts({...input(0),velocity:0});
  assert.equal(s.pelvisSide,0);
  assert.equal(s.chestLift,0);
});
