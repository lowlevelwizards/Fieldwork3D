/** D3.31: a generated ENTRY may request one existing physical-world
 * replan early ONLY when a real second already-open leaf actually blocks.
 * Test is pure; no survey adjustment, waypoint movement or door mutation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldProbeEarlyFollowOnOpenLeaf}
 from '../src/breach-d331-follow-on-open-leaf.ts';
const p=(x,y)=>({x,y});
const leaf=(id='SERVICE')=>({
 id,a:p(0,0),b:p(0,42),hinge:'a',swing:-1,
 kind:'hinged',open:true,openFraction:1,
 angularVelocity:0,pushTarget:1,
 locked:false,jammed:false,wedged:false,heldBy:null
});
const actor=()=>({
 side:'blue',p:p(0,0),nav:[p(20,60),p(80,120)],
 plan:[{id:14,kind:'move',p:p(80,120),entryDoorId:'FRONT'}],
 blockedTime:.4,lastBlocker:'door',lastNavRepairAt:15,
 retryRouteAt:0,doorTraversal:null,traversal:null,
 traversalPending:false,squeeze:false,fireRetreatTarget:null,
 autoSidestep:null
});
const probe=(a,doors=[leaf()],blocked=true,now=30)=>(
 shouldProbeEarlyFollowOnOpenLeaf(a,p(80,120),doors,now,blocked));

test('D3.31 real second OPEN leaf permits existing world replan before .85s stall',()=>{
 const a=actor(),doors=[leaf('FRONT'),leaf('SERVICE')];
 assert.equal(probe(a,doors),true);
 assert.equal(a.blockedTime,.4);
 assert.equal(a.recoveryAttempts,undefined,
  'the pure gate neither clears nor increments recovery attempts');
 assert.deepEqual(a.plan[0].p,p(80,120));
 assert.equal(a.nav.length,2,'never mutates disposable route');
 assert.equal(doors[1].openFraction,1,'never opens/rotates door');
});
test('D3.31 primary ENTRY leaf cannot override its genuine queue/hinge owner',()=>{
 const a=actor();
 assert.equal(probe(a,[leaf('FRONT')]),false);
 a.doorTraversal={doorId:'FRONT'};
 assert.equal(probe(a,[leaf('SERVICE')]),false);
 a.doorTraversal=null;
 a.traversalPending=true;
 assert.equal(probe(a),false);
});
test('D3.31 no early replan for ordinary authored MOVE, remote GO, or partial/locked hinge',()=>{
 const a=actor();
 a.plan[0].entryDoorId=undefined;
 assert.equal(probe(a),false);
 a.plan[0].entryDoorId='FRONT';
 const door=leaf();
 for(const patch of [
  {open:false},{openFraction:.93},{angularVelocity:.42},
  {locked:true},{jammed:true},{wedged:true},{heldBy:'enemy'},
  {kind:'sliding'}
 ]){
  assert.equal(probe(a,[{...door,...patch}]),false,JSON.stringify(patch));
 }
 assert.equal(probe(a,[{...door,a:p(500,500),b:p(500,542)}]),false);
 assert.equal(shouldProbeEarlyFollowOnOpenLeaf(a,p(90,120),[door],30,true),
  false,'no mismatch of current motor target and authored GO');
});
test('D3.31 requires measured physical collision, bounded retry and cold age',()=>{
 const a=actor();
 assert.equal(probe(a,undefined,false),false);
 a.blockedTime=.34;
 assert.equal(probe(a),false);
 a.blockedTime=.85;
 assert.equal(probe(a),false,'normal unchanged recovery owns >=.85s');
 a.blockedTime=.4;
 a.lastNavRepairAt=29.5;
 assert.equal(probe(a),false,'do not churn early A* during cooldown');
 a.lastNavRepairAt=15;
 a.retryRouteAt=31;
 assert.equal(probe(a),false);
 a.retryRouteAt=0;
 a.lastBlocker='wall';
 assert.equal(probe(a),false,'not a genuine leaf contact');
});
