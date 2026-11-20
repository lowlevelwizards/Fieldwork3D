/** E6.16: fine-grained live 3D phase profiling in real Quick Play briefing-dismissal -> execution, on/off E6.13.
 * Only Chromium ANGLE/SwiftShader CPU wall time. No hardware GPU claims.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4407,base='http://127.0.0.1:'+port;
const dir='artifacts/refactor-e6-16/live-scene';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<150;i++){
  try{if((await fetch(base+'/breach.html')).ok){ready=true;break;}}
  catch{}await wait(150);
 }
 if(!ready)throw Error('E6.16 Vite unavailable');
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 const evidence={schema:'fieldwork-e6.15-live-scene-phases-v1',
  note:'90 actual live callbacks after dismissing planning briefing, two seeds and briefing variants, fresh Chromium process, software WebGL. E6.16 fine-grained scene phases are CPU wall time, not GPU hardware timing; the shadow phase prepares shadow flags, actual shadow raster work may appear inside gpuSubmit.',
  runs:[]};
 for(const seed of [23,97])for(const briefingIdle of ['0','1']){
  browser=await chromium.launch({headless:true,
   ...(process.env.FIELDWORK_CI_CHROME&&chrome?{executablePath:chrome}:{}),
   args:['--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:1,hasTouch:true,isMobile:true,acceptDownloads:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/breach.html?coldBench=1&briefingIdle='+briefingIdle+
    '&gpuWarmup=1&coldPrewarm=1',{waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:'QUICK PLAY',exact:true})
    .click({timeout:60000});
   const setup=page.getByRole('dialog',{name:'Quick Play mission setup'});
   await setup.waitFor({state:'visible',timeout:60000});
   // The seed is a deliberate advanced choice in the compact setup UI.
   const advanced=setup.locator('details.fw-quick-config-advanced');
   if(!(await advanced.evaluate(element=>element.open)))
    await advanced.locator(':scope > summary').click();
   await setup.getByRole('spinbutton',{name:'Seed, blank for random'})
    .fill(String(seed));
   await setup.getByRole('button',{name:'GENERATE MISSION'}).click();
   await page.waitForFunction(seed=>window.__fieldworkE611?.run?.seed===seed&&
    window.__fieldworkE611?.postReadyRuntime?.frames===90,
    seed,{timeout:180000});
   const before=await page.evaluate(()=>window.__fieldworkE611.postReadyRuntime);
   if(before.byMode.idle.frames!==90||before.byMode.live.frames!==0)
    throw Error('Not measuring planning phase prior to execution');
   if(briefingIdle==='1'&&before.byMode.idle.submitted3D>4)
    throw Error('E6.13 briefing hold was lost');
   if(briefingIdle==='0'&&before.byMode.idle.submitted3D<85)
    throw Error('E6.13 A/B baseline was lost');
   await page.locator('#briefingClose').click({timeout:30000});
   await page.waitForFunction(()=>
    document.getElementById('briefingPanel')?.hidden===true);
   await page.locator('#play').click({timeout:30000});
   await page.waitForFunction(()=>
    document.getElementById('phase')?.textContent==='EXECUTING',
    null,{timeout:30000});
   await page.waitForFunction(seed=>
    window.__fieldworkE611?.run?.seed===seed&&
    window.__fieldworkE611?.liveExecutionRuntime?.frames===90,
    seed,{timeout:180000});
   const button=page.getByRole('button',
    {name:'Export cold start benchmark JSON'});
   const [download]=await Promise.all([
    page.waitForEvent('download',{timeout:30000}),button.click()]);
   if(!download.suggestedFilename().endsWith('.json'))
    throw Error('Missing E6.14 local JSON export');
   const local=JSON.parse(readFileSync(await download.path(),'utf8'));
   const live=local.liveExecutionRuntime;
   if(!live||live.interrupted||live.frames!==90||
    live.byMode.live.frames!==90||live.byMode.idle.frames!==0||
    live.byMode.live.submitted3D<85||
    live.callbacksWithSimulation<10||live.p95SimMs===null||
    live.p95SceneMs===null||live.p95CallbackMs===null)
    throw Error('Actual live tactical callback evidence incomplete: '+
     JSON.stringify(live?.byMode));
   const scene=live.sceneAttribution;
   const keys=['environment','camera','disclosure','actors',
    'effects','fog','shadows','postCamera','gpuSubmit'];
   if(!scene||scene.frames<85||
      keys.some(key=>!Number.isFinite(scene.phaseP95Ms?.[key])||
       !Number.isFinite(scene.phaseWorstMs?.[key]))||
      scene.phaseWorstMs.gpuSubmit<=0||
      scene.phaseWorstMs.actors<=0||
      scene.actorPoseP95Ms===null||
      scene.gpuDrawCallsP95===null||
      !Number.isFinite(scene.fogComposeP95Ms))
      throw Error('Missing actual scene CPU phases in live evidence: '+
       JSON.stringify(scene));
   const submit=scene.renderSubmission;
   if(!submit||submit.frames<85||
      !Number.isFinite(submit.shadowRenderP95Ms)||
      !Number.isFinite(submit.nonShadowP95Ms)||
      !Number.isFinite(submit.shadowDrawCallsP95)||
      submit.framesWithReliableDrawCounts<85||
      submit.shadowMapRenderInvocations<85)
     throw Error('Missing real shadow-map render evidence: '+
      JSON.stringify(submit));
   if(live.topGaps.some(spike=>spike.precedingSubmitted3D&&
      spike.precedingDominantScenePhase===undefined))
      throw Error('Worst live gaps missing preceding 3D phase attribution');
   if(errors.length)throw Error('JS runtime errors: '+errors.join(' | '));
   const path=dir+'/seed-'+seed+'-briefing-'+briefingIdle+'.json';
   writeFileSync(path,JSON.stringify(local,null,2)+'\n');
   evidence.runs.push({
    seed,briefingIdle,
    precedingPlanning3DSubmissions:before.byMode.idle.submitted3D,
    liveFrames:live.byMode.live.frames,live3DSubmissions:live.byMode.live.submitted3D,
    callbacksWithSimulation:live.callbacksWithSimulation,
    callbackP95Ms:live.p95CallbackMs,simP95Ms:live.p95SimMs,
    sceneP95Ms:live.p95SceneMs,uiP95Ms:live.p95UiMs,
    canvasP95Ms:live.p95CanvasMs,rafP95Ms:live.p95GapMs,
    maxRafGapMs:live.worstGapMs,topSpikes:live.topGaps.slice(0,3),
    phaseP95Ms:scene.phaseP95Ms,phaseWorstMs:scene.phaseWorstMs,
    poseP95Ms:scene.actorPoseP95Ms,
    posePrepP95Ms:scene.actorPosePrepP95Ms,
    appearanceP95Ms:scene.actorAppearanceP95Ms,
    allyContextP95Ms:scene.actorAllyContextP95Ms,
    fogComposeP95Ms:scene.fogComposeP95Ms,
    shadowRefreshes:scene.shadowRefreshesDuringSample,
    fogUploads:scene.fogUploadsDuringSample,
    drawCallsP95:scene.gpuDrawCallsP95,
    renderSubmission:submit,
    errors:errors.length,artifact:path
   });
  }finally{await page.close();await browser.close();browser=undefined;}
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('E6_16_LIVE_SCENE_BROWSER',JSON.stringify(evidence));
}finally{await browser?.close();server.kill('SIGTERM');}
