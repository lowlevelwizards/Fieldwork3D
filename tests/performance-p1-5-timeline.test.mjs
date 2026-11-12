import test from 'node:test';
import assert from 'node:assert/strict';
import {PerformanceTimeline,performanceHotspot,previousFrameHotspot,
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
test('P1.8 preceding CPU slices explain stalls without blaming current work',()=>{
 const h=new PerformanceTimeline();
 const scene={...emptyPerformanceSceneCosts(),gpuSubmit:825};
 const previousWork={beforeUi:5,ui:2,sceneSync:850,render:10,
  postRender:4,diagnostics:2,scene};
 h.add(sample(1000,928,{
  phase:'idle',previousPhase:'idle',previousJs:903,
  previousSim:0,previousWork,js:17,sim:0
 }));
 scene.gpuSubmit=0;
 const peak=h.buckets()[0].peak;
 assert.equal(peak.previousWork.scene.gpuSubmit,825,
  'prior scene snapshot remains immutable after later frames');
 assert.match(previousFrameHotspot(peak),/3D gpuSubmit 825ms \/ sync 850ms/);
 assert.match(performanceHotspot(peak),/prior-frame JS/);
 assert.match(h.compactReport('planning','iso'),/3D gpuSubmit 825ms/);
 assert.match(h.report('planning','iso'),/prior hotspot 3D gpuSubmit 825ms/);
 assert.match(h.bucketCSV(),/prior_scene_submit_cpu_ms/);
});
test('P1.8 blame transition gap on preceding phase, not new phase',()=>{
 const h=new PerformanceTimeline();
 h.add(sample(1000,100,{
  phase:'live',previousPhase:'idle',previousJs:90
 }));
 const modes=h.phaseSummary();
 assert.equal(modes.idle.severe,1);
 assert.equal(modes.live.severe,0);
 h.add(sample(1250,90,{phase:'live',previousPhase:'live',previousJs:85}));
 assert.equal(h.phaseSummary().live.severe,1);
});
test('P1.9 preceding rig, pose and simulation CPU costs survive frame reuse',()=>{
 const h=new PerformanceTimeline();
 const actor={rigMs:520,rigBuilds:1,poseMs:35,poseCount:8};
 const scene={...emptyPerformanceSceneCosts(),actors:600};
 const work={beforeUi:2,ui:2,sceneSync:610,render:3,
  postRender:2,diagnostics:1,scene,actor};
 h.add(sample(500,911,{phase:'idle',previousPhase:'idle',
  previousJs:878,previousSim:0,previousWork:work}));
 actor.rigMs=0;scene.actors=0;
 const peak=h.buckets()[0].peak;
 assert.equal(peak.previousWork.actor.rigMs,520);
 assert.match(previousFrameHotspot(peak),/3D actors 600ms.*rig 520ms\/1.*pose 35ms\/8/);
 assert.match(h.compactReport('planning','iso'),/rig 520ms\/1/);
 assert.match(h.bucketCSV(),/prior_rig_build_ms,prior_rig_build_count,prior_pose_ms/);
 h.add(sample(750,575,{phase:'live',previousPhase:'live',
  previousJs:570,previousSim:554,previousHotSim:'civilian-motion 531.2ms',
  previousWork:{...work,scene:emptyPerformanceSceneCosts(),
   actor:{rigMs:0,rigBuilds:0,poseMs:6,poseCount:8}}}));
 assert.match(h.compactReport('planning','iso'),/SIM civilian-motion 531\.2ms/);
 assert.match(h.report('planning','iso'),/prior simulation phase civilian-motion 531\.2ms/);
});
test('P2.1 pose breakdown reports preceding measured source of a cold 3D hitch',()=>{
 const h=new PerformanceTimeline();
 const previousWork={beforeUi:1,ui:1,sceneSync:870,render:5,
  postRender:2,diagnostics:1,
  scene:{...emptyPerformanceSceneCosts(),actors:844},
  actor:{rigMs:157,rigBuilds:4,poseMs:664,poseCount:4,
   appearanceMs:350,weaponBuildMs:200,otherPoseMs:114}};
 h.add(sample(1000,1313,{previousJs:1282,previousPhase:'idle',
  phase:'idle',previousSim:0,previousWork}));
 assert.match(previousFrameHotspot(h.buckets()[0].peak),
  /3D actors 844ms \(rig 157ms\/4, pose 664ms\/4, app 350 \/ gun 200 \/ IK\+114\)/);
 const copy=h.compactReport('planning','iso');
 assert.match(copy,/app 350 \/ gun 200 \/ IK\+114/);
 assert.match(h.bucketCSV(),/prior_pose_appearance_ms,prior_pose_weapon_build_ms,prior_pose_other_ms/);
});
test('P2.4 first-use costume timings show kit and atlas without changing totals',()=>{
 const h=new PerformanceTimeline();
 const previousWork={beforeUi:0,ui:1,sceneSync:620,render:1,
  postRender:0,diagnostics:0,
  scene:{...emptyPerformanceSceneCosts(),actors:619},
  actor:{rigMs:118,rigBuilds:4,poseMs:486,poseCount:4,
   appearanceMs:456,weaponBuildMs:8,otherPoseMs:21,
   visualKitMs:401,receiverAtlasMs:38}};
 h.add(sample(1000,1011,{previousJs:978,previousPhase:'idle',
  phase:'idle',previousSim:0,previousWork}));
 const breakdown=previousFrameHotspot(h.buckets()[0].peak);
 assert.match(breakdown,/kit 401 \/ atlas 38/);
 assert.match(h.compactReport('planning','iso'),/kit 401 \/ atlas 38/);
 assert.match(h.bucketCSV(),/prior_visual_kit_ms,prior_receiver_atlas_ms/);
 assert.match(h.bucketCSV(),/,401,38/);
});
test('P1.5d CSV includes every quarter-second bucket and measured causes',()=>{
 const h=new PerformanceTimeline();
 h.add(sample(1200,20));h.add(sample(1450,61,{sync:31}));
 const csv=h.bucketCSV();
 assert.match(csv,/gpu_submit_cpu_ms/);
 assert.equal(csv.trim().split('\n').length,3);
 assert.match(csv,/61,25,31,31/);
});
