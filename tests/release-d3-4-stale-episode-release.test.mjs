import test from 'node:test';
import assert from 'node:assert/strict';
import {syncDoorTraversalEpisode} from '../src/breach-door-traversal-episode.ts';
const p=(x,y)=>({x,y});
const door={id:'FRONT',a:p(290,260),b:p(332,260),kind:'hinged',
 hinge:'a',swing:1,open:true,openedAt:0,openFraction:1};
const actor=()=>({
 id:'vale',side:'blue',health:4,p:p(311,222),
 plan:[{id:16,kind:'move',p:p(442.14,462)}],
 nav:[p(176,288)],blockedTime:0,lastBlocker:'clear',
 doorTraversal:null,doorTraversalLastProbeAt:-10
});
test('D3.4: remote lateral CROSS from stale FRONT episode releases ownership',()=>{
 const a=actor(),e=syncDoorTraversalEpisode(a,[door],1);
 assert.ok(e);
 a.p=p(500,268);
 assert.equal(syncDoorTraversalEpisode(a,[door],1.1)?.phase,'cross',
  'lateral drift reproduces the signed-side crossing false ownership');
 const authored=a.plan[0],nav=a.nav;
 assert.equal(syncDoorTraversalEpisode(a,[door],1.2),null);
 assert.equal(a.doorTraversal,null);
 assert.equal(a.plan[0],authored);
 assert.equal(a.nav,nav,'releasing episode cannot alter the motor route');
});
test('D3.4: remote blocked direct episode releases without another replan',()=>{
 const a=actor(),e=syncDoorTraversalEpisode(a,[door],1);
 assert.ok(e);
 a.p=p(500,268);e.phase='blocked';e.obstructionReason='wall';
 assert.equal(syncDoorTraversalEpisode(a,[door],2),null);
 assert.equal(a.doorTraversal,null);
});
test('D3.4: nearby crossing and active outside-leaf maneuver keep ownership',()=>{
 const a=actor(),e=syncDoorTraversalEpisode(a,[door],1);
 assert.ok(e);
 a.p=p(310,268);e.phase='cross';
 assert.equal(syncDoorTraversalEpisode(a,[door],1.2),e);
 e.maneuver='outside-leaf';e.waypoints=[p(300,260)];
 a.p=p(500,268);
 assert.equal(syncDoorTraversalEpisode(a,[door],1.4),e,
  'existing dedicated maneuver owns its route until established rules release it');
});
