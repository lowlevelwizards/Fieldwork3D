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

test('D3.11B preview fallback reuses failed normal A* instead of repeating it',async()=>{
 const {activateSite}=await import('../src/breach-core.ts');
 const {initialIntel,routeWithIntel}=await import('../src/breach-intel.ts');
 const {routeWithSqueezeIntel}=await import('../src/breach-squeeze-route.ts');
 activateSite(null);
 const intel=initialIntel('full-view',undefined,[]);
 const from={x:210,y:250},goal={x:159,y:189}; // fixed cover interior
 const normal=routeWithIntel(intel,from,goal);
 assert.deepEqual(normal,[],'test must represent a genuinely failed normal route');
 const observed=[];
 try{
  setRouteGridAuditObserver(e=>observed.push(e));
  const original=routeWithSqueezeIntel(intel,from,goal);
  const repeated=observed.length;
  observed.length=0;
  const hinted=routeWithSqueezeIntel(intel,from,goal,normal);
  assert.deepEqual(hinted,original,'hint cannot affect route or squeeze selection');
  assert.ok(repeated>=1,'old fallback repeats the already-failed normal A*');
  assert.equal(observed.length,0,'ineligible narrow destination needs no extra A*');
 }finally{setRouteGridAuditObserver(null);activateSite(null);}
 const preview=readFileSync(new URL('../src/breach-route-cache.ts',import.meta.url),'utf8');
 assert.match(preview,/routeWithSqueezeIntel\(intel,snapped,to,normal\)/);
});

test('D3.11A excludes forensic offline probes from measured live route budget',()=>{
 const audit=readFileSync(new URL('../scripts/audit-r7-squad-execution.mjs',import.meta.url),'utf8');
 assert.match(audit,/if\(grid\)setRouteGridAuditObserver\(grid\.observe\);\s*try\{\s*stepSession\(session,1\/60\);\s*\}finally\{\s*if\(grid\)setRouteGridAuditObserver\(null\);/);
 assert.ok(audit.indexOf('setRouteGridAuditObserver(null);',
  audit.indexOf('stepSession(session,1/60)'))<
  audit.indexOf('captureD32RecoveryFeasibility(a,session,'),
  'offline body/blocker route probing must be excluded');
});
