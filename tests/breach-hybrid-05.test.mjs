import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
const planted=(x,y,phase='planted',progress=1)=>({
 position:{x,y},height:0,contact:phase!=='swinging',
 phase,progress,worldYaw:0,pitch:0
});
const input=(velocity,feet)=>({velocity,heading:0,travelYaw:0,
 turning:0,injury:0,posture:'stand',position:{x:0,y:0},
 feet,hybridSupport:true});
test('hybrid pelvis follows one supporting shoe, no time bob',()=>{
 const feet=[planted(0,-5.6,'swinging'),planted(0,5.6)];
 const moving=bodyFromContacts(input(44,feet));
 assert.ok(moving.pelvisSide>0);
 assert.equal(bodyFromContacts(input(0,feet)).pelvisSide,0);
});
test('landing changes pelvis height smoothly without independent cycle',()=>{
 const a=bodyFromContacts(input(44,[planted(0,-5.6),
   planted(0,5.6,'landing',.5)]));
 const b=bodyFromContacts(input(44,[planted(0,-5.6),
   planted(0,5.6,'landing',.55)]));
 assert.ok(Math.abs(a.pelvisY-b.pelvisY)<.4);
});