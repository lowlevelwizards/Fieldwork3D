/** C6 contract tests: generated site panes, navigation barriers and 2D view. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {windowPaneSegment} from '../src/breach-windows.ts';
import {windowPresentationKnown} from '../src/breach-presentation.ts';
import {synchronizeWindowBarriers}
 from '../src/worldgen/window-collider-sync.ts';
import {auditArchitecturalFeatures}
 from '../src/worldgen/architecture-feature-audit.ts';
import {windowApertureSegment,windowBarrierFootprint,
  windowBarrierMatches,auditWindowGeometryContract}
 from '../src/worldgen/window-geometry-contract.ts';
import {createBreach2DWorldRenderer,renderBreachTacticalWorldFrame}
 from '../src/breach-2d-world-renderer.ts';
const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

const makeWindow=(id,vertical,sillHeight=14)=>({
 id,x:80,y:80,width:48,vertical,style:'picture',
 sillHeight,headHeight:48
});
test('C6 one aperture and collider define horizontal, vertical and full glass',()=>{
 for(const vertical of [true,false]){
  for(const sill of [0,14,28]){
   const opening=makeWindow('P',vertical,sill);
   const copy=structuredClone(opening);
   const pane=windowApertureSegment(opening);
   const physical=windowBarrierFootprint(opening);
   assert.deepEqual(pane,vertical?
    {a:{x:80,y:56},b:{x:80,y:104}}:
    {a:{x:56,y:80},b:{x:104,y:80}});
   assert.equal(physical.w,vertical?10:48);
   assert.equal(physical.h,vertical?48:10);
   assert.equal(physical.low,sill<25);
   assert.equal(physical.fixture,sill===0?'glass-barrier':'window-sill');
   assert.equal(physical.topHeight,sill===0?48:sill);
   assert.deepEqual(windowPaneSegment({...opening,open:false,integrity:2,
     shattered:false,operable:true}),pane,
    'gameplay bullet intersection must use identical endpoints');
   assert.deepEqual(opening,copy);
  }
 }
});

test('C6 window barrier sync is repeatable and does not alter other furniture',()=>{
 const windows=[makeWindow('W0',false,0),
  {...makeWindow('W1',true,28),x:160,y:120}];
 const chair={x:100,y:180,w:24,h:12,fixture:'chair'};
 const junk={x:5,y:5,w:16,h:10,fixture:'window-sill'};
 const site={windows,cover:[chair,junk]};
 const original=structuredClone(site);
 const a=synchronizeWindowBarriers(site),b=synchronizeWindowBarriers(a);
 assert.deepEqual(a,b,'one collider per window after repeated passes');
 assert.deepEqual(site,original,'original world data must remain immutable');
 assert.equal(a.cover.length,3);
 assert.deepEqual(a.cover[0],chair);
 assert.deepEqual(a.cover.slice(1),windows.map(windowBarrierFootprint));
 assert.deepEqual(auditWindowGeometryContract(a),[]);
 assert.equal(auditWindowGeometryContract(site).length>=2,true);
});

test('C6 auditor rejects a near-but-wrong barrier, duplicate IDs and orphan sills',()=>{
 const w=makeWindow('P',false,14),correct=windowBarrierFootprint(w);
 const near={...correct,w:correct.w+6};
 const site={windows:[w],cover:[near]};
 assert.deepEqual(auditWindowGeometryContract(site).map(x=>x.kind),
  ['missing-barrier','orphan-barrier']);
 const bad={windows:[w,{...w}],cover:[correct,{...correct}]};
 assert.ok(auditWindowGeometryContract(bad).some(x=>x.kind==='duplicate-window'));
 assert.ok(auditWindowGeometryContract(bad).some(x=>x.kind==='duplicate-barrier'));
 const inverted={windows:[{...w,headHeight:10}],cover:[correct]};
 assert.ok(auditWindowGeometryContract(inverted).some(x=>x.kind==='invalid-window'));
});

test('C6 real generated sites satisfy exact physical glazing contracts',()=>{
 let total=0,interior=0,glass=0;
 for(const seed of [2,3,4,9,17,23]){
  const site=generateSite(seed,'small');
  const windows=site.windows??[];
  const failures=auditWindowGeometryContract(site);
  assert.deepEqual(failures,[],site.name+' seed '+seed);
  const assessment=auditArchitecturalFeatures(site);
  assert.ok(!assessment.issues.some(x=>/window|barrier/.test(x)),
   'feature audit must agree with generated physical glazing');
  for(const opening of windows){
   total++;
   if(opening.interior)interior++;
   if(opening.sillHeight===0)glass++;
   assert.equal(site.cover.filter(c=>windowBarrierMatches(opening,c)).length,1);
   const {a,b}=windowApertureSegment(opening);
   assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-opening.width)<1e-5);
  }
 }
 assert.ok(total>0);
 assert.ok(interior>=0&&glass>=0);
});

test('C6 structural windows respect briefing modes and previously seen colliders',()=>{
 const opening={...makeWindow('W0',false),x:90,y:40};
 const inside={...opening,id:'IW',y:88,interior:true};
 const site={rooms:[{id:'R',x:40,y:40,w:100,h:100}],windows:[opening,inside],
  cover:[windowBarrierFootprint(opening),windowBarrierFootprint(inside)]};
 const intel={mode:'true-blind',cover:new Set()};
 const session={site,intel};
 assert.equal(windowPresentationKnown(session,opening),false);
 assert.equal(windowPresentationKnown(session,inside),false);
 intel.cover.add(0);
 assert.equal(windowPresentationKnown(session,opening),true,
  'historical/squad physical discovery persists without new live LOS');
 assert.equal(windowPresentationKnown(session,inside),false);
 intel.mode='exterior-known';intel.cover.clear();
 assert.equal(windowPresentationKnown(session,opening),true,
  'accessible public facade is already briefed');
 assert.equal(windowPresentationKnown(session,inside),false);
 intel.mode='floor-plan';
 assert.equal(windowPresentationKnown(session,inside),true,
  'floor plan is intentionally briefed architecture');
 intel.mode='true-blind';
 assert.equal(windowPresentationKnown(session,inside,true),true,
  'explicit full replay may intentionally show all geometry');
});

function canvasStub(){
 const calls={lines:[],fillRects:[],strokeRects:[]};
 const draw={
  save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
  stroke(){},fill(){},closePath(){},translate(){},scale(){},
  setLineDash(){},fillText(){},strokeRect(...v){calls.strokeRects.push(v)},
  fillRect(...v){calls.fillRects.push(v)},setTransform(){}
 };
 return {calls,draw};
}
test('C6 rendered Floor Plan uses actual generated window apertures',()=>{
 const state=newSession(0,8,'full-view','small');
 state.phase='running';
 const {calls,draw}=canvasStub();
 const renderer=createBreach2DWorldRenderer({
  draw,rect(){},line(a,b,color){calls.lines.push({a,b,color})},
  circle(){},getState:()=>state,isReplaying:()=>false,
  getDoorFocusId:()=>null,
  replayKnowledge:{omniscient:false,observerId:null},
  replayPlayback:{time:0}
 });
 renderer.architecture();
 const windows=state.site.windows??[];
 assert.ok(windows.length>0);
 for(const w of windows){
  const p=windowApertureSegment(w);
  assert.ok(calls.lines.some(l=>l.color==='#8bb6af'&&
    JSON.stringify([l.a,l.b])===JSON.stringify([p.a,p.b])),
   'missing Floor Plan pane '+w.id);
 }
});
test('C6 board frame uses actual non-origin world bounds',()=>{
 const {calls,draw}=canvasStub(),called=[];
 const nothing=()=>{};
 const state={site:{bounds:{minX:-30,minY:75,maxX:930,maxY:1050}},
   operators:[],civilians:[]};
 const frame={
  stage:null,viewMode:'plan2d',draw,dpr:1,cssW:460,cssH:680,
  ox:0,oy:0,viewScale:1,state,replaying:false,replayAnalysis:false,
  world2D:{terrain:nothing,furniture:nothing,renderGroundMarks:nothing,
   renderLightingMood2D:nothing,renderWeaponLights2D:nothing,
   architecture:nothing},
  fog2D:{renderFog:nothing,renderPersonalGround:nothing},
  actor2D:{missionMarkers:nothing,contacts:nothing,endMessage:nothing,
   drawExecutionProblem:nothing},
  route2D:{paths:nothing},
  replay2D:{renderReplayMovementHistory:nothing,renderReplayGhosts:nothing,
   renderReplayBallistics:nothing,renderReplayFollowMarker:nothing},
  projected2D:{renderProjectedPlans:nothing}
 };
 renderBreachTacticalWorldFrame(frame);
 assert.deepEqual(calls.fillRects.slice(-1)[0],[-39,66,978,993]);
 assert.deepEqual(calls.strokeRects.slice(-1)[0],[-30,75,960,975]);
});
test('C6 consumers share pane contract without moving simulation or replay',()=>{
 const builder=source('rendering/breach-site-openings-builder.ts');
 const physics=source('breach-windows.ts');
 const sync=source('worldgen/window-collider-sync.ts');
 const floor=source('breach-2d-world-renderer.ts');
 const presentation=source('breach-presentation.ts');
 assert.match(builder,/const edge=windowApertureSegment\(opening\)/);
 assert.match(physics,/return windowApertureSegment\(w\)/);
 assert.match(sync,/map\(windowBarrierFootprint\)/);
 assert.match(floor,/windowPresentationKnown\(state,opening,/);
 assert.match(floor,/windowApertureSegment\(opening\)/);
 assert.match(presentation,/s\.intel\.cover\.has\(i\)&&windowBarrierMatches/);
 assert.match(floor,/const bounds=state\.site\?\.bounds\?\?/);
 assert.doesNotMatch(source('worldgen/window-geometry-contract.ts'),
  /stepSession\(|liveVisibility\(|document\.|window\.location|WebGLRenderer|newSession\(/);
});
