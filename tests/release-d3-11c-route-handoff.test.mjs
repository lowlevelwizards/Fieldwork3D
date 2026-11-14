import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setTransientRouteObserver,setTransientRoute,prependTransientLeg}
 from '../src/breach-route-transition.ts';
const p=(x,y)=>({x,y});
test('C1: transient route provenance is exact, opt-in and never edits an order',()=>{
 const a={id:'rook',nav:[p(20,30)],plan:[{id:42,kind:'move',p:p(90,100)}],
  squeeze:true,blockedTime:0,lastBlocker:'door',
  routeGoalKey:'180:200',doorTraversal:{doorId:'FRONT',phase:'open',maneuver:'direct'}};
 const s={seconds:12,doors:[{id:'FRONT',openFraction:.8}]};
 const before=structuredClone(a.plan),events=[];
 try{
  setTransientRouteObserver(e=>events.push(e));
  setTransientRoute(s,a,[p(32,44)],'full-body-lane');
  prependTransientLeg(s,a,p(24,33),'local-detour');
  assert.deepEqual(events.map(e=>e.source),['full-body-lane','local-detour']);
  assert.deepEqual(events[0].prior,[p(20,30)]);
  assert.deepEqual(events[0].next,[p(32,44)]);
  assert.equal(events[0].doorFraction,.8);
  assert.deepEqual(events[1].next,[p(24,33),p(32,44)]);
 }finally{setTransientRouteObserver(null);}
 setTransientRoute(s,a,[p(80,80)],'collision-world-replan');
 assert.equal(events.length,2,'no observer persists');
 assert.deepEqual(a.plan,before);
});

test('C2: circling at the door cannot renew its actual progress clock',async()=>{
 const {noteMeaningfulDoorProgress}=await import('../src/breach-door-traversal-episode.ts');
 const door={id:'FRONT',a:p(0,0),b:p(40,0)};
 const e={approachSide:1,maneuver:'direct',waypoints:[],
  lastProgressAt:1,bestSignedDepth:30,progressWaypoint:null};
 for(const [i,x] of [10,20,15,24,12,30].entries()){
  assert.equal(noteMeaningfulDoorProgress(e,p(x,30),p(50,70),door,2+i/10),false);
 }
 assert.equal(e.lastProgressAt,1,'lateral shuffling is not forward progress');
 assert.equal(noteMeaningfulDoorProgress(e,p(30,27),p(50,70),door,4),true);
 assert.equal(e.lastProgressAt,4);
 assert.equal(noteMeaningfulDoorProgress(e,p(5,27),p(50,70),door,5),false);
 assert.equal(noteMeaningfulDoorProgress(e,p(5,23),p(50,70),door,6),true);
});
test('C2: an owned outside-leaf path can make legitimate lateral progress',async()=>{
 const {noteMeaningfulDoorProgress}=await import('../src/breach-door-traversal-episode.ts');
 const door={id:'FRONT',a:p(0,0),b:p(40,0)};
 const target=p(36,34);
 const e={approachSide:1,maneuver:'outside-leaf',waypoints:[target],
  lastProgressAt:1,bestSignedDepth:30,progressWaypoint:null};
 assert.equal(noteMeaningfulDoorProgress(e,p(6,30),target,door,2),false);
 assert.equal(noteMeaningfulDoorProgress(e,p(12,30),target,door,3),true);
 assert.equal(e.lastProgressAt,3);
 assert.equal(noteMeaningfulDoorProgress(e,p(8,30),target,door,4),false);
 assert.equal(e.lastProgressAt,3);
 // A new arbitrary waypoint cannot masquerade as owned maneuver progress.
 assert.equal(noteMeaningfulDoorProgress(e,p(8,30),p(80,30),door,5),false);
});

test('C3: physically legal oriented squeeze retains its route; real stalls can recover',()=>{
 const collision=readSource('../src/breach-motor-collision.ts');
 const guard=collision.indexOf('if(!normalClear&&!(a.squeeze&&narrowClear)&&');
 const probe=collision.indexOf('recoverNormalLane(a.p,p,s.doors,world)');
 assert.ok(guard>=0&&probe>guard,'normal-lane A* must be gated by actual narrow clearance');
 assert.match(collision.slice(guard,probe),/!blocking&&!closed&&!a\.traversalPending/);
 assert.match(collision,/const traversable=a.squeeze\?narrowClear:normalClear/);
});
function readSource(path){
 return requireText(new URL(path,import.meta.url));
}
function requireText(url){
 return readFileSync(url,'utf8');
}
