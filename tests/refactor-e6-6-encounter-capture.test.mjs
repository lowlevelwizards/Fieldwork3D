/** E6.6: structured and portable browser encounter evidence contract.
 * No wall-time/FPS thresholds; browser GPU execution is not measured. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PerformanceTimeline,emptyPerformanceSceneCosts,
 PERFORMANCE_BUCKET_COUNT} from '../src/breach-performance-timeline.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

function detailed(at,phase='live'){
 const scene={...emptyPerformanceSceneCosts(),actors:4.1,fog:.8,
  gpuSubmit:.6};
 return {at,raf:47,js:21,sync:9,sim:5,recording:1,
  previousJs:42,previousSim:7,previousPhase:phase,
  previousWork:{
   beforeUi:3,ui:1,sceneSync:15,render:8,postRender:2,
   diagnostics:1,scene,
   actor:{rigMs:0,rigBuilds:0,poseMs:2.2,poseCount:4,
    posePrepMs:.9,appearanceFingerprintMs:.38,
    appearanceInvalidations:0,allyContextMs:.12,allyPeerVisits:16}
  },
  ui:2,overlay:1,scene,draws:650,steps:1,
  phase,camera:'iso',hotSim:'',fogPaints:1,shadowRefreshes:0,
  scene3dSubmitted:true,fogComposeMs:.64,
  fogTextureUpdateRequests:6,fogTextureSubmittedUploads:4,
  fogTextureSubmittedBytesEstimate:6553600,
  sight:{queries:5,hits:3,misses:2,bypasses:0,invalidations:1}};
}
test('E6.6 structured JSON retains modes, bounded buckets and correct frame ownership',()=>{
 const history=new PerformanceTimeline();
 history.addCoarseFrame(1000,24,9,'idle','iso');
 history.add(detailed(1260));
 const capture=JSON.parse(history.encounterJSON('planning','iso',
  'FIELDWORK MATCH · seed 23'));
 assert.equal(capture.schema,'fieldwork-e6.6-encounter-v1');
 assert.equal(capture.bucketMs,250);
 assert.equal(capture.retentionMs,60000);
 assert.equal(capture.modeCounts.idle.frames,1);
 assert.equal(capture.modeCounts.live.frames,1);
 assert.equal(capture.buckets.length,2);
 assert.equal(capture.buckets[0].peak.captureLevel,'basic');
 assert.equal(capture.buckets[0].peak.previousWork,undefined);
 const frame=capture.buckets[1].peak;
 assert.equal(frame.raf,47);
 assert.equal(frame.previousJs,42);
 assert.equal(frame.previousWork.actor.posePrepMs,.9);
 assert.equal(frame.previousWork.actor.appearanceFingerprintMs,.38);
 assert.equal(frame.previousWork.actor.allyPeerVisits,16);
 assert.equal(frame.fogTextureUpdateRequests,6);
 assert.equal(frame.fogTextureSubmittedUploads,4);
 assert.equal(frame.fogTextureSubmittedBytesEstimate,6553600);
 assert.equal(frame.fogComposeMs,.64);
 assert.equal(frame.scene3dSubmitted,true);
 assert.match(frame.callbackGapInterpretation,/prior-frame JS/);
 assert.match(capture.limitations,/not equivalent to iPhone GPU FPS/);
});
test('E6.6 CSV is append-only, previous vs current costs are aligned; missing stays missing',()=>{
 const history=new PerformanceTimeline();
 history.addCoarseFrame(1000,20,8,'idle','iso');
 history.add(detailed(1260));
 const [columns,...rows]=history.bucketCSV().split('\n').map(s=>s.split(','));
 assert.equal(columns[0],'t_sec');
 assert.ok(columns.indexOf('prior_pose_ms')<columns.indexOf('prior_pose_prep_ms'));
 const value=(row,key)=>row[columns.indexOf(key)];
 assert.equal(rows.length,2);
 for(const key of ['prior_pose_prep_ms','prior_appearance_key_ms',
  'fog_texture_dirty_cumulative','fog_upload_submitted_cumulative',
  'fog_rgba_bytes_submitted_est_cumulative','scene_3d_submitted'])
  assert.equal(value(rows[0],key),'','unmeasured basic '+key);
 assert.equal(value(rows[1],'prior_pose_prep_ms'),'0.9');
 assert.equal(value(rows[1],'prior_appearance_key_ms'),'0.38');
 assert.equal(value(rows[1],'prior_ally_visits'),'16');
 assert.equal(value(rows[1],'fog_compose_current_ms'),'0.64');
 assert.equal(value(rows[1],'fog_upload_submitted_cumulative'),'4');
 assert.equal(value(rows[1],'scene_3d_submitted'),'1');
 assert.equal(columns.length,rows[1].length);
});
test('E6.6 JSON stays bounded to last 60 seconds and preserves phase counts',()=>{
 const history=new PerformanceTimeline();
 for(let i=0;i<320;i++)
  history.add(detailed(i*250,'live'));
 const capture=JSON.parse(history.encounterJSON('planning','iso'));
 assert.ok(capture.buckets.length<=PERFORMANCE_BUCKET_COUNT);
 assert.equal(capture.buckets.length,240);
 assert.equal(capture.modeCounts.live.frames,240);
 assert.equal(capture.buckets[0].tSec,20);
 assert.equal(capture.buckets.at(-1).tSec,79.75);
});
test('E6.6 is explicitly activated by PERF, exports local file, without a second timer',()=>{
 const runtime=read('src/breach-runtime-loop.ts'),
  panel=read('src/ui/breach-perf-timeline-panel.ts'),
  timeline=read('src/breach-performance-timeline.ts'),
  scene=read('src/breach-3d.ts');
 assert.match(runtime,/if\(frameMeter&&perfOverlay\)\{/);
 assert.match(runtime,/scene3dSubmitted:updated3d/);
 assert.match(runtime,/fogTextureSubmittedUploads:stats\?\.fogTextureSubmittedUploads/);
 assert.match(runtime,/previousWork:previousPerfWork/);
 assert.match(panel,/this\.jsonButton=button\('JSON'\)/);
 assert.match(panel,/this\.jsonButton\.addEventListener\('click'/);
 assert.match(panel,/this\.timeline\?\.encounterJSON/);
 assert.match(panel,/type:'application\/json;charset=utf-8'/);
 assert.match(timeline,/schema:'fieldwork-e6\.6-encounter-v1'/);
 assert.match(scene,/withinContactPrewarmBudget\(true,coldPrewarmBuilt\)/);
 assert.match(scene,/paintFogVisibility\(this\.fogContext,s\)/);
});
