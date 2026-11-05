import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianBehaviorProfile,stepCivilianResponse}
 from '../src/breach-civilian-response.ts';
const world={noise:[],people:[],doors:[],walls:[],windows:[],
 canSee:()=>true,canReach:()=>true};
const actor=(persona,seed=39)=>createCivilian({id:'civ:r2:b1',
 role:'employee',persona,activity:'working',
 position:{x:50,y:50},heading:0,roomId:'shop',appearanceSeed:seed});
test('R2-B1 personalities use fixed, recognizable reaction thresholds',()=>{
 const steady=actor('steady'),easily=actor('startled');
 steady.fear=.48;easily.fear=.48;
 stepCivilianResponse(steady,.2,.2,world);
 stepCivilianResponse(easily,.2,.2,world);
 assert.equal(steady.state,'attentive');
 assert.equal(easily.state,'startled');
 assert.ok(civilianBehaviorProfile('startled').reaction<
   civilianBehaviorProfile('steady').reaction);
});
test('R2-B1 recovery requires both quiet time and a state dwell',()=>{
 const c=actor('steady');c.fear=.05;c.lastEvidenceAt=1;
 c.state='frozen';c.stateSince=9.5;
 stepCivilianResponse(c,10,.2,world);
 assert.equal(c.state,'frozen','recent state transition holds');
 stepCivilianResponse(c,11,.2,world);
 assert.equal(c.state,'routine','quiet and dwell allow recovery');
});
test('R2-B1 startled refuge choice is seeded, not sampled every tick',()=>{
 const a=actor('startled',0),b=actor('startled',8);
 a.fear=.9;b.fear=.9;
 a.refugePoints=[{x:15,y:50}];b.refugePoints=[{x:15,y:50}];
 a.threatEstimate={x:110,y:50};b.threatEstimate={x:110,y:50};
 for(const c of [a,b]){c.state='startled';c.stateSince=0;
   stepCivilianResponse(c,.5,.5,world);}
 assert.equal(a.state,'fleeing');
 assert.equal(b.state,'frozen');
});
