import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian,setCivilianState} from '../src/breach-civilian-types.ts';
import {stepCivilianMovement} from '../src/breach-civilian-movement.ts';
const person=()=>createCivilian({id:'civ:test:1',role:'resident',
 persona:'cautious',activity:'idle',position:{x:40,y:40},
 heading:0,roomId:'lobby',appearanceSeed:19});

test('LE3: an authored FOLLOW releases a former panic route and retry backoff',()=>{
 const c=person();c.state='fleeing';c.goal={x:180,y:90};
 c.nav=[{x:120,y:90}];c.retryAt=50;c.dwellUntil=55;
 c.blockedTime=1.2;c.lastEscortRouteAt=18;
 assert.equal(setCivilianState(c,'escorted',20),true);
 assert.equal(c.state,'escorted');
 assert.deepEqual(c.nav,[]);assert.equal(c.goal,null);
 assert.equal(c.retryAt,20);assert.equal(c.dwellUntil,20);
 assert.equal(c.blockedTime,0);assert.equal(c.lastEscortRouteAt,-100);
 // Only mission(s) may now author the actual follow goal from the escort.
 // When it does, the actor may physically move without waiting for old fear.
 c.goal={x:62,y:40};
 stepCivilianMovement(c,20+1/60,1/60,()=>true,()=>false);
 assert.ok(c.p.x>40&&c.p.x<62);
 assert.equal(c.state,'escorted');
});

test('LE3: reassigning an existing FOLLOW abandons the former escort route',()=>{
 const c=person();c.state='escorted';c.following='rook';
 c.goal={x:200,y:55};c.nav=[{x:80,y:55}];
 c.blockedTime=1;c.retryAt=30;c.dwellUntil=31;
 c.lastEscortRouteAt=17;
 assert.equal(setCivilianState(c,'escorted',22),true);
 assert.equal(c.state,'escorted');
 assert.deepEqual(c.nav,[]);assert.equal(c.goal,null);
 assert.equal(c.retryAt,22);assert.equal(c.dwellUntil,22);
 assert.equal(c.lastEscortRouteAt,-100);
 // The command executor alone owns changing following to the new operator.
 assert.equal(c.following,'rook');
});

test('LE3: SECURE removes panic navigation but never moves a compliant person',()=>{
 const c=person();c.state='startled';c.goal={x:100,y:90};
 c.nav=[{x:70,y:60}];c.retryAt=28;c.dwellUntil=30;
 assert.equal(setCivilianState(c,'compliant',14),true);
 assert.deepEqual(c.nav,[]);assert.equal(c.goal,null);
 assert.equal(c.retryAt,14);assert.equal(c.dwellUntil,14);
 const at={...c.p};
 stepCivilianMovement(c,14.4,1/60,()=>true,()=>false);
 assert.deepEqual(c.p,at);
});

test('LE3: impossible incapacitated custody is still rejected',()=>{
 const c=person();c.health=0;c.injuryStage=3;
 assert.equal(setCivilianState(c,'escorted',10),false);
 assert.equal(setCivilianState(c,'compliant',10),false);
 assert.equal(c.state,'routine');
});

test('LE3: ordinary routines retain their existing route and dwell semantics',()=>{
 const c=person();c.goal={x:60,y:40};
 c.nav=[{x:50,y:40}];c.dwellUntil=20;
 assert.equal(setCivilianState(c,'attentive',10),true);
 assert.deepEqual(c.nav,[{x:50,y:40}]);
 assert.equal(c.dwellUntil,20);
});
