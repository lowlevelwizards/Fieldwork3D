/** Roadmap 2 / Stage 1: independent contracts atop the REAL 60 Hz engine.
 * These fail if repeatable-but-incorrect outcomes replace authored behavior.
 * Golden SHA fingerprints are locked after initial verified baseline capture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 runStage1Scenario,stage1DoorSite,stage1ContactSite,
 stage1CompletionSite,stage1Snapshot
} from './fixtures/breach-stage1-contract-runner.mjs';
import {withTemporarySiteGeometry,activateSite,activeSite,WALLS,COVER}
 from '../src/breach-core.ts';
import {
 newSession,team,enemies,planMove,planWaitAt,undoPlan,redoPlan,
 beginReload,toggling,stepSession
} from '../src/breach-game.ts';
import {registerWound} from '../src/breach-medical-wounds.ts';
import {generateSite} from '../src/breach-site.ts';
import {captureMissionStart,siteForMissionRestart,restoreMissionStartingTeam}
 from '../src/breach-mission-restart.ts';
import {MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';

// The authoring serializer materializes optional keys with undefined after
// undo/redo. Compare the actual serialized command contract, not object shape.
const authoredPlan=plan=>JSON.parse(JSON.stringify(plan));
const GOLDENS=Object.freeze({
 door:'f0300241e8134d1a65c5e71fd22c827447e96128a92bb82c2bd64958c02f895c',
 medical:'a7b43bd0f015e426050ab1a001ce8bf67daf511a936efa9d3e5ea779de27f0b4',
 combat:'7d186411687555c809c6aac8caeedd0814008ac92b291cc799a550247ecda349',
 civilian:'32b97cc3908c2c2655d5729996b6513d57efa339f1ed63b8b82aadf204592136'
});
function authorDoorEntry(s){
 const [rook,moss]=team(s);
 assert.equal(planWaitAt(s,rook.id,1,'here'),true);
 assert.equal(planMove(s,rook.id,{x:296,y:373}),true);
 assert.equal(planMove(s,moss.id,{x:320,y:380}),true);
}
test('authored transactions undo/redo without changing the running clock or losing orders',()=>{
 withTemporarySiteGeometry(null,()=>{
  const s=newSession(0,undefined,'full-view','small','hold',stage1DoorSite());
  const a=team(s)[0];
  const initial=authoredPlan(a.plan);
  assert.ok(planWaitAt(s,a.id,.5,'here'));
  const waiting=structuredClone(a.plan);
  assert.ok(planMove(s,a.id,{x:296,y:373}));
  const planned=structuredClone(a.plan);
  assert.ok(planned.some(n=>n.kind==='move'));
  assert.ok(undoPlan(s,a.id));assert.deepEqual(authoredPlan(a.plan),waiting);
  assert.ok(undoPlan(s,a.id));assert.deepEqual(authoredPlan(a.plan),initial);
  assert.ok(redoPlan(s,a.id));assert.deepEqual(authoredPlan(a.plan),waiting);
  assert.ok(redoPlan(s,a.id));assert.deepEqual(authoredPlan(a.plan),planned);
  assert.equal(s.seconds,0);
  toggling(s);
  for(let i=0;i<90;i++)stepSession(s,1/60);
  assert.equal(Number(s.seconds.toFixed(5)),1.5);
  assert.ok(a.completedOrders>=1,'WAIT must really execute before moving');
  assert.ok(a.p.y>=stage1DoorSite().spawn[0].y,
   'authoring must not reverse the initial walking direction');
 });
});
test('door entry with WAIT and competing teammates has repeatable physical outcomes',()=>{
 const base={site:stage1DoorSite(),mission:'hold',ticks:420,
  sampleEvery:20,configure:authorDoorEntry};
 const first=runStage1Scenario(base);
 const repeated=runStage1Scenario({...base,site:stage1DoorSite()});
 assert.equal(first.fingerprint,repeated.fingerprint);
 assert.deepEqual(first.checkpoints,repeated.checkpoints);
 assert.equal(first.first.doors[0][1],false,'entry starts fully closed');
 assert.ok(first.checkpoints.some(frame=>frame.doors[0][1]===true),
  'authoritative door motor must open on the entry plan');
 assert.ok(first.checkpoints.some(frame=>frame.actors.some(a=>a.completedOrders>0)),
  'a genuine ordered WAIT or movement action must complete');
 assert.ok(first.checkpoints.at(-1).seconds>6.9);
 for(const id of ['rook','moss'])assert.ok(first.last.actors.find(a=>a.id===id).position[1]>300,
   id+' must actually cross the threshold, not merely open the door');
 assert.equal(first.fingerprint,GOLDENS.door,'door outcome baseline drifted');});

test('head-on passage traffic resolves without a door-leaf open/close ping-pong',()=>{
 const site=stage1DoorSite();
 // Two friendlies approach the SAME threshold from opposite sides.
 site.spawn[1]={x:310,y:347};
 const configure=s=>{
  const [rook,moss]=team(s);
  assert.ok(planMove(s,rook.id,{x:310,y:369}));
  assert.ok(planMove(s,moss.id,{x:310,y:190}));
 };
 const opts={site,mission:'hold',ticks:600,sampleEvery:10,configure};
 const first=runStage1Scenario(opts);
 const again=runStage1Scenario({...opts,site:structuredClone(site)});
 assert.equal(first.fingerprint,again.fingerprint);
 const rook=first.last.actors.find(a=>a.id==='rook');
 const moss=first.last.actors.find(a=>a.id==='moss');
 assert.ok(rook.position[1]>275,'rook must enter from the north');
 assert.ok(moss.position[1]<250,'moss must exit toward the north');
 // A single change of door swing direction may be legitimate; sustained
 // repeated direction changes indicate the historic motor ping-pong.
 const fractions=first.checkpoints.map(f=>f.doors[0][2]);
 let reversals=0,prior=0;
 for(let i=1;i<fractions.length;i++){
  const delta=fractions[i]-fractions[i-1];
  const sign=Math.abs(delta)<.02?0:Math.sign(delta);
  if(sign&&prior&&sign!==prior)reversals++;
  if(sign)prior=sign;
 }
 assert.ok(reversals<12,'sustained opposing door pressure oscillation: '+reversals);
});

test('reload and wound deterioration are actually advanced by 60 Hz simulation',()=>{
 const make=()=>runStage1Scenario({
  site:{...stage1CompletionSite(),training:true},
  mission:'hold',ticks:360,sampleEvery:30,
  configure(s){
   const [rook,moss]=team(s);
   rook.magazine=0;
   assert.equal(beginReload(s,rook),true);
   registerWound(moss.medical,55,'torso',2,0);
   moss.medical.bloodLoss=.999;
  }
 });
 const first=make(),repeat=make();
 assert.equal(first.fingerprint,repeat.fingerprint);
 const reload=first.last.actors.find(a=>a.id==='rook');
 const injured=first.last.actors.find(a=>a.id==='moss');
 assert.ok(reload.magazine>0,'real timed reload must insert rounds');
 assert.equal(reload.reload,0,'reload must actually finish');
 assert.ok(injured.injuryStage>0,'real medical tick must progress bleeding');
 assert.ok(injured.health<first.first.actors.find(a=>a.id==='moss').health);
 assert.ok(first.events.some(e=>e.kind==='reload'));
 assert.ok(first.events.some(e=>e.kind==='wound'&&e.actorId==='moss'),
   'a named injured actor must own the wound event');
 assert.equal(first.fingerprint,GOLDENS.medical,'wound/reload outcome baseline drifted');
});
test('live opposing actors produce actual projectiles and update AI evidence',()=>{
 const setup=s=>{
  const friendly=team(s),hostiles=enemies(s);
  assert.equal(friendly.length,4);assert.equal(hostiles.length,2);
  for(const a of friendly){
   const b=hostiles[0];
   a.heading=Math.atan2(b.p.y-a.p.y,b.p.x-a.p.x);
   a.weaponYaw=a.heading;a.firePolicy='engage';a.aim=.7;
  }
  for(const e of hostiles){
   const b=friendly[0];
   e.heading=Math.atan2(b.p.y-e.p.y,b.p.x-e.p.x);
   e.weaponYaw=e.heading;
  }
 };
 const base={site:stage1ContactSite(),mission:'hold',ticks:420,
  sampleEvery:30,configure:setup};
 const first=runStage1Scenario(base);
 const again=runStage1Scenario({...base,site:stage1ContactSite()});
 assert.equal(first.fingerprint,again.fingerprint);
 assert.ok(first.shotsFired>0,'unobstructed armed opponents must fire');
 assert.equal(first.last.shotsFired,first.shotsFired);
 assert.ok(first.events.some(e=>e.kind==='shot'&&e.actorId),
  'shots must retain shooter attribution');
 assert.ok(first.events.some(e=>e.kind==='down'&&e.actorId),
  'contact must resolve actual incapacitating hits');
 assert.ok(first.last.actors.some(a=>a.side==='red'&&a.health<
    first.first.actors.find(start=>start.id===a.id).health),
  'hostiles must have genuine health outcomes');
 assert.ok(first.last.actors.some(a=>a.side==='red'&&
    (a.alert!=='idle'||a.shots>0||a.noiseId>0)),
   'enemy must react through real perception/decision execution');
 assert.equal(first.fingerprint,GOLDENS.combat,'combat/AI outcome baseline drifted');});
test('enemy hearing records authentic evidence rather than inventing target sight',()=>{
 const results=runStage1Scenario({
  site:stage1ContactSite(),mission:'hold',ticks:120,
  configure(s){
   const guard=enemies(s)[0];
   // The sound is known to the enemy, not a fabricated player sight report.
   s.noise.push({id:101,p:{x:guard.p.x+4,y:guard.p.y+2},
    radius:250,time:s.seconds,kind:'door'});
  }
 });
 const guard=results.last.actors.find(a=>a.side==='red');
 assert.ok(guard.noiseId>=101,'AI must actually process sound observation');
 assert.equal(results.last.shotsFired,results.shotsFired);
});
test('civilian rescue targets survive simulation and are recorded as real entities',()=>{
 const site=generateSite(27,'small',undefined,
  {seed:27,mission:'rescue',premise:'routine'});
 const run=()=>runStage1Scenario({
  site,mission:'rescue',intel:'floor-plan',enableCivilians:true,
  ticks:120,sampleEvery:20,record:true
 });
 const first=run(),repeat=run();
 assert.equal(first.fingerprint,repeat.fingerprint);
 const target=first.first.civilians.filter(c=>c.rescueTarget);
 assert.equal(target.length,1,'a rescue operation has exactly one real target');
 assert.ok(first.last.civilians.some(c=>c.id===target[0].id));
 assert.ok(first.recorder.frames.length>=2);
 assert.ok(first.recorder.frames[0].civilians.some(c=>c.id===target[0].id));
 assert.ok(first.recorder.frames.at(-1).civilians.some(c=>c.id===target[0].id));
 assert.equal(first.recorder.completeness.complete,true);
 assert.equal(first.fingerprint,GOLDENS.civilian,'civilian/replay baseline drifted');
});
test('objective and all-operators-down reach independently expected terminal phases',()=>{
 const won=runStage1Scenario({site:stage1CompletionSite(),mission:'clear',
  ticks:30,sampleEvery:1});
 assert.equal(won.phase,'won');assert.equal(won.mission,'done');
 assert.ok(won.last.result.includes('OPERATION COMPLETE'));
 const lost=runStage1Scenario({site:stage1CompletionSite(),mission:'clear',
  ticks:30,sampleEvery:1,
  configure(s){for(const a of team(s))a.health=0;}
 });
 assert.equal(lost.phase,'lost');
 assert.ok(lost.last.result.includes('ALL OPERATORS LOST'));
 assert.notEqual(won.fingerprint,lost.fingerprint);
});
test('live recorder cannot change authoritative outcomes; playback does not step the game',()=>{
 const opts={site:stage1DoorSite(),mission:'hold',ticks:180,
  sampleEvery:30,configure:authorDoorEntry};
 const bare=runStage1Scenario(opts);
 const recorded=runStage1Scenario({...opts,record:true});
 assert.equal(recorded.fingerprint,bare.fingerprint,
  'observation must not change game decisions or physics');
 const film=recorded.recorder;
 assert.ok(film.frames.length>20);
 assert.ok(film.motion.stepEventCount>0);
 assert.equal(film.completeness.complete,true);
 withTemporarySiteGeometry(null,()=>{
  const playback=newSession(0,undefined,'full-view','small',
   'hold',stage1DoorSite());
  const first=film.frames[0],last=film.frames.at(-1);
  applyReplayFrame(playback,last);
  const ending=stage1Snapshot(playback);
  applyReplayFrame(playback,first);
  assert.ok(playback.seconds<ending.seconds,'scrub must move backward');
  assert.equal(playback.seconds,first.t);
  assert.deepEqual(playback.civilians.map(a=>a.id),
   first.civilians.map(a=>a.id));
 });
});
test('restart re-creates original architecture and squad after a mutated mission',()=>{
 withTemporarySiteGeometry(null,()=>{
  const site=stage1ContactSite();
  const s=newSession(0,undefined,'floor-plan','small','hold',site);
  const original=team(s).map(a=>({
   id:a.id,p:structuredClone(a.p),health:a.health,
   weapon:a.weapon,magazine:a.magazine
  }));
  const start=captureMissionStart(s,'small');
  assert.ok(planWaitAt(s,team(s)[0].id,1,'here'));
  toggling(s);
  for(let i=0;i<40;i++)stepSession(s,1/60);
  s.site.cover.push({x:400,y:300,w:10,h:10});
  s.operators[0].health=0;
  const cleanSite=siteForMissionRestart(start);
  const repeated=newSession(start.variant,start.seed,start.intelMode,
   start.scale,start.missionType,cleanSite);
  restoreMissionStartingTeam(repeated,start);
  assert.deepEqual(repeated.site,start.site);
  assert.deepEqual(team(repeated).map(a=>({
   id:a.id,p:a.p,health:a.health,weapon:a.weapon,magazine:a.magazine
  })),original);
  assert.equal(repeated.phase,'planning');
  assert.equal(repeated.seconds,0);
  assert.deepEqual(repeated.shots,[]);
  assert.ok(team(repeated).every(a=>a.plan.length===0));
  repeated.site.cover.push({x:220,y:225,w:8,h:8});
  assert.deepEqual(siteForMissionRestart(start),start.site,
   'restart manifest must be detached from later play');
 });
});
test('scenario runner preserves displaced live geometry even on script failure',()=>{
 const live=stage1ContactSite();
 live.cover=[{x:150,y:320,w:20,h:25,fixture:'desk'}];
 activateSite(live);
 try{
  COVER.splice(0,1,{...COVER[0],x:164});
  const walls=[...WALLS],cover=[...COVER],active=activeSite();
  runStage1Scenario({site:stage1DoorSite(),ticks:100,
   configure:authorDoorEntry});
  assert.equal(activeSite(),active);assert.deepEqual(WALLS,walls);
  assert.deepEqual(COVER,cover);
  assert.throws(()=>runStage1Scenario({site:stage1DoorSite(),
   ticks:35,beforeTick(s,tick){if(tick===17)throw Error('tick failure');}
  }),/tick failure/);
  assert.equal(activeSite(),active);assert.deepEqual(WALLS,walls);
  assert.deepEqual(COVER,cover);
 }finally{activateSite(null);}
});
test('multiple independently generated seeds remain repeatable and non-interchangeable',()=>{
 const seen=new Set();
 for(const seed of [7,19,31]){
  const a=runStage1Scenario({seed,mission:'hold',ticks:90,
   sampleEvery:30});
  const b=runStage1Scenario({seed,mission:'hold',ticks:90,
   sampleEvery:30});
  assert.equal(a.fingerprint,b.fingerprint,'seed '+seed);
  assert.ok(!seen.has(a.fingerprint),'distinct seed collapsed to same state');
  seen.add(a.fingerprint);
  assert.equal(a.first.actors.filter(x=>x.side==='blue').length,4);
  assert.equal(a.ticks,90);
 }
});
