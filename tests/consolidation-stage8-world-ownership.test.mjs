import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,toggling,stepSession} from '../src/breach-game.ts';
import {initialWorldWalls,initialWorldCover,initialDoors,newTacticalState,
 WALLS,COVER,activeSite,activateSite,withTemporarySiteGeometry}
 from '../src/breach-core.ts';
import {sessionWorldGeometry,adoptPresentationWorldSession,
 setPresentationWorldSession,publishSessionCoverToActiveSite}
 from '../src/breach-world-context.ts';
import {BreachMissionController} from '../src/breach-mission-controller.ts';
import {MissionRecorder,snapshot,applyReplayFrame} from '../src/breach-replay.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const session=seed=>newSession(0,seed,'full-view','small');
const cleanup=()=>{setPresentationWorldSession(null);activateSite(null);};
const sig=s=>({
 phase:s.phase,mission:s.mission,time:s.seconds,rng:s.rng,
 type:s.missionType,objective:s.scenario.objective,
 team:s.operators.map(a=>({
  id:a.id,p:a.p,health:a.health,weapon:a.weapon,
  magazine:a.magazine,alert:a.alert,shots:a.shots,
  lastHitAt:a.lastHitAt,watch:a.watch
 })),
 civilians:s.civilians.map(a=>({id:a.id,p:a.p,health:a.health})),
 doors:s.doors.map(d=>({id:d.id,open:d.open,kind:d.kind,
  locked:d.locked,hinge:d.hinge})),
 cover:s.coverState.map(o=>({x:o.x,y:o.y,w:o.w,h:o.h,
  material:o.material,integrity:o.integrity})),
 intel:[...s.intel.walls],events:s.battleEvents.map(e=>[e.kind,e.t,e.actor])
});

test('A8: source ownership excludes global activation from session construction',()=>{
 const factory=source('src/breach-session-factory.ts');
 const world=source('src/breach-world-context.ts');
 const mission=source('src/breach-mission-controller.ts');
 assert.doesNotMatch(factory,/\bactivateSite\s*\(/);
 assert.doesNotMatch(factory,/\bsetPresentationWorldSession\s*\(/);
 assert.doesNotMatch(factory,/\bCOVER\.splice\s*\(/);
 assert.doesNotMatch(world,/\bactiveGeometryRevision\s*\(/);
 assert.match(world,/initialWorldWalls\(site\)/);
 assert.doesNotMatch(mission,/\bwithDetachedPresentationWorld\s*\(/);
 assert.doesNotMatch(mission,/\bactivateSite\s*\(/);
});

test('A8: background Session creation never steals active presentation or its cover',()=>{
 try{
  const live=session(7);
  adoptPresentationWorldSession(live);
  const priorSite=activeSite(),walls=structuredClone(WALLS),cover=structuredClone(COVER);
  const priorTime=live.seconds;
  const background=session(19);
  assert.strictEqual(activeSite(),priorSite);
  assert.deepEqual(WALLS,walls);assert.deepEqual(COVER,cover);
  assert.notStrictEqual(sessionWorldGeometry(live),sessionWorldGeometry(background));
  assert.notDeepEqual(sessionWorldGeometry(live).walls,sessionWorldGeometry(background).walls);
  background.coverState[0].x+=50;background.objectRevision++;
  publishSessionCoverToActiveSite(background);
  assert.deepEqual(COVER,cover,'background may not publish cover');
  live.coverState[0].x+=18;live.objectRevision++;
  publishSessionCoverToActiveSite(live);
  assert.equal(COVER[0].x,live.coverState[0].x);
  assert.equal(live.seconds,priorTime);
 }finally{cleanup();}
});

test('A8: explicit site defaults ignore a different globally active generated map',()=>{
 try{
  const generated=session(19);
  adoptPresentationWorldSession(generated);
  const beforeSite=activeSite(),beforeWalls=structuredClone(WALLS);
  const beforeCover=structuredClone(COVER);
  const training=newSession();
  const world=sessionWorldGeometry(training);
  assert.strictEqual(training.site,undefined);
  assert.deepEqual(world.walls,initialWorldWalls(null));
  assert.equal(training.coverState.length,initialWorldCover(null).length);
  assert.deepEqual(training.doors.map(d=>d.id),initialDoors(null).map(d=>d.id));
  assert.deepEqual(newTacticalState(null).doors,initialDoors(null));
  assert.equal(training.intel.walls.size,world.walls.length);
  assert.ok([...training.intel.walls].every(i=>i>=0&&i<world.walls.length),
    'first observation cannot import foreign wall indices');
  assert.strictEqual(activeSite(),beforeSite);
  assert.deepEqual(WALLS,beforeWalls);assert.deepEqual(COVER,beforeCover);
  assert.notDeepEqual(world.walls,sessionWorldGeometry(generated).walls);
 }finally{cleanup();}
});

test('A8: two identical generated sessions keep equivalent initial and tick states',()=>{
 try{
  const a=session(7);
  const b=session(19);
  const c=session(7);
  assert.deepEqual(sig(a),sig(c));
  assert.deepEqual(sessionWorldGeometry(a).walls,sessionWorldGeometry(c).walls);
  const beforeB=JSON.stringify(b.coverState);
  toggling(a);toggling(c);
  for(let i=0;i<75;i++){
    stepSession(a,1/60);
    if(i===25){
      activateSite(b.site); // malicious legacy editor switch
      b.coverState[0].x+=40;b.objectRevision++;
    }
    stepSession(c,1/60);
  }
  assert.deepEqual(sig(a),sig(c));
  assert.notEqual(JSON.stringify(b.coverState),beforeB);
 }finally{cleanup();}
});

test('A8: detached legacy tool exceptions remain scoped with no Session side effects',()=>{
 try{
  const live=session(7);adoptPresentationWorldSession(live);
  const site=activeSite(),walls=structuredClone(WALLS),cover=structuredClone(COVER);
  assert.throws(()=>withTemporarySiteGeometry(session(19).site,()=>{
    WALLS.push({a:{x:1,y:2},b:{x:3,y:4}});
    COVER.push({x:2,y:3,w:4,h:5});
    throw Error('abort preview');
  }),/abort preview/);
  assert.strictEqual(activeSite(),site);
  assert.deepEqual(WALLS,walls);assert.deepEqual(COVER,cover);
 }finally{cleanup();}
});

test('A8: replay and condition edits do not switch the live presentation implicitly',()=>{
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
  const original=activeSite(),walls=structuredClone(WALLS),cover=structuredClone(COVER);
  const replay=controller.createReplaySession(recorder,live);
  assert.strictEqual(activeSite(),original);
  assert.deepEqual(WALLS,walls);assert.deepEqual(COVER,cover);
  assert.equal(replay.site?.conditionLevel,2);
  const frame=snapshot(replay);
  replay.coverState[0].x+=11;replay.objectRevision++;
  applyReplayFrame(replay,frame);
  assert.deepEqual(COVER,cover,'a non-owner replay seek does not publish');
  adoptPresentationWorldSession(replay);
  assert.strictEqual(activeSite(),replay.site);
  assert.strictEqual(controller.resumeLiveSession(live),live);
  assert.strictEqual(activeSite(),live.site);
  assert.equal(COVER[0].x,live.coverState[0].x);
 }finally{cleanup();}
});
