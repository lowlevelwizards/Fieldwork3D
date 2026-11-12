import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PerformanceTimeline,PERFORMANCE_BUCKET_COUNT,emptyPerformanceSceneCosts}
 from '../src/breach-performance-timeline.ts';

const detail=(at,raf)=>({
 at,raf,js:21,sync:9,sim:5,recording:1,ui:3,overlay:1,
 scene:emptyPerformanceSceneCosts(),draws:990,steps:1,
 phase:'live',camera:'iso',hotSim:'',fogPaints:0,shadowRefreshes:0,
 sight:{queries:0,hits:0,misses:0,bypasses:0,invalidations:0}
});
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('live profiler retains 60 seconds of RAF and JS history before first open',()=>{
 const timeline=new PerformanceTimeline();
 let previous;
 for(let i=0;i<180;i++){
  const now=i*1000/60;
  const raf=i===83?187:16.67;
  const js=i===82?171:9;
  timeline.addCoarseFrame(now,raf,js,'live','iso',previous,'live');
  previous=js;
 }
 assert.equal(timeline.phaseSummary().live.frames,180);
 assert.equal(timeline.phaseSummary().live.severe,1);
 assert.equal(timeline.maxRaf(),187);
 assert.equal(timeline.recentSpikes(1)[0].peak.captureLevel,'basic');
 assert.equal(timeline.recentSpikes(1)[0].peak.previousJs,171);
 assert.match(timeline.compactReport('planning','iso'),/RAF 187/);
 assert.match(timeline.report('planning','iso'),/BASIC RAF\/JS/);
 assert.ok(timeline.bucketCSV().includes('capture_level'));
 assert.ok(timeline.bucketCSV().includes(',basic,'));
});

test('opening detailed profiling does not reset prior rolling history or spike counts',()=>{
 const timeline=new PerformanceTimeline();
 timeline.addCoarseFrame(1000,145,16,'live','iso',14,'live');
 timeline.addCoarseFrame(1200,18,12,'live','iso',16,'live');
 timeline.add(detail(1260,82));
 assert.equal(timeline.phaseSummary().live.frames,3);
 assert.equal(timeline.phaseSummary().live.severe,2);
 assert.equal(timeline.maxRaf(),145);
 assert.equal(timeline.recentSpikes(2)[0].peak.captureLevel,'basic');
 const csv=timeline.bucketCSV().split('\n');
 const index=csv[0].split(',').indexOf('capture_level');
 assert.ok(index>=0);
 assert.deepEqual(csv.slice(1).map(row=>row.split(',')[index]),['basic','detailed']);
});

test('always-on lightweight history stays bounded and resets by session',()=>{
 const timeline=new PerformanceTimeline();
 for(let i=0;i<400;i++)
  timeline.addCoarseFrame(i*250,17,10,'live','iso');
 assert.ok(timeline.count<=PERFORMANCE_BUCKET_COUNT);
 assert.equal(timeline.phaseSummary().live.frames,PERFORMANCE_BUCKET_COUNT);
 timeline.reset();
 assert.equal(timeline.count,0);
 assert.equal(timeline.maxRaf(),0);
});

test('live HUD control opens diagnostics without reloading or changing fixed-step simulation',()=>{
 const main=read('src/breach-main.ts');
 const runtime=read('src/breach-runtime-loop.ts');
 const panel=read('src/ui/breach-perf-timeline-panel.ts');
 assert.match(main,/liveProfilerButton\.id='liveMatchPerf'/);
 assert.match(main,/ui\.tacticalHud\.append\(liveProfilerButton\)/);
 assert.match(main,/runtimeLoop\.toggleProfiler\(\)/);
 assert.match(main,/onProfilerChange:syncLiveProfilerControl/);
 assert.match(runtime,/function toggleProfiler\(\)/);
 assert.match(runtime,/perfTimeline\.addCoarseFrame\(now,frameGap/);
 assert.match(runtime,/if\(!perfOverlay\)\{/);
 assert.match(runtime,/if\(frameMeter&&perfOverlay\)\{/);
 assert.match(runtime,/setSightDiagnosticsEnabled\(true\)/);
 assert.match(panel,/this\.hideButton\.addEventListener\('click',\(\)=>this\.onHide\(\)\)/);
 assert.match(panel,/this\.copyButton\.addEventListener/);
 assert.match(panel,/this\.exportButton\.addEventListener/);
 assert.match(runtime,/stepSession\(state,1\/60/);
 assert.doesNotMatch(runtime,/location\.reload|window\.location\.href\s*=/);
});
