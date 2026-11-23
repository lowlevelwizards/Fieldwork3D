import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {physicalFollowGoal} from '../src/breach-follow-physical-policy.ts';
import {validateThrow,sampleThrow} from '../src/breach-flash.ts';
import {newSession,team} from '../src/breach-game.ts';
import {selectedActionTarget} from '../src/breach-action-target-marker.ts';
import {ExecutionNoticeFeed} from '../src/ui/execution-feedback.ts';
import {executionStatus} from '../src/breach-execution-state.ts';
import {activateSite} from '../src/breach-core.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const close=(a,b)=>d(a,b)<.001;

test('following subjects yield a side/back corridor rather than stop the leader',()=>{
 const leader={p:{x:50,y:50},heading:0,priorP:{x:49,y:50},velocity:38};
 const follower={p:{x:70,y:53}};
 const goal=physicalFollowGoal(leader,follower);
 assert.ok(goal.x<leader.p.x,'yield goes behind actual travel');
 assert.ok(Math.abs(goal.y-leader.p.y)>24,'yield moves off the travel corridor');
 assert.ok(d(goal,leader.p)>32,'do not instruct a body-overlapping goal');
 const behind=physicalFollowGoal(leader,{p:{x:10,y:50}});
 assert.ok(behind.x<leader.p.x);
 const actors=read('src/breach-simulation-actor-phase.ts');
 assert.match(actors,/rotate\(a,angle\(a\.p,leader\.p\),h,s\)/);
 const civilians=read('src/breach-simulation-motion-phase.ts');
 assert.match(civilians,/civil\.heading=Math\.atan2\(leader\.p\.y-civil\.p\.y/);
});

test('direct flash throws stay straight in the ground plane while their height arcs',()=>{
 const from={x:0,y:0},to={x:110,y:20};
 const path=validateThrow(from,to,[],[],{walls:[]});
 assert.equal(path.valid,true);assert.equal(path.mode,'direct');
 assert.equal(path.points.length,2);
 for(const t of [0,.15,.4,.7,1]){
   const point=sampleThrow(path,t);
   assert.ok(close(point.p,{x:110*t,y:20*t}));
   assert.ok(point.height>=2);
 }
});

test('corner hook is a physically reached hand pivot, not airborne steering',()=>{
 const from={x:0,y:5},to={x:40,y:-15};
 const walls=[{a:{x:20,y:-40},b:{x:20,y:0}}];
 const path=validateThrow(from,to,[],[],{walls});
 assert.equal(path.valid,true);
 assert.equal(path.mode,'doorway');
 assert.ok(path.via);
 assert.ok(d(from,path.via)<=29);
 assert.equal(path.points.length,3);
 assert.ok(close(sampleThrow(path,0).p,path.via),
   'grenade must start airborne at hand/corner release, not operator center');
 for(const t of [0,.25,.5,.75,1]){
   const p=sampleThrow(path,t).p;
   const expected={x:path.via.x+(to.x-path.via.x)*t,
     y:path.via.y+(to.y-path.via.y)*t};
   assert.ok(close(p,expected),'the path after hand release must be straight');
 }
 const remote=validateThrow({x:-50,y:5},to,[],[],{walls});
 assert.notEqual(remote.mode,'doorway','a remote hand must not hook the wall');
});

test('a single real wall reflection avoids steering through an obstructing wall',()=>{
 const from={x:0,y:0},to={x:100,y:0};
 const walls=[
   {a:{x:45,y:-8},b:{x:45,y:8}},
   {a:{x:0,y:30},b:{x:100,y:30}}
 ];
 const path=validateThrow(from,to,[],[],{walls});
 assert.equal(path.valid,true);
 assert.equal(path.mode,'bank');
 assert.equal(path.points.length,3);
 assert.ok(close(sampleThrow(path,0).p,from));
 assert.ok(close(sampleThrow(path,1).p,to));
 assert.ok(Math.abs(path.via.y-30)<.001);
 assert.equal(sampleThrow(path,.5).p.y>20,true);
});

test('selected action marker is attached to the actual persistent prop identity',()=>{
 const s=newSession(0,4);
 try{
   const a=team(s)[0];
   s.coverState=[{id:'known-push',x:a.p.x+20,y:a.p.y,
     w:12,h:12,fixture:'crate'}];
   s.intel.cover.add(0);
   a.plan=[{id:999,kind:'interact',p:{...a.p},
     objectId:'prop:known-push',interaction:'push'}];
   const chosen=selectedActionTarget(s,a,999);
   assert.deepEqual(chosen,{p:{x:a.p.x+20,y:a.p.y},kind:'prop'});
   s.coverState[0].x+=15;
   assert.equal(selectedActionTarget(s,a,999)?.p.x,s.coverState[0].x);
   s.intel.cover.delete(0);
   assert.equal(selectedActionTarget(s,a,999),null,
     'unseen cover cannot be identified by a UI dot');
 }finally{activateSite(null);}
});

test('resolved blocked orders and old entry interruptions do not persist in notices',()=>{
 const feed=new ExecutionNoticeFeed();
 const blocked={id:1,t:.4,actor:'rook',p:{x:0,y:0},
   orderId:44,kind:'blocked',reason:'door-locked',
   text:'ROOK DOOR BLOCKED · LOCKED'};
 assert.equal(feed.update([], 'running',1000,[blocked],
   [{id:'rook',plan:[{id:44}]}])?.severity,'warning');
 assert.notEqual(feed.update([], 'running',1010,[],
   [{id:'rook',plan:[]}])?.severity,'warning');
 const later=feed.update(['ENTRY INTERRUPTED'], 'planning',1200,[],
   [{id:'rook',plan:[]}]);
 assert.equal(later?.text?.includes('ENTRY INTERRUPTED'),false);
 // A shifted legacy event buffer is historical, not a new obstruction.
 // Current typed notices still show when the matching order is active.
 const stale=feed.update(['ROOK PATH BLOCKED · DOOR LOCKED · ORDER CANCELLED'],
   'running',1600,[],[{id:'rook',plan:[]}]);
 assert.notEqual(stale?.severity,'warning');
 const execution=read('src/breach-execution-state.ts');
 assert.match(execution,/ctx\.showHistoricalIssues!==false&&a\.interruptedDoorPlan/);
 const hud=read('src/ui/tactical-hud-controller.ts');
 assert.match(hud,/showHistoricalIssues:false/);
 const overlay=read('src/breach-2d-route-overlays.ts');
 assert.doesNotMatch(overlay,/paintInterruptedEntryMarker/);
 const projected=read('src/breach-2d-projected-overlays.ts');
 assert.doesNotMatch(projected,/paintInterruptedEntryMarker/);
});

test('paused OPEN uses real hand reach and high-ready, flashburst overlay survives fog',()=>{
 const scene=read('src/breach-3d.ts');
 assert.match(scene,/preOpenDoorCandidate\(s,previewActor,plannedDoor!/);
 assert.match(scene,/handlingOverride:previewPreOpen\?'high':undefined/);
 const pose=read('src/breach-operator-animation-controller.ts');
 assert.match(pose,/if\(p\.flashHookPoint/);
 const fx=read('src/ui/breach-tactical-frame-feedback-controller.ts');
 assert.match(fx,/for\(const burst of state\.flashBursts\)/);
 assert.match(fx,/worldToScreen\(burst\.p,17\)/);
});
