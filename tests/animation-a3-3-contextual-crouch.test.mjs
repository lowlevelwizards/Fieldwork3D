import test from 'node:test';
import assert from 'node:assert/strict';
import {canContextuallyCrouch,validRearStack,contextualCrouchRecovery}
 from '../src/breach-contextual-crouch.ts';
import {assessFriendlyLane} from '../src/breach-fire-safety.ts';
import {newSession,team,stepSession,planMove,posture} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const p=(x,y)=>({x,y});
test('A3.3 genuinely clear standing-over-crouched lanes, head intersections still veto',()=>{
 const back=p(0,0),target=p(100,0);
 const front=p(40,0);
 assert.equal(assessFriendlyLane(back,28,target,32,
  [{...front,posture:'stand'}]).blocker,'friendly');
 assert.equal(assessFriendlyLane(back,28,target,32,
  [{...front,posture:'crouch'}]).blocker,'clear');
 assert.equal(assessFriendlyLane(back,25,target,25,
  [{...front,posture:'crouch'}]).blocker,'friendly');
 assert.equal(assessFriendlyLane(back,11,target,11,
  [{...front,posture:'crouch'}]).blocker,'friendly');
});
test('A3.3 rear-stack alignment and exact independent stance permission',()=>{
 assert.equal(validRearStack({...p(0,0),heading:0},p(40,0),p(100,0)),true);
 assert.equal(validRearStack({...p(0,0),heading:0},p(-40,0),p(100,0)),false);
 assert.equal(validRearStack({...p(0,0),heading:0},p(40,35),p(100,0)),false);
 assert.equal(validRearStack({...p(0,0),heading:2},p(40,0),p(100,0)),false);
 const normal={stationary:true,busy:false,authoredPosture:false,
  posture:'stand',originallyAutomatic:false};
 assert.equal(canContextuallyCrouch(normal),true);
 assert.equal(canContextuallyCrouch({...normal,authoredPosture:true}),false);
 assert.equal(canContextuallyCrouch({...normal,busy:true}),false);
 assert.equal(canContextuallyCrouch({...normal,stationary:false}),false);
 assert.equal(canContextuallyCrouch({...normal,posture:'crouch'}),false);
 assert.equal(canContextuallyCrouch({...normal,posture:'crouch',
  originallyAutomatic:true}),true);
});
test('A3.3 deterministic 1.1s lease; cancel on busy or authored stance',()=>{
 assert.deepEqual(contextualCrouchRecovery({autoUntil:0,now:3,
  advantage:true,busy:false,authored:false}),{crouch:true,until:4.1});
 assert.deepEqual(contextualCrouchRecovery({autoUntil:4,now:3,
  advantage:false,busy:false,authored:false}),{crouch:true,until:4});
 assert.deepEqual(contextualCrouchRecovery({autoUntil:4,now:5,
  advantage:false,busy:false,authored:false}),{crouch:false,until:0});
 assert.deepEqual(contextualCrouchRecovery({autoUntil:4,now:3,
  advantage:true,busy:false,authored:true}),{crouch:false,until:0});
 assert.deepEqual(contextualCrouchRecovery({autoUntil:4,now:3,
  advantage:true,busy:true,authored:false}),{crouch:false,until:0});
});
test('A3.3 manual posture remains authoritative; motor-owned move plans unaffected',()=>{
 const s=newSession(0,31063,'full-view','standard','hold');
 try{
  const a=team(s)[0];
  assert.equal(a.postureWasAuthored,false);
  assert.equal(posture(s,a.id),true);
  assert.equal(a.postureWasAuthored,true);
  assert.equal(a.posture,'crouch');
  assert.equal(a.autoCrouchUntil,0);
  const first={...a.p};
  const trial=p(first.x+16,first.y);
  const moved=planMove(s,a.id,trial);
  if(moved)assert.ok(a.plan.length>0);
  assert.equal(a.posture,'crouch');
 }finally{activateSite(null);}
});
