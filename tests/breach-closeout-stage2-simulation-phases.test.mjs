/** Closeout Stage 2: phase authority and event/replay parity.
 * These checks supplement (never replace/rebaseline) the frozen Stage 1
 * door, medical, combat and civilian SHA-256 outcome fingerprints.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activateSite} from '../src/breach-core.ts';
import {newSession,team,toggling,stepSession,planWaitAt} from '../src/breach-game.ts';
import {advanceSimulationTick,SIMULATION_PHASE_SEQUENCE}
 from '../src/breach-simulation-phases.ts';
import {MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';
import {stage1DoorSite,runStage1Scenario,stage1Snapshot}
 from './fixtures/breach-stage1-contract-runner.mjs';

const round=fn=>{try{return fn();}finally{activateSite(null);}};
function phasePort(log){
 return {
  medicalDoors(s,h){log.push('doors');s.operators[0].p.x+=2;},
  flashbangs(){log.push('flashbangs');},
  visualAwareness(){log.push('visual-awareness');},
  beliefAging(){log.push('belief-aging');},
  actorActions(s,h,markActor){
   log.push('actor-loop');
   assert.equal(s.operators[0].p.x,s.site.spawn[0].x+2,
    'door-yield must occur before actor decisions');
   if(markActor)markActor('rook');
   s.operators[0].p.x+=3;
  },
  motion(s,h,origins){
   log.push('civilian-motion');
   assert.equal(origins.get('rook').x,s.site.spawn[0].x+2,
    'origins must reflect doors but not actor-phase movement');
   assert.equal(s.operators[0].p.x,s.site.spawn[0].x+5);
  },
  contacts(){log.push('contacts');},
  reports(){log.push('reports');},
  observe(){log.push('observe-intel');},
  fire(){log.push('fire');},
  mission(){log.push('mission');},
 };
}
test('Stage 2: phase director owns the exact historical order and one clock increment',()=>round(()=>{
 const s=newSession(0,undefined,'full-view','small','hold',stage1DoorSite());
 s.phase='running';
 const log=[],marks=[];
 advanceSimulationTick(s,1/60,phasePort(log),
   (phase,ms)=>{marks.push(phase);assert.ok(ms>=0&&Number.isFinite(ms));});
 assert.equal(s.seconds,1/60);
 assert.deepEqual(log,[
  'doors','flashbangs','visual-awareness','belief-aging','actor-loop',
  'civilian-motion','contacts','reports','observe-intel','fire','mission'
 ]);
 assert.deepEqual(marks,[
  'doors','aging-effects','visual-awareness','belief-aging',
  'operator-rook','actor-loop','civilian-motion','contacts','reports',
  'observe-intel','fire','mission'
 ]);
 assert.deepEqual(SIMULATION_PHASE_SEQUENCE,
  [...marks.filter(x=>!x.startsWith('operator-')),'execution-events']);
 assert.ok(s.executionEvents.every(e=>e.t===s.seconds),
  'post-mission events are timestamped at the same authoritative tick');
}));
test('Stage 2: optional phase probes cannot modify simulation state or consume RNG',()=>round(()=>{
 const scenario=()=>newSession(0,undefined,'full-view','small','hold',stage1DoorSite());
 const a=scenario(),b=scenario(),probe=[];
 toggling(a);toggling(b);
 for(let i=0;i<25;i++){
  stepSession(a,1/60);
  stepSession(b,1/60,(name,ms)=>probe.push(name));
 }
 assert.ok(probe.includes('fire')&&probe.includes('mission'));
 assert.equal(a.rng,b.rng);
 assert.deepEqual(stage1Snapshot(a),stage1Snapshot(b));
 assert.deepEqual(a.executionEvents,b.executionEvents);
 assert.deepEqual(a.battleEvents,b.battleEvents);
}));
test('Stage 2: stopped phases neither age effects nor create execution events',()=>round(()=>{
 const s=newSession(0,undefined,'full-view','small','hold',stage1DoorSite());
 const before=stage1Snapshot(s),nextId=s.nextExecutionId;
 stepSession(s,1/60);
 assert.equal(s.seconds,0);
 assert.equal(s.nextExecutionId,nextId);
 assert.deepEqual(stage1Snapshot(s),before);
 toggling(s);
 stepSession(s,0.2);
 assert.equal(s.seconds,1/30,'clamp stays the pre-refactor 30 Hz upper bound');
 toggling(s);
 const paused=stage1Snapshot(s),events=s.executionEvents.length;
 stepSession(s,1/60);
 assert.deepEqual(stage1Snapshot(s),paused);
 assert.equal(s.executionEvents.length,events);
}));
test('Stage 2: event ordering and recorder parity remain independent of capture',()=>round(()=>{
 const configure=s=>{
  const rook=team(s)[0];
  assert.ok(planWaitAt(s,rook.id,.5,'here'));
 };
 const base={site:stage1DoorSite(),mission:'hold',ticks:120,
  sampleEvery:20,configure};
 const bare=runStage1Scenario(base);
 const filmed=runStage1Scenario({...base,record:true});
 assert.equal(filmed.fingerprint,bare.fingerprint);
 assert.deepEqual(filmed.events,bare.events);
 const recorder=filmed.recorder;
 assert.ok(recorder.frames.length>5);
 assert.ok(recorder.completeness.complete);
 for(let i=1;i<recorder.executionEvents.length;i++){
  const previous=recorder.executionEvents[i-1],current=recorder.executionEvents[i];
  assert.ok(current.id>previous.id,'events must not reorder on recorder drain');
  assert.ok(current.t>=previous.t,'event timestamps must not move backward');
 }
 const playback=newSession(0,undefined,'full-view','small','hold',stage1DoorSite());
 const before=filmed.fingerprint;
 applyReplayFrame(playback,recorder.frames.at(-1));
 applyReplayFrame(playback,recorder.frames[0]);
 assert.equal(playback.seconds,recorder.frames[0].t);
 assert.equal(filmed.fingerprint,before,'replay seek must not rewrite recorded evidence');
}));
test('Stage 2: only stepSession enters the phase director, with no renderer/replay coupling',()=>{
 const source=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const phases=readFileSync(new URL('../src/breach-simulation-phases.ts',import.meta.url),'utf8');
 const runtime=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
 assert.match(source,/advanceSimulationTick\(s,clamp\(dt,0,1\/30\),simulationPhasePort,probe\)/);
 assert.equal((source.match(/advanceSimulationTick\(/g)??[]).length,1);
 assert.match(runtime,/stepSession\(state,1\/60/);
 assert.doesNotMatch(phases,/requestAnimationFrame|\.capture\(|applyReplayFrame|Math\.random/);
 assert.doesNotMatch(phases,/from '\.\/breach-3d/);
 assert.match(phases,/recordSimulationExecutionOutcomes\(s\)/);
});
