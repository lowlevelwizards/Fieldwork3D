import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('src/breach-style.css');
const main=read('src/breach-main.ts');
const worker=read('src/quick-play-worker.ts');
const messages=read('src/quick-play-generation.ts');
const site=read('src/breach-site.ts');

test('main menu does not generate a throwaway procedural map',()=>{
 assert.match(main,/campaignMode==='menu'\?undefined:initialSiteSeed/);
 assert.match(main,/quickPlay:\(\)=>\{void launchQuickPlay\(\);\}/);
 assert.match(main,/reset\(state\.variant,seed,undefined,generated\.site,undefined,true\)/);
 assert.match(main,/prebuiltSite,\{risk:encounterRisk\}/);
});

test('Quick Play preserves the Map Lab progress language and real checkpoints',()=>{
 for(const id of ['quickPlayProgress','quickPlayPercent','quickPlayBar',
  'quickPlayStage','quickPlayDetail','quickPlayClock','quickPlayCancel'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/max="100" value="0"/);
 assert.match(css,/\.quick-play-progress-card/);
 assert.match(css,/#quickPlayBar\{[^}]*accent-color:#afcdab/s);
 assert.match(main,/quickPlayCheckpoint\(76,'Preparing tactical session'/);
 assert.match(main,/quickPlayCheckpoint\(86,'Building 3D environment'/);
 assert.match(main,/quickPlayCheckpoint\(95,'Preparing tactical controls'/);
 assert.match(main,/quickPlayCheckpoint\(97,'Rendering first 3D frame'/);
 assert.match(main,/quickPlayCheckpoint\(99,'Revealing tactical scene'/);
 assert.match(main,/quickPlayCheckpoint\(100,'TACTICAL SANDBOX READY'/);
 assert.match(main,/Math\.max\(quickPlayPercent,Math\.min\(100/);
});

test('heavy worldgen stays in a dedicated worker and final map is reused',()=>{
 assert.match(main,/new Worker\(new URL\('\.\/quick-play-worker\.ts',import\.meta\.url\)/);
 assert.match(worker,/generateSite\(req\.seed>>>0,req\.scale,\(phase,attempt\)=>/);
 for(const phase of ["layout","furnishing","scoring"])
  assert.match(site,new RegExp("onProgress\\?\\.\\('"+phase+"'"));
 assert.match(messages,/kind:'progress'/);
 assert.match(messages,/kind:'done'/);
 assert.match(worker,/generationMs:Math\.round\(performance\.now\(\)-started\)/);
 assert.match(main,/stage\?\.applySite\(state\.site\?\?null\)/);
 assert.match(main,/if\(!deferScene\)stage\?\.applySite/);
});

test('worker cancellation, errors and startup timings are surfaced',()=>{
 assert.match(main,/quickPlayWorker\?\.terminate\(\)/);
 assert.match(main,/quickPlayReject\?\.\(new Error\('Quick Play loading cancelled'\)\)/);
 assert.match(main,/worker\.onerror=/);
 assert.match(main,/quickPlayPanel\.dataset\.state='error'/);
 assert.match(main,/console\.info\('\[Quick Play startup\]'/);
 assert.match(main,/generationMs:generated\.generationMs,sessionMs,sceneMs,/);
 assert.match(main,/operatorMs,operatorStageMs,hudMs,firstFrameMs,totalMs/);
 assert.match(main,/requestAnimationFrame\(\(\)=>setTimeout\(resolve,0\)\)/);
});

test('first-frame handoff stages operator geometry and renders before READY',()=>{
 const scene=read('src/breach-3d.ts');
 assert.match(scene,/prepareOperatorModel\(a:TeamActor\):boolean/);
 assert.match(scene,/if\(this\.actors\.has\(a\.id\)\)return false/);
 assert.match(main,/stage\?\.prepareOperatorModel\(initialTeam\[i\]\)/);
 assert.match(main,/const firstFrameStart=performance\.now\(\)/);
 assert.match(main,/stage\.update\(state,selected,0,doorFocusId/);
 assert.match(main,/const firstFrameMs=Math\.round\(performance\.now\(\)-firstFrameStart\)/);
 assert.ok(main.indexOf("quickPlayCheckpoint(97,'Rendering first 3D frame'") <
   main.indexOf('const firstFrameStart=performance.now()'));
 assert.ok(main.indexOf('const firstFrameMs=Math.round(') <
   main.indexOf("quickPlayCheckpoint(100,'TACTICAL SANDBOX READY'"));
 assert.ok(main.indexOf("quickPlayCheckpoint(100,'TACTICAL SANDBOX READY'") <
   main.indexOf('quickPlayBusy=false;\n    finishQuickPlayClock();'));
});
