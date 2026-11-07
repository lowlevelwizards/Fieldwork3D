import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFireLane,fireLaneReachable} from '../src/breach-fire-safety.ts';

const from={x:0,y:0},to={x:100,y:0};
const lane=(friend,endpoint=to)=>
 assessFireLane(from,26,endpoint,26,[],[],[],[friend]);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('Hotfix: first 12 units of actual muzzle ray are no longer a friendly-fire blind spot',()=>{
 for(const friend of [{x:0,y:0},{x:1,y:0},{x:5,y:2},
                     {x:9.9,y:7},{x:11.9,y:10},{x:12.1,y:2},
                     {x:35,y:0},{x:-9,y:0},{x:98,y:0},
                     {x:105,y:0}]){
  assert.equal(lane(friend).blocker,'friendly',
   'near or farther teammate directly in outgoing corridor: '+
   JSON.stringify(friend));
 }
 assert.equal(lane({x:5,y:0}).point.x,5,
  'the veto identifies the actual near teammate');
});

test('Hotfix: backward/sideways friendlies are not fictitious forward blockers',()=>{
 for(const friend of [{x:-12,y:0},{x:-11,y:0},{x:5,y:11},
                     {x:50,y:15},{x:110.5,y:0},{x:115,y:0}]){
  assert.equal(lane(friend).blocker,'clear',
   'teammates whose physical body is outside the ray are not blocking: '+
   JSON.stringify(friend));
 }
 assert.equal(assessFireLane(from,26,{x:100,y:100},26,[],[],[],
  [{x:7,y:7}]).blocker,'friendly',
 'diagonal outgoing muzzle ray must use the same near-contact safety rule');
});

test('Hotfix: cover-penetrating previews can never override a friendly veto',()=>{
 const blocked=lane({x:6,y:0});
 assert.equal(fireLaneReachable(blocked,{
  end:to,remaining:1
 },to),false);
 assert.equal(fireLaneReachable({blocker:'clear'},null,to),true);
 const wall={a:{x:50,y:-20},b:{x:50,y:20}};
 assert.equal(assessFireLane(from,26,to,26,[],[wall],[],
   [{x:6,y:0}]).blocker,'wall',
  'the established solid-world priority is unchanged');
});

