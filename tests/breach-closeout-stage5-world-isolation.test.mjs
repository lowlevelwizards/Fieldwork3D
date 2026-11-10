/** Closeout Stage 5 — multi-session presentation, replay ownership and
 * restart/editor isolation. Frozen combat, AI, movement and replay outcomes
 * remain covered by the unchanged authoritative critical suite.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,toggling,stepSession} from '../src/breach-game.ts';
import {activateSite,activeSite,WALLS,COVER,
 withTemporarySiteGeometry} from '../src/breach-core.ts';
import {sessionWorldGeometry,adoptPresentationWorldSession,
 withDetachedPresentationWorld,publishSessionCoverToActiveSite,
 setPresentationWorldSession} from '../src/breach-world-context.ts';
import {BreachMissionController} from '../src/breach-mission-controller.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {createBreach2DWorldRenderer}
 from '../src/breach-2d-world-renderer.ts';
import {dispatchTacticalPointerRelease}
 from '../src/breach-pointer-command-controller.ts';

const session=seed=>newSession(0,seed,'full-view','small');
const drawing=()=>{
 const walls=[],furniture=[],polygons=[];
 const ctx=new Proxy({},{
  get(target,key){
   if(key==='canvas')return {width:640,height:740};
   if(key==='moveTo'||key==='lineTo')
    return (x,y)=>polygons.push([x,y]);
   return ()=>{};
  },
  set(){return true;}
 });
 const draw=(getState)=>{
  const renderer=createBreach2DWorldRenderer({
   draw:ctx,rect:(...args)=>furniture.push(args),
   line:(a,b,color)=>{if(color==='#292f30')walls.push({a,b});},
   circle:()=>{},getState,isReplaying:()=>false,
   getDoorFocusId:()=>null,
   replayKnowledge:{omniscient:false,observerId:null},
   replayPlayback:{time:0}
  });
  return renderer;
 };
 return {draw,walls,furniture,polygons};
};
const camera=()=>readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
test('Stage 5: physical geometry module does not own active presentation',()=>{
 const world=readFileSync(new URL('../src/breach-world-context.ts',import.meta.url),'utf8');
 const presenter=readFileSync(new URL(
  '../src/breach-presentation-world-ownership.ts',import.meta.url),'utf8');
 assert.doesNotMatch(world,/\bactivateSite\s*\(/);
 assert.doesNotMatch(world,/\bCOVER\.splice\s*\(/);
 assert.match(presenter,/withDetachedPresentationWorld/);
 assert.match(presenter,/adoptPresentationWorldSession/);
 assert.match(presenter,/publishSessionCoverToActiveSite/);
});
test('Stage 5: background mission creation restores live global geometry and owner',()=>{
 try{
  const live=session(7);
  adoptPresentationWorldSession(live);
  const walls=structuredClone(WALLS),cover=structuredClone(COVER);
  const originalSite=activeSite(),savedTime=live.seconds;
  const background=withDetachedPresentationWorld(()=>session(19));
  assert.equal(activeSite(),originalSite);
  assert.deepEqual(WALLS,walls);assert.deepEqual(COVER,cover);
  assert.notStrictEqual(sessionWorldGeometry(live),sessionWorldGeometry(background));
  live.coverState[0].x+=13;live.objectRevision++;
  publishSessionCoverToActiveSite(live);
  assert.equal(COVER[0].x,live.coverState[0].x);
  assert.equal(background.seconds,0);
  assert.equal(live.seconds,savedTime);
  assert.notDeepEqual(sessionWorldGeometry(live).walls,
   sessionWorldGeometry(background).walls);
 }finally{setPresentationWorldSession(null);activateSite(null);}
});
test('Stage 5: nested temporary editor construction and exceptions restore exact live scope',()=>{
 try{
  const live=session(7);adoptPresentationWorldSession(live);
  COVER[0].x+=10;const savedCover=structuredClone(COVER);
  const savedWalls=structuredClone(WALLS),prior=activeSite();
  assert.throws(()=>withDetachedPresentationWorld(()=>{
   const first=session(19);
   withDetachedPresentationWorld(()=>{
    session(23);
    withTemporarySiteGeometry(first.site,()=>{
     COVER.push({x:120,y:300,w:8,h:8});
    });
   });
   throw Error('editor preview aborted');
  }),/editor preview aborted/);
  assert.equal(activeSite(),prior);
  assert.deepEqual(WALLS,savedWalls);
  assert.deepEqual(COVER,savedCover);
  live.coverState[0].x+=21;live.objectRevision++;
  publishSessionCoverToActiveSite(live);
  assert.equal(COVER[0].x,live.coverState[0].x);
 }finally{setPresentationWorldSession(null);activateSite(null);}
});
test('Stage 5: replay factory does not commit ownership until explicit view entry',()=>{
 try{
  const live=session(7);adoptPresentationWorldSession(live);
  const recorder=new MissionRecorder();recorder.capture(live,true);
  const controller=new BreachMissionController({
   preferences:()=>({
    legacyStudy:false,civilianPreview:false,requestedCondition:2,
    selectedIntelMode:'full-view',requestedSiteScale:'small',
    selectedLightingMode:'day',mode:'quick'
   }),
   randomSeed:()=>19,refreshQuickRoster:()=>{},
   applyRoster:()=>{},applyCampaign:()=>{},buildDossier:()=>undefined
  });
  const prior=activeSite(),walls=structuredClone(WALLS);
  const cover=structuredClone(COVER);
  const replay=controller.createReplaySession(recorder,live);
  assert.notEqual(replay,live);
  assert.equal(activeSite(),prior,'constructing replay cannot switch scene');
  assert.deepEqual(WALLS,walls);assert.deepEqual(COVER,cover);
  live.coverState[0].x+=15;live.objectRevision++;
  publishSessionCoverToActiveSite(live);
  assert.equal(COVER[0].x,live.coverState[0].x,
   'live retains publication ownership while replay is building');
  adoptPresentationWorldSession(replay);
  assert.equal(activeSite(),replay.site);
  live.coverState[0].x+=30;live.objectRevision++;
  const activeReplay=structuredClone(COVER);
  publishSessionCoverToActiveSite(live);
  assert.deepEqual(COVER,activeReplay,
    'background live mutation must not overwrite active replay');
  assert.strictEqual(controller.resumeLiveSession(live),live);
  assert.equal(activeSite(),live.site);
  assert.equal(COVER[0].x,live.coverState[0].x);
 }finally{setPresentationWorldSession(null);activateSite(null);}
});
test('Stage 5: world renderer uses own wall and cover even after another site activates',()=>{
 try{
  const a=session(7),world=sessionWorldGeometry(a);
  const d=drawing(),render=d.draw(()=>a);
  const expectedWalls=structuredClone(world.walls);
  activateSite(session(19).site);
  render.architecture();render.furniture();
  assert.deepEqual(d.walls,expectedWalls);
  const rects=world.cover.map(o=>[o.x-o.w/2,o.y-o.h/2,o.w,o.h]);
  for(const rect of rects)assert.ok(d.furniture.some(row=>
   rect.every((n,i)=>row[i]===n)),JSON.stringify(rect));
 }finally{setPresentationWorldSession(null);activateSite(null);}
});
test('Stage 5: same seed and actor IDs never share 2D light caches',()=>{
 try{
  const a=session(7),b=session(7);
  const d=drawing();let displayed=a;
  const render=d.draw(()=>displayed);
  for(const s of [a,b]){
   const actor=team(s)[0];
   actor.weaponLightOn=true;
   actor.weaponConfiguration={...actor.weaponConfiguration,
    slots:{...actor.weaponConfiguration.slots,light:'light-compact'}};
  }
  render.renderWeaponLights2D();
  const first=render.inspectLightCache(a);
  assert.ok(first&&first.lights===1);
  assert.equal(render.inspectLightCache(b),null);
  displayed=b;render.renderWeaponLights2D();
  assert.ok(render.inspectLightCache(b)?.lights===1);
  assert.deepEqual(render.inspectLightCache(a),first);
  // A door can change within the SAME visual tick and same objectRevision.
  const prior=render.inspectLightCache(a);
  displayed=a;
  a.doors[0].openFraction=.61;
  render.renderWeaponLights2D();
  assert.notEqual(render.inspectLightCache(a).doorSignature,prior.doorSignature);
  // Replay can seek back to an old revision; explicit invalidation must
  // force the light broadphase to refresh despite identical tick/door IDs.
  const previousRevision=render.inspectLightCache(a).revision;
  sessionWorldGeometry(a).invalidate();render.renderWeaponLights2D();
  assert.ok(render.inspectLightCache(a).revision>previousRevision);
  assert.deepEqual(render.inspectLightCache(b),render.inspectLightCache(b));
 }finally{setPresentationWorldSession(null);activateSite(null);}
});
test('Stage 5: pointer bounds belong to the command Session, not active site',()=>{
 try{
  const state={phase:'planning',operators:[],doors:[],coverState:[],
   objectRevision:0,site:{walls:[],cover:[],
    bounds:{minX:800,minY:800,maxX:1200,maxY:1200}},
   intel:{walls:new Set(),cover:new Set(),doors:new Set()}};
  const actions=[],port={
   state,replaying:false,replayBodycam:{active:false},
   replayTraceMode:'off',viewMode:'plan2d',
   recorder:{ballistics:{between:()=>[]}},
   replayPlayback:{time:0},replayAnalysisUi:{selectReplayShot(){}},
   hudController:{facing:{looking:false}},
   selected:'rook',selectedNode:null,selectedActiveWatch:false,
   doorFocusId:null,doorMenuDismissedId:null,
   flashMode:false,pushMode:false,firePlacement:null,evacMode:null,
   trace:null,tacticalFeedback:{emit(){}},
   pointerAimWorld:e=>({x:e.clientX,y:e.clientY}),
   pointerWorld:e=>({x:e.clientX,y:e.clientY}),
   worldToScreen:p=>p,followReplayOperator(){},
   historicalShotVisible:()=>false,selectUnit(){},
   useSelectedGround:p=>actions.push('place:'+p.x),
   showUiHelp:()=>actions.push('outside'),
   adoptPointerOwner(){},uid:()=>undefined,rejectAt(){},teach(){},
   insertAtRouteLine:()=>false,selectedPlanNode:()=>undefined
  };
  const p={mode:'undecided',moved:false,pick:null,dragCommitted:false};
  activateSite(null); // legacy map ends at X=640
  dispatchTacticalPointerRelease(port,
   {clientX:920,clientY:920,pointerType:'touch'},p,false,1);
  assert.deepEqual(actions,['place:920']);
  actions.length=0;
  dispatchTacticalPointerRelease(port,
   {clientX:200,clientY:200,pointerType:'touch'},p,false,1);
  assert.deepEqual(actions,[],'point in global map but outside local is ignored');
 }finally{setPresentationWorldSession(null);activateSite(null);}
});
test('Stage 5: camera and layout code no longer consume mutable global bounds',()=>{
 const scene=camera();
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const pointer=readFileSync(new URL(
  '../src/breach-pointer-command-controller.ts',import.meta.url),'utf8');
 assert.doesNotMatch(scene,/activeWorldBounds\(/);
 assert.match(scene,/private get displayedBounds\(\)/);
 assert.match(scene,/this\.displayedSite=site/);
 assert.match(scene,/const bounds=this\.displayedBounds/);
 assert.doesNotMatch(main,/activeWorldBounds\(/);
 assert.match(main,/const bounds=state\.site\?\.bounds/);
 assert.doesNotMatch(pointer,/activeWorldBounds\(/);
 assert.match(pointer,/sessionWorldGeometry\(port\.state\)\.bounds/);
});
test('Stage 5: combat and replay remain deterministic under a detached audit',()=>{
 const run=interleave=>{
  const s=session(7);toggling(s);
  for(let i=0;i<30;i++){
   stepSession(s,1/60);
   if(interleave&&i===10)withDetachedPresentationWorld(()=>{
    const other=session(19);toggling(other);
    for(let j=0;j<10;j++)stepSession(other,1/60);
   });
  }
  return {seconds:s.seconds,rng:s.rng,phase:s.phase,
   actors:s.operators.map(a=>[a.id,a.p,a.health,a.shots,a.magazine]),
   shots:s.shots,events:s.battleEvents};
 };
 try{assert.deepEqual(run(true),run(false));}
 finally{setPresentationWorldSession(null);activateSite(null);}
});
