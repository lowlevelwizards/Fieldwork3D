/** E6.25: fine-grained live 3D phase profiling in real Quick Play briefing-dismissal -> execution, on/off E6.13.
 * Only Chromium ANGLE/SwiftShader CPU wall time. No hardware GPU claims.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
const port=4423,base='http://127.0.0.1:'+port;
const dir='artifacts/refactor-e6-25/character-missions';
mkdirSync(dir,{recursive:true});
function compareImages(aPath,bPath){
 const a=PNG.sync.read(readFileSync(aPath));
 const b=PNG.sync.read(readFileSync(bPath));
 if(a.width!==b.width||a.height!==b.height)
  throw Error('Screenshot dimensions differ');
 let changed=0,any=0,totalError=0;
 const pixels=a.width*a.height;
 for(let k=0;k<pixels;k++){
  const offset=k*4;
  let delta=0;
  for(let c=0;c<3;c++){
   const value=Math.abs(a.data[offset+c]-b.data[offset+c]);
   delta=Math.max(delta,value);totalError+=value;
  }
  if(delta>16)changed++;
  if(delta>4)any++;
 }
 return {pixels,changed,changedPct:+(100*changed/pixels).toFixed(3),
  closeAgreementPct:+(100*(1-changed/pixels)).toFixed(3),
  anyDifferentPct:+(100*any/pixels).toFixed(3),
  averageChannelError:+(totalError/(pixels*3)).toFixed(4)};
}
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
 if(!ready)throw Error('E6.25 Vite unavailable');
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 const evidence={schema:'fieldwork-e6.25-character-model-live-parity-v1',
  note:'90 actual live callbacks from two fixed character-furniture-heavy buildings, seeds 97 retail and 23 house, with only E6.25 character caching toggled, earlier fixture caches enabled for both, fresh Chromium software WebGL. E6.25 fine-grained scene phases are CPU wall time, not GPU hardware timing; the shadow phase prepares shadow flags, actual shadow raster work may appear inside gpuSubmit.',
  runs:[]};
 const scenarios=[{seed:97,building:'retail'},{seed:23,building:'house'}];
 for(const {seed,building} of scenarios)for(const templateEnabled of ['0','1']){
  const briefingIdle='1';
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
    '&gpuWarmup=1&coldPrewarm=1&e620Bake=1&e621Bake=1&e622Template=0&e623Fixture=1&e624Service=1&e625Character='+templateEnabled,
     {waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:'QUICK PLAY',exact:true})
    .click({timeout:60000});
   const setup=page.getByRole('dialog',{name:'Quick Play mission setup'});
   await setup.waitFor({state:'visible',timeout:60000});
   await setup.getByRole('button',{name:'NONE',exact:true}).click();
   await setup.locator('input[type="checkbox"][value="'+building+'"]').check();
   await setup.getByRole('spinbutton',{name:'Seed, blank for random'})
    .fill(String(seed));
   await setup.getByRole('button',{name:'GENERATE MISSION'}).click();
   await page.waitForFunction(seed=>window.__fieldworkE611?.run?.seed===seed&&
    window.__fieldworkE611?.postReadyRuntime?.frames===90,
    seed,{timeout:180000});
   const before=await page.evaluate(()=>window.__fieldworkE611.postReadyRuntime);
   const siteBuild=await page.evaluate(()=>window.__fieldworkE623SiteBuild);
   if(!siteBuild||!Number.isFinite(siteBuild.elapsedMs)||
      !siteBuild.cache||!Number.isFinite(siteBuild.cache.builds))
    throw Error('Missing E6.25 actual site construction/cache metrics');
   if(before.byMode.idle.frames!==90||before.byMode.live.frames!==0)
    throw Error('Not measuring planning phase prior to execution');
   if(briefingIdle==='1'&&before.byMode.idle.submitted3D>4)
    throw Error('E6.13 briefing hold was lost');
   if(briefingIdle==='0'&&before.byMode.idle.submitted3D<85)
    throw Error('E6.13 A/B baseline was lost');
   await page.locator('#briefingClose').click({timeout:30000});
   await page.waitForFunction(()=>
    document.getElementById('briefingPanel')?.hidden===true);
   await wait(600);
   await page.screenshot({path:dir+'/seed-'+seed+'-template-'+templateEnabled+'-planning.png'});
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
   const fullDrawTrace=await page.evaluate(()=>
     window.__fieldworkE625DrawTrace??null);
   if(!fullDrawTrace||!fullDrawTrace.reliable||
      fullDrawTrace.total<=0||!fullDrawTrace.sources?.length)
      throw Error('Missing E6.25 exact-frame source census');
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
   const main=scene.mainPassAttribution;
   if(!main||main.frames<85||main.reliableFrames<85||
      !Number.isFinite(main.drawCallsP95)||main.drawCallsP95<=0||
      !Number.isFinite(main.uniqueMaterialsP95)||main.uniqueMaterialsP95<=0||
      !main.dominantMaterialTypes?.length||
      !main.dominantOwners?.length||
      !main.dominantSources?.length||
      !main.topMaterialInstances?.length||
      main.reconciledWithNonShadowFrames<85||
      main.drawCallsP95!==submit.nonShadowDrawCallsP95)
     throw Error('Missing or unreconciled E6.25 main-pass evidence: '+
      JSON.stringify({main,submit}));
   if(live.topGaps.some(spike=>spike.precedingSubmitted3D&&
      spike.precedingDominantScenePhase===undefined))
      throw Error('Worst live gaps missing preceding 3D phase attribution');
   if(errors.length)throw Error('JS runtime errors: '+errors.join(' | '));
   const path=dir+'/seed-'+seed+'-template-'+templateEnabled+'.json';
   await page.screenshot({path:dir+'/seed-'+seed+'-template-'+templateEnabled+'.png'});
   writeFileSync(path,JSON.stringify(local,null,2)+'\n');
   evidence.runs.push({
    seed,templateEnabled,briefingIdle,siteBuild,fullDrawTrace,
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
    renderSubmission:submit,mainPassAttribution:main,
    errors:errors.length,artifact:path
   });
  }finally{await page.close();await browser.close();browser=undefined;}
 }
 // E6.25 adds static character-style furniture. Fewer opaque environment
 // draws are expected and welcome; no extra draws, transparency changes or
 // altered tactical owner submissions are permitted. CPU timing is diagnostic,
 // never an uninstrumented FPS or hardware GPU claim.
 // Preserve actual browser trace even when an acceptance assertion fails.
 writeFileSync(dir+'/raw-runs.json',JSON.stringify(evidence,null,2)+'\n');
 const pairs=scenarios.map(({seed,building})=>{
  const off=evidence.runs.find(r=>r.seed===seed&&r.templateEnabled==='0');
  const on=evidence.runs.find(r=>r.seed===seed&&r.templateEnabled==='1');
  if(!off||!on)throw Error('Missing ON/OFF batch pair for seed '+seed);
  const inventory=(off.siteBuild.fixtureInventory??[]).map(before=>{
   const after=on.siteBuild.fixtureInventory?.find(v=>v.index===before.index);
   return {index:before.index,fixture:before.fixture,
    before:before.meshes,after:after?.meshes,
    delta:(after?.meshes??0)-before.meshes,
    beforeTypes:before.parts,afterTypes:after?.parts,
    cached:after?.template};
  }).filter(x=>x.delta!==0||x.beforeTypes!==x.afterTypes);
  console.log('E6_25_FIXTURE_INVENTORY_DIFFERENCES',
   JSON.stringify({seed,building,total:inventory.length,
    mismatches:inventory.slice(0,70)}));
  // A post-instancing rendered +1 draw can have identical pre-batch owner
  // inventories. Compare exact group members and geometry draw sections.
  const canonical=site=>new Set((site.batchMembership??[])
   .map(g=>JSON.stringify(g)));
  const offGroups=canonical(off.siteBuild),onGroups=canonical(on.siteBuild);
  const changedOff=[...offGroups].filter(x=>!onGroups.has(x)).map(JSON.parse);
  const changedOn=[...onGroups].filter(x=>!offGroups.has(x)).map(JSON.parse);
  const fixtureFor=index=>off.siteBuild.fixtureInventory?.find(x=>x.index===index)?.fixture;
  const summarize=g=>({...g,fixtures:g.indices.map(fixtureFor)});
  console.log('E6_25_BATCH_MEMBERSHIP_DIFF',JSON.stringify({
    seed,building,offGroups:offGroups.size,onGroups:onGroups.size,
    offOnly:changedOff.slice(0,70).map(summarize),
    onOnly:changedOn.slice(0,70).map(summarize)
  }));
  const offSources=new Map(off.fullDrawTrace.sources.map(s=>[s.source,s.draws]));
  const onSources=new Map(on.fullDrawTrace.sources.map(s=>[s.source,s.draws]));
  const changedSources=[...new Set([...offSources.keys(),...onSources.keys()])]
    .map(source=>({source,off:offSources.get(source)??0,
      on:onSources.get(source)??0,
      delta:(onSources.get(source)??0)-(offSources.get(source)??0)}))
    .filter(s=>s.delta!==0).sort((a,b)=>b.delta-a.delta||
      a.source.localeCompare(b.source));
  console.log('E6_25_EXACT_SOURCE_DIFF',JSON.stringify({
   seed,building,before:off.fullDrawTrace.total,
   after:on.fullDrawTrace.total,
   sourcesBefore:offSources.size,sourcesAfter:onSources.size,
   differences:changedSources
  }));
  const planningPrecheck=compareImages(
    dir+'/seed-'+seed+'-template-0-planning.png',
    dir+'/seed-'+seed+'-template-1-planning.png');
  const livePrecheck=compareImages(
    dir+'/seed-'+seed+'-template-0.png',
    dir+'/seed-'+seed+'-template-1.png');
  console.log('E6_25_VISUAL_PRECHECK',
    JSON.stringify({seed,building,planningPrecheck,livePrecheck}));
  const saved=off.mainPassAttribution.drawCallsP95-on.mainPassAttribution.drawCallsP95;
  const core=off.mainPassAttribution.dominantOwners.find(x=>x.owner==='environment');
  const after=on.mainPassAttribution.dominantOwners.find(x=>x.owner==='environment');
  const envSaved=(core?.drawsTotal??NaN)-(after?.drawsTotal??NaN);
  // Compiled static character models may reduce opaque draws. Reject only
  // actual regressions; new caching must not change transparency work.
  console.log('E6_25_DRAW_DIAGNOSTIC',JSON.stringify({
   seed,building,off:off.siteBuild,on:on.siteBuild,
   saved,envSaved,
   before:{draws:off.mainPassAttribution.drawCallsP95,
    opaque:off.mainPassAttribution.opaqueDrawsP95,
    transparent:off.mainPassAttribution.transparentDrawsP95},
   after:{draws:on.mainPassAttribution.drawCallsP95,
    opaque:on.mainPassAttribution.opaqueDrawsP95,
    transparent:on.mainPassAttribution.transparentDrawsP95}
  }));
  if(!core||!after||saved<0||envSaved<0||
     off.mainPassAttribution.transparentDrawsP95!==
      on.mainPassAttribution.transparentDrawsP95||
     off.mainPassAttribution.alphaTestDrawsP95!==
      on.mainPassAttribution.alphaTestDrawsP95)
   throw Error('E6.25 draw-count/transparent owner regression for seed '+seed+
    ': '+JSON.stringify({saved,envSaved,
     before:off.mainPassAttribution,after:on.mainPassAttribution}));
  const planningPixels=compareImages(
   dir+'/seed-'+seed+'-template-0-planning.png',
   dir+'/seed-'+seed+'-template-1-planning.png');
  const livePixels=compareImages(
   dir+'/seed-'+seed+'-template-0.png',
   dir+'/seed-'+seed+'-template-1.png');
  if(planningPixels.closeAgreementPct<99)
   throw Error('E6.25 planning screenshot parity failed for seed '+seed+': '+
    JSON.stringify(planningPixels));
  if(on.siteBuild.cache.leases<=off.siteBuild.cache.leases)
   throw Error('E6.25 '+building+' map did not exercise added character models '+seed+
    ' '+JSON.stringify({off:off.siteBuild.cache,on:on.siteBuild.cache}));
  if(off.renderSubmission.shadowDrawCallsP95<1||on.renderSubmission.shadowDrawCallsP95<1||
     on.renderSubmission.shadowDrawCallsP95>off.renderSubmission.shadowDrawCallsP95)
   throw Error('Lost real shadow pass');
  return {seed,building,planningPixels,livePixels,offSiteBuild:off.siteBuild,
   onSiteBuild:on.siteBuild,beforeDrawCallsP95:off.mainPassAttribution.drawCallsP95,
   afterDrawCallsP95:on.mainPassAttribution.drawCallsP95,savedP95:saved,
   beforeEnvironmentTotal:core.drawsTotal,afterEnvironmentTotal:after.drawsTotal,
   savedEnvironmentDrawsTotal:envSaved};
 });

 evidence.pairs=pairs;
 writeFileSync(dir+'/summary.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('E6_25_LIVE_SCENE_BROWSER',JSON.stringify(evidence));
}finally{await browser?.close();server.kill('SIGTERM');}
