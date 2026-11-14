import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {route,setRouteGridAuditObserver} from '../src/breach-core.ts';
import {diagnoseMovement} from '../src/breach-nav-diagnostics.ts';
import {D311RouteSurvey} from '../scripts/lib/d3-11-route-quality.mjs';

test('D3.11A actual A* observer is opt-in and does not change route',()=>{
 const origin={x:80,y:90},goal={x:224,y:195};
 const canStand=p=>p.x>20&&p.y>20&&p.x<400&&p.y<400&&
   !(p.x>135&&p.x<175&&p.y<145&&p.y>50);
 const before=route(origin,goal,canStand),events=[];
 try{
  setRouteGridAuditObserver(e=>events.push(e));
  const after=route(origin,goal,canStand);
  assert.deepEqual(after,before,'route and A* tie ordering must not change');
  assert.ok(events.length>=1);
  assert.ok(events.every(e=>e.expanded>0&&e.elapsedMs>=0));
  assert.ok(events.some(e=>e.found));
 }finally{setRouteGridAuditObserver(null);}
 const total=events.length;
 route(origin,goal,canStand);
 assert.equal(events.length,total,'no retained observer after reset');
});
test('D3.11A survey records actual travel and disposable route changes',()=>{
 const goal={x:100,y:100};
 const a={id:'rook',p:{x:0,y:0},nav:[],plan:[{kind:'move'}],
  lastBlocker:'clear',blockedTime:0,velocity:0,recoveryAttempts:0,
  routeGoalKey:'100:100',motorPause:null,squeeze:false};
 const survey=new D311RouteSurvey([a],new Map([['rook',goal]]),{
  traceActor:'rook',traceEvery:1});
 a.nav=[{x:20,y:0},{...goal}];a.p={x:5,y:0};
 survey.sample([a],1/60);
 a.p={x:20,y:0};a.nav=[{...goal}];
 survey.sample([a],2/60);
 const result=survey.finish();
 assert.equal(result.actors[0].routeSelections,1);
 assert.equal(result.actors[0].waypointAdvances,1);
 assert.equal(result.actors[0].travel,20);
 assert.equal(result.trace.length,2);
});
test('D3.11B diagnostic honors owner-world relocated physical cover',()=>{
 const bounds={minX:0,minY:0,maxX:600,maxY:600};
 const base={x:400,y:400,w:20,h:20,fixture:'crate'};
 const physical={...base,x:300,y:300};
 const owner={
  bounds,
  someWallNearPoint:()=>false,
  someCoverNearPoint(_point,_radius,cb){return cb(physical,0);}
 };
 const from={x:272,y:300},to={x:291,y:300};
 assert.equal(diagnoseMovement(from,to,[],[],8,owner).blocker,'furniture');
 // Moving the same owner's cover away is a live collision input change;
 // no global activation is required or permitted.
 physical.x=500;
 assert.equal(diagnoseMovement(from,to,[],[],8,owner).blocker,'clear');
 const other={...owner,someCoverNearPoint(_point,_radius,cb){
  return cb({...base,x:285,y:300},0);}};
 assert.equal(diagnoseMovement(from,to,[],[],8,other).blocker,'furniture');
});
test('D3.11B motor contact probe passes authoritative session context',()=>{
 const src=readFileSync(new URL('../src/breach-motor-route.ts',import.meta.url),'utf8');
 assert.match(src,/diagnoseMovement\(a\.p,contactProbe,s\.doors,\[\],OPERATOR_RADIUS,\s*sessionWorldGeometry\(s\)\)/);
});
