import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
const foot=(y,phase)=>({position:{x:0,y},height:0,
 phase,contact:phase!=='swinging',worldYaw:0,progress:1});
const body=(feet,speed=48)=>bodyFromContacts({velocity:speed,heading:0,
 travelYaw:0,turning:0,injury:0,posture:'stand',feet,
 position:{x:0,y:0},hybridSupport:true});
test('support side counterrotates shoulders and head in connected solver',()=>{
 const left=body([foot(-5.6,'planted'),foot(5.6,'swinging')]);
 const right=body([foot(-5.6,'swinging'),foot(5.6,'planted')]);
 assert.ok(left.torsoYaw*right.torsoYaw<0);
 assert.ok(Number.isFinite(left.headCounter));
 assert.ok(Number.isFinite(right.headCounter));
 const idle=body([foot(-5.6,'planted'),foot(5.6,'planted')],0);
 assert.ok(Math.abs(idle.torsoYaw)<1e-8);
});
