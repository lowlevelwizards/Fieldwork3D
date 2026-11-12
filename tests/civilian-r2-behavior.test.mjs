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

test('R2.4: a frozen civilian can reconsider only after genuinely new evidence',()=>{
 const c=actor('startled',8);
 c.p={x:70,y:70};c.heading=0;c.refugePoints=[{x:25,y:70}];
 c.state='frozen';c.stateSince=1;c.lastEvidenceAt=.8;
 c.threatEstimate={x:120,y:70};c.fear=.8;
 stepCivilianResponse(c,1.5,.5,world);
 assert.equal(c.state,'frozen','old evidence must not force a new flight');
 const noise={id:12,p:{x:100,y:70},radius:260,time:2,
  kind:'gunshot'};
 stepCivilianResponse(c,2.2,.7,{...world,noise:[noise]});
 assert.equal(c.state,'fleeing');
 assert.deepEqual(c.goal,{x:25,y:70});
 const pickedAt=c.lastRefugeRecheckAt;
 stepCivilianResponse(c,2.35,.15,{...world,noise:[noise]});
 assert.equal(c.lastRefugeRecheckAt,pickedAt,'no per-frame re-route');
});
test('R2.4: changed threat estimate can invalidate a fleeing path, never teleport',()=>{
 const c=actor('steady');
 c.p={x:70,y:70};c.state='fleeing';c.stateSince=1;c.fear=.9;
 c.goal={x:38,y:70};c.nav=[{x:38,y:70}];
 c.refugePoints=[{x:125,y:70}];
 c.threatEstimate={x:35,y:70};c.lastEvidenceAt=2.5;
 const prior={...c.p};
 stepCivilianResponse(c,3,.5,world);
 assert.equal(c.state,'fleeing');
 assert.deepEqual(c.goal,{x:125,y:70});
 assert.deepEqual(c.p,prior,'response only selects a route; motor moves bodies');
});
test('R2.4: unreachable refuge preserves freeze rather than inventing safe travel',()=>{
 const c=actor('steady');
 c.p={x:70,y:70};c.state='frozen';c.stateSince=1;
 c.fear=.8;c.lastEvidenceAt=2.5;
 c.threatEstimate={x:130,y:70};c.refugePoints=[{x:30,y:70}];
 stepCivilianResponse(c,3,.5,{...world,canReach:()=>false,routeTo:()=>[]});
 assert.equal(c.state,'frozen');assert.equal(c.goal,null);
 assert.deepEqual(c.p,{x:70,y:70});
});
