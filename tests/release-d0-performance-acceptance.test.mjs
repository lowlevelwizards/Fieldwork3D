import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixedStepBudget} from '../src/breach-fixed-clock.ts';
import {renderSnapshot} from '../src/breach-frame-interpolation.ts';
import {captureMotionFrameOrigins,buildMotionFrameProposals}
 from '../src/breach-motion-frame-input.ts';
import {resolveMovementFrame} from '../src/breach-movement-authority.ts';
const code=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('D0: overloaded RAF samples one pre-final tick, never discards 60 Hz motor work',()=>{
 const src=code('src/breach-runtime-loop.ts');
 assert.match(src,/for\(let i=0;i<budget\.steps;i\+\+\)\{/);
 assert.match(src,/if\(i===budget\.steps-1\)\{/);
 assert.match(src,/previousRenderActors=renderSnapshot\(state\.operators\)/);
 assert.match(src,/stepSession\(state,1\/60/);
 assert.match(src,/recorder\.capture\(state,config\.isMissionTerminal\(state\)\)/);
 for(const dt of [1/60,1/30,1/20]){
  const steps=fixedStepBudget(0,dt).steps;
  let snapshots=0,simulations=0,records=0;
  const actor={id:'rook',p:{x:0,y:0},heading:0,weaponYaw:0};
  let previous=null;
  for(let i=0;i<steps;i++){
   if(i===steps-1){previous=renderSnapshot([actor]);snapshots++;}
   actor.p.x++;simulations++;records++;
  }
  assert.equal(snapshots,1);
  assert.equal(simulations,steps);assert.equal(records,steps);
  assert.equal(previous.rook.x,steps-1);
 }
});

test('D0: ordered actor proposals and immutable origins remain identical',()=>{
 const actors=[
  {id:'a',side:'blue',p:{x:10,y:0},health:2},
  {id:'b',side:'red',p:{x:25,y:0},health:2}
 ];
 const origins=captureMotionFrameOrigins(actors,[]);
 actors[0].p={x:19,y:0};
 const proposals=buildMotionFrameProposals(actors,[],origins);
 assert.deepEqual(proposals.map(p=>p.id),['a','b']);
 assert.deepEqual(proposals[0].from,{x:10,y:0});
 const decisions=resolveMovementFrame(proposals,()=>true);
 assert.deepEqual(decisions.map(d=>d.id),['a','b']);
 assert.ok(decisions.every(d=>d.point));
});

test('D0: movement authority uses phase-local geometry and actor IDs, not repeated finds',()=>{
 const src=code('src/breach-simulation-motion-phase.ts');
 assert.match(src,/const world=sessionWorldGeometry\(s\);/);
 assert.equal((src.match(/sessionWorldGeometry\(s\)/g)??[]).length,1);
 assert.match(src,/const actorById=new Map<string,TeamActor>\(\)/);
 assert.match(src,/const civilianById=new Map<string,\(typeof s\.civilians\)\[number\]>\(\)/);
 assert.match(src,/if\(transportLinks\.length\)/);
 const authority=src.slice(src.indexOf('const arbitrationStart=cpuMark()'));
 assert.doesNotMatch(authority,/s\.operators\.find\(/);
 assert.doesNotMatch(authority,/s\.civilians\.find\(/);
 assert.doesNotMatch(authority,/s\.civilians\.filter\(/);
 assert.match(authority,/if\(body&&body\.carriedById===a\.id\)/);
});

test('D0: tactical progress HUD uses the existing operator list without a frame filter',()=>{
 const runtime=code('src/breach-runtime-loop.ts');
 const rings=code('src/ui/physical-action-rings.ts');
 assert.match(runtime,/physicalActionRings\.update\(state\.operators,state\.doors,/);
 assert.match(rings,/if\(actor\.side==='red'\)continue/);
 assert.doesNotMatch(runtime,/physicalActionRings\.update\(team\(state\)/);
});

test('D0: profiler remains opt-in; ordinary sessions retain coarse RAF only',()=>{
 const src=code('src/breach-runtime-loop.ts');
 const timeline=code('src/breach-performance-timeline.ts');
 const motion=code('src/breach-replay.ts');
 assert.match(src,/let perfPanel:BreachPerfTimelinePanel\|null=config\.boot\.perfOverlay/);
 assert.match(src,/const simPhaseCosts=perfOverlay\?new Map<string,number>\(\):null/);
 assert.match(src,/perfTimeline\.addCoarseFrame\(/);
 assert.match(src,/setSightDiagnosticsEnabled\(!!perfOverlay\)/);
 assert.match(timeline,/PERFORMANCE_BUCKET_COUNT/);
 assert.match(motion,/this\.motion\.record\(s\.seconds,s\.operators,s\.doors\)/);
 assert.match(motion,/if\(!force&&last&&s\.seconds-last\.t<\.049\)return/);
});

test('D0: workload measurements include all key phases and never gate on CI timing',()=>{
 const bench=code('scripts/audit-release-d0-workloads.mjs');
 const compare=code('scripts/compare-release-d0-workloads.mjs');
 for(const phase of ['planning-to-live-quiet','four-operator-movement',
  'active-contact-firefight','populated-civilian-response',
  'expanded-world-and-replay'])assert.ok(bench.includes(phase));
 assert.match(bench,/\.\.\.missions\.map/);
 assert.match(bench,/sha256/);
 assert.match(bench,/process\.argv\.includes\('--sustained'\)/);
 assert.match(bench,/ticks:7200/);
 assert.match(bench,/heapSamplesEvery60Ticks/);
 assert.match(compare,/before\.fingerprint!==after\.fingerprint/);
 assert.match(compare,/CPU\/heap comparisons vary/);
 assert.doesNotMatch(compare,/p95Ratio[^\n]*process\.exitCode/);
});
