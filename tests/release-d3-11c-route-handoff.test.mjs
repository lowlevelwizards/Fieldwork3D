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

test('C3: disproven broad squeeze guard is absent; full-width rescue still eligible',()=>{
 const collision=readSource('../src/breach-motor-collision.ts');
 assert.doesNotMatch(collision,/!\(a\.squeeze&&narrowClear\)/);
 assert.match(collision,/if\(!normalClear&&!blocking&&!closed&&!a\.traversalPending/);
 assert.match(collision,/const traversable=a.squeeze\?narrowClear:normalClear/);
});
function readSource(path){
 return requireText(new URL(path,import.meta.url));
}
function requireText(url){
 return readFileSync(url,'utf8');
}

test('C3: failed proactive short-stage adoption stays disabled',()=>{
 const motor=readSource('../src/breach-motor-route.ts');
 const collision=readSource('../src/breach-motor-collision.ts');
 const maneuver=readSource('../src/breach-door-traversal-maneuver.ts');
 assert.doesNotMatch(motor,/tryRehearsedDoorManeuver\(a,s,p,false,true\)/);
 assert.doesNotMatch(collision,/tryRehearsedDoorManeuver\(a,s,p,canAutoSidestep,true\)/);
 assert.doesNotMatch(maneuver,/afterSweptLeafEscape/);
 assert.match(maneuver,/episode\.maneuverAttempts>=2&&!leafChanged/);
 assert.match(maneuver,/episode\.maneuverAttempts>=4/);
});
