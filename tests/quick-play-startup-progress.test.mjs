import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('src/breach-style.css');
const main=read('src/breach-main.ts');
const loader=read('src/breach-quickplay-controller.ts');
const campaign=read('src/breach-campaign-flow.ts');
const worker=read('src/quick-play-worker.ts');
const messages=read('src/quick-play-generation.ts');
const site=read('src/breach-site.ts');

test('main menu does not generate a throwaway procedural map',()=>{
 assert.match(main,/campaignMode==='menu'\?undefined:initialSiteSeed/);
 assert.match(campaign,/quickPlay:\(\)=>\{void config.launchQuickPlay\(\);\}/);
 assert.match(loader,/config\.startSession\(seed,generated\.site\)/);
 assert.match(main,/startSession:\(seed,site\)=>reset\(state\.variant,seed,undefined,site,undefined,true\)/);
 // Extra encounter options are compatible as long as the generated site
 // and selected risk are still passed to the authoritative session.
 assert.match(main,/prebuiltSite,\{risk:encounterRisk(?:,|\})/);
});

test('Quick Play preserves the Map Lab progress language and real checkpoints',()=>{
 for(const id of ['quickPlayProgress','quickPlayPercent','quickPlayBar',
  'quickPlayStage','quickPlayDetail','quickPlayClock','quickPlayCancel'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/max="100" value="0"/);
 assert.match(css,/\.quick-play-progress-card/);
 assert.match(css,/#quickPlayBar\{[^}]*accent-color:#afcdab/s);
 assert.match(loader,/quickPlayCheckpoint\(76,'Preparing tactical session'/);
 assert.match(loader,/quickPlayCheckpoint\(86,'Building 3D environment'/);
 assert.match(loader,/quickPlayCheckpoint\(95,'Preparing tactical controls'/);
 assert.match(loader,/quickPlayCheckpoint\(97,'Rendering first 3D frame'/);
 assert.match(loader,/quickPlayCheckpoint\(99,'Revealing tactical scene'/);
 assert.match(loader,/quickPlayCheckpoint\(100,'TACTICAL SANDBOX READY'/);
 assert.match(loader,/Math\.max\(quickPlayPercent,Math\.min\(100/);
});

test('heavy worldgen stays in a dedicated worker and final map is reused',()=>{
 assert.match(loader,/new Worker\(new URL\('\.\/quick-play-worker\.ts',import\.meta\.url\)/);
 assert.match(worker,/generateSite\(req\.seed>>>0,req\.scale,\(phase,attempt\)=>/);
 for(const phase of ["layout","furnishing","scoring"])
  assert.match(site,new RegExp("onProgress\\?\\.\\('"+phase+"'"));
 assert.match(messages,/kind:'progress'/);
 assert.match(messages,/kind:'done'/);
 assert.match(worker,/generationMs:Math\.round\(performance\.now\(\)-started\)/);
 assert.match(loader,/stage\?\.applySite\(config\.getSession\(\)\.site\?\?null\)/);
 assert.match(main,/if\(!deferScene\)stage\?\.applySite/);
});

test('worker cancellation, errors and startup timings are surfaced',()=>{
 assert.match(loader,/quickPlayWorker\?\.terminate\(\)/);
 assert.match(loader,/quickPlayReject\?\.\(new Error\('Quick Play loading cancelled'\)\)/);
 assert.match(loader,/worker\.onerror=/);
 assert.match(loader,/quickPlayPanel\.dataset\.state='error'/);
 assert.match(loader,/console\.info\('\[Quick Play startup\]'/);
 assert.match(loader,/generationMs:generated\.generationMs,sessionMs,sceneMs,/);
 assert.match(loader,/operatorMs,operatorStageMs,hudMs,firstFrameMs,totalMs/);
 assert.match(loader,/requestAnimationFrame\(\(\)=>setTimeout\(resolve,0\)\)/);
});

test('first-frame handoff stages operator geometry and renders before READY',()=>{
 const scene=read('src/breach-3d.ts');
 assert.match(scene,/prepareOperatorModel\(a:TeamActor\):boolean/);
 assert.match(scene,/if\(this\.actors\.has\(a\.id\)\)return false/);
 assert.match(loader,/stage\?\.prepareOperatorModel\(initialTeam\[i\]\)/);
 assert.match(loader,/const firstFrameStart=performance\.now\(\)/);
 assert.match(main,/stage\.update\(state,selected,0,doorFocusId/);
 assert.match(loader,/config\.renderFirstFrame\(\)/);
 assert.match(loader,/const firstFrameMs=Math\.round\(performance\.now\(\)-firstFrameStart\)/);
 assert.ok(loader.indexOf("quickPlayCheckpoint(97,'Rendering first 3D frame'") <
   loader.indexOf('const firstFrameStart=performance.now()'));
 assert.ok(loader.indexOf('const firstFrameMs=Math.round(') <
   loader.indexOf("quickPlayCheckpoint(100,'TACTICAL SANDBOX READY'"));
 assert.ok(loader.indexOf("quickPlayCheckpoint(100,'TACTICAL SANDBOX READY'") <
   loader.indexOf('quickPlayBusy=false;\n    finishQuickPlayClock();'));
});

test('READY overlay does not hold the user for an arbitrary delay',()=>{
 assert.doesNotMatch(loader,/quickPlayPanel\.hidden=true;\},1400\)/);
 assert.match(loader,/requestAnimationFrame\(\(\)=>requestAnimationFrame\(\(\)=>\{/);
 assert.match(loader,/id===quickPlayRun&&!quickPlayBusy&&/);
 assert.match(loader,/quickPlayPanel\.dataset\.state==='ready'/);
 assert.ok(loader.indexOf('quickPlayBusy=false;\n    finishQuickPlayClock();') <
   loader.indexOf('requestAnimationFrame(()=>requestAnimationFrame(()=>{'));
});
