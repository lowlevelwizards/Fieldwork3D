import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PerformanceTimeline,previousFrameHotspot,emptyPerformanceSceneCosts}
 from '../src/breach-performance-timeline.ts';

test('P2.9 named preceding UI/audio subphases retain immutable CPU measurements',()=>{
 const h=new PerformanceTimeline();
 const detail={camera:3,audio:64,hud:21,rings:2};
 h.add({at:1000,raf:120,js:23,sync:8,sim:0,recording:0,
  previousJs:110,previousSim:0,previousPhase:'live',
  previousWork:{beforeUi:3,ui:90,uiDetail:detail,sceneSync:10,render:2,
   postRender:2,diagnostics:1,scene:emptyPerformanceSceneCosts()},
  ui:0,overlay:0,scene:emptyPerformanceSceneCosts(),draws:0,steps:0,
  phase:'live',camera:'iso',hotSim:'',fogPaints:0,shadowRefreshes:0,
  sight:{queries:0,hits:0,misses:0,bypasses:0,invalidations:0}});
 detail.audio=0;
 const peak=h.buckets()[0].peak;
 assert.equal(peak.previousWork.uiDetail.audio,64);
 assert.match(previousFrameHotspot(peak),/UI audio 64ms \/ total 90ms/);
 assert.match(h.compactReport('planning','iso'),/UI audio 64ms \/ total 90ms/);
 const csv=h.bucketCSV().split('\n');
 const columns=csv[0].split(',');
 const fields=csv[1].split(',');
 assert.equal(fields.length,columns.length,'CSV subphase fields align');
 assert.equal(fields[columns.indexOf('prior_ui_audio_ms')],'64');
 assert.equal(fields[columns.indexOf('prior_ui_hud_ms')],'21');
});
test('P2.9 mobile runtime reads timings only under opt-in perf overlay',()=>{
 const src=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
 assert.match(src,/const uiCameraEnd=perfOverlay\?performance\.now\(\):0/);
 assert.match(src,/const uiAudioEnd=perfOverlay\?performance\.now\(\):0/);
 assert.match(src,/const uiHudEnd=perfOverlay\?performance\.now\(\):0/);
 assert.match(src,/const runtimeUiDetail=perfOverlay\?\{/);
 assert.match(src,/uiDetail:runtimeUiDetail/);
});
