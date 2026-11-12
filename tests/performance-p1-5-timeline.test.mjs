import test from 'node:test';
import assert from 'node:assert/strict';
import {PerformanceTimeline,performanceHotspot,
 PERFORMANCE_BUCKET_COUNT,emptyPerformanceSceneCosts}
 from '../src/breach-performance-timeline.ts';
const sample=(at,raf,patch={})=>({
 at,raf,js:Math.min(raf,25),sync:8,sim:3,recording:0,
 ui:1,overlay:0,scene:emptyPerformanceSceneCosts(),draws:900,
 steps:0,phase:'planning',camera:'iso',hotSim:'',
 fogPaints:0,shadowRefreshes:0,
 sight:{queries:1,hits:1,misses:0,bypasses:0,invalidations:0},...patch
});
test('P1.5c 250ms buckets retain a 1-frame spike after later quiet frames',()=>{
 const history=new PerformanceTimeline();
 history.add(sample(1000,16));
 history.add(sample(1008,166,{sync:70,scene:{...emptyPerformanceSceneCosts(),actors:58}}));
 history.add(sample(1200,14));
 assert.equal(history.count,1);
 assert.equal(history.maxRaf(),166);
 assert.equal(history.buckets()[0].frames,3);
 assert.equal(history.recentSpikes()[0].peak.scene.actors,58);
 assert.match(history.report('always','iso'),/RAF 166\.0ms/);
 assert.match(history.report('always','iso'),/unattributed frame gap/);
});
test('P1.5c bounded 60s history ages out old spikes and resets cleanly',()=>{
 const history=new PerformanceTimeline();
 history.add(sample(0,400));
 for(let at=250;at<=70000;at+=250)history.add(sample(at,18));
 assert.ok(history.count<=PERFORMANCE_BUCKET_COUNT);
 assert.equal(history.maxRaf(),18);
 assert.equal(history.recentSpikes().length,0);
 history.reset();
 assert.equal(history.count,0);
 assert.equal(history.report('planning','iso').includes('No RAF gaps'),true);
});
test('P1.5c archived scene slices are copied and browser stalls are not misattributed',()=>{
 const h=new PerformanceTimeline(),mutable={...emptyPerformanceSceneCosts(),actors:15};
 h.add(sample(1800,100,{js:12,scene:mutable}));
 mutable.actors=0;
 assert.equal(h.buckets()[0].peak.scene.actors,15);
 assert.match(performanceHotspot(h.buckets()[0].peak),/unattributed frame gap/);
 h.add(sample(500,20));
 assert.equal(h.count,1,'clock reset clears earlier history');
});

test('P1.6 compact report retains five worst peaks without 240-row CSV',()=>{
 const h=new PerformanceTimeline();
 for(let i=0;i<30;i++)h.add(sample(i*250,40+i,{js:10,sync:8}));
 const short=h.compactReport('planning','iso'),full=h.report('planning','iso');
 assert.match(short,/planning \/ iso/);
 assert.match(short,/spike buckets: 3 >=67ms, 27 33–66ms/);
 assert.match(short,/RAF 69 \| prevJS \?\/sim\? nowJS 10/);
 assert.match(short,/unattributed frame gap/);
 assert.doesNotMatch(short,/t_sec,raf_peak_ms/);
 assert.ok(short.length<1100,'short report should fit in a phone chat');
 assert.ok(full.length>short.length,'retain longer detailed report for TXT');
 assert.equal(short.split('\n').filter(x=>x.startsWith('-')).length,5);
});
test('P1.7 RAF gap attributes preceding callback CPU, not current JS',()=>{
 const h=new PerformanceTimeline();
 h.add(sample(1000,160,{phase:'live',previousJs:145,
  previousSim:81,previousPhase:'live',js:12,sim:2}));
 h.add(sample(1250,160,{phase:'live',previousJs:10,
  previousSim:1,previousPhase:'live',js:145,sim:80}));
 const previous=h.buckets()[0].peak,current=h.buckets()[1].peak;
 assert.match(performanceHotspot(previous),/prior-frame JS/);
 assert.match(performanceHotspot(current),/between-callback wait/);
 const compact=h.compactReport('planning','iso');
 assert.match(compact,/prevJS 145\/sim81 nowJS 12\/sim2/);
 assert.match(compact,/wait 15/);
 assert.match(h.report('planning','iso'),/PREVIOUS JS 145\.0ms/);
 assert.match(h.bucketCSV(),/previous_js_ms,previous_sim_ms,previous_phase,callback_wait_ms/);
});
test('P1.7 phase summary counts callbacks separately from bucket peaks',()=>{
 const h=new PerformanceTimeline();
 h.add(sample(1000,16,{phase:'idle'}));
 h.add(sample(1010,95,{phase:'live'}));
 h.add(sample(1020,42,{phase:'live'}));
 h.add(sample(1250,34,{phase:'idle'}));
 const modes=h.phaseSummary();
 assert.deepEqual({frames:modes.live.frames,slow:modes.live.slow,
  severe:modes.live.severe,worst:modes.live.worst},
  {frames:2,slow:2,severe:1,worst:95});
 assert.equal(modes.idle.frames,2);
 assert.equal(modes.idle.slow,1);
 assert.match(h.compactReport('planning','iso'),/LIVE 2f \/ >=33 2 \/ >=67 1/);
 assert.match(h.compactReport('planning','iso'),/IDLE 2f \/ >=33 1 \/ >=67 0/);
 h.reset();
 assert.equal(h.phaseSummary().live.frames,0);
});
test('P1.5d CSV includes every quarter-second bucket and measured causes',()=>{
 const h=new PerformanceTimeline();
 h.add(sample(1200,20));h.add(sample(1450,61,{sync:31}));
 const csv=h.bucketCSV();
 assert.match(csv,/gpu_submit_cpu_ms/);
 assert.equal(csv.trim().split('\n').length,3);
 assert.match(csv,/61,25,31,31/);
});
