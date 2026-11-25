/** E6.19: fine-grained live 3D phase profiling in real Quick Play briefing-dismissal -> execution, on/off E6.13.
 * Only Chromium ANGLE/SwiftShader CPU wall time. No hardware GPU claims.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4407,base='http://127.0.0.1:'+port;
const dir=process.env.FIELDWORK_WALL_OUTPUT||'artifacts/refactor-e6-19/live-scene';
const wallMode=process.env.FIELDWORK_WALL_WEAR||'default';
const wallQuery=['compiled','unified'].includes(wallMode)?'&wallStructure='+wallMode:wallMode==='default'?'':'&wallWear='+wallMode;
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
 if(!ready)throw Error('E6.19 Vite unavailable');
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 const evidence={schema:'fieldwork-e6.19-transparent-provenance-v1',
  note:'90 actual live callbacks after dismissing planning briefing, two seeds and briefing variants, fresh Chromium process, software WebGL. E6.19 fine-grained scene phases are CPU wall time, not GPU hardware timing; the shadow phase prepares shadow flags, actual shadow raster work may appear inside gpuSubmit.',
  runs:[]};
 for(const seed of [23,97])for(const briefingIdle of ['1']){
  browser=await chromium.launch({headless:true,
   ...(process.env.FIELDWORK_CI_CHROME&&chrome?{executablePath:chrome}:{}),
   args:['--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader']});
  const desktop=process.env.FIELDWORK_WALL_DESKTOP==='1';
  const page=await browser.newPage({viewport:desktop?{width:1280,height:800}:{width:390,height:844},
   deviceScaleFactor:1,hasTouch:!desktop,isMobile:!desktop,acceptDownloads:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/breach.html?coldBench=1&briefingIdle='+briefingIdle+
    '&gpuWarmup=1&coldPrewarm=1'+wallQuery,{waitUntil:'domcontentloaded'});
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
   // The opt-in benchmark export control overlaps Play at desktop sizes.
   // Keyboard activation uses the same public button without pointer interception.
   const play=page.locator('#play');
   if(desktop){
    await play.waitFor({state:'visible',timeout:30000});
    if(!(await play.isEnabled()))throw Error('Desktop Play unavailable');
    await play.press('Enter',{timeout:30000});
   }else await play.click({timeout:30000});
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
   const main=scene.mainPassAttribution;
   if(!main||main.frames<85||main.reliableFrames<85||
      !Number.isFinite(main.drawCallsP95)||main.drawCallsP95<=0||
      !Number.isFinite(main.uniqueMaterialsP95)||main.uniqueMaterialsP95<=0||
      !main.dominantMaterialTypes?.length||
      !main.dominantOwners?.length||
      !main.topMaterialInstances?.length||
      !main.dominantTransparencyRoles?.length||
      main.transparentRoleReconciledFrames<85||
      main.transparentTaggedDrawsTotal<=0||
      main.transparentDrawsTotal<=0||
      main.transparentTaggedDrawsTotal>main.transparentDrawsTotal||
      main.reconciledWithNonShadowFrames<85||
      main.drawCallsP95!==submit.nonShadowDrawCallsP95)
     throw Error('Missing or unreconciled E6.19 main-pass evidence: '+
      JSON.stringify({main,submit}));
   if(wallMode!=='legacy'&&main.dominantTransparencyRoles.some(role=>role.role==='wall-weathering'&&role.drawsTotal>0))
     throw Error('Integrated finish submitted independent weathering draws');
   if(live.topGaps.some(spike=>spike.precedingSubmitted3D&&
      spike.precedingDominantScenePhase===undefined))
      throw Error('Worst live gaps missing preceding 3D phase attribution');
   if(errors.length)throw Error('JS runtime errors: '+errors.join(' | '));
   const path=dir+'/seed-'+seed+'-briefing-'+briefingIdle+'.json';
   await page.screenshot({path:path.replace(/\.json$/,'.png')});
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
    renderSubmission:submit,mainPassAttribution:main,
    transparentRoles:main.dominantTransparencyRoles,
    taggedFraction:main.transparentTaggedDrawsTotal/main.transparentDrawsTotal,
    errors:errors.length,artifact:path
   });
  }finally{await page.close();await browser.close();browser=undefined;}
 }
 // W1 regression on the actual renderer, separate from timed live captures.
 // Run the same controlled camera/knowledge fixture on both checkouts. The
 // previous renderer's known-facade depth mismatch is retained as evidence,
 // not hidden by changing the baseline or requiring a legacy pass.
 if(process.env.GITHUB_HEAD_REF?.startsWith('refactor/w0-w1-')||process.env.FIELDWORK_W2_PROBE==='1'){
  browser=await chromium.launch({headless:true,
   ...(process.env.FIELDWORK_CI_CHROME&&chrome?{executablePath:chrome}:{}),
   args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const desktop=process.env.FIELDWORK_WALL_DESKTOP==='1';
  const viewport=desktop?{width:1280,height:800}:{width:390,height:844};
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))errors.push(m.text());});
  try{
   await page.route('**/wall-presentation-probe*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
   await page.goto(base+'/wall-presentation-probe?probe=1'+wallQuery);
   evidence.wallProbe=await page.evaluate(async viewport=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {generateSite}=await import('/src/breach-site.ts');
    const {newSession,team}=await import('/src/breach-game.ts');
    const {activateSite}=await import('/src/breach-core.ts');
    const {spatialSurfaceKnown}=await import('/src/breach-presentation.ts');
    const check=(ok,why)=>{if(!ok)throw Error(why);};
    const makeSite=seed=>generateSite(seed,'standard',undefined,{mission:'intel'},{archetype:'house'});
    const site=makeSite(23);activateSite(site);
    const s=newSession(0,site.seed,'exterior-known','standard',undefined,site);
    const scene=new TacticalScene3D();scene.resize(viewport.width,viewport.height);scene.applySite(site);
    const candidate=Array.isArray(scene.wallOwners);
    if(new URLSearchParams(location.search).get('wallStructure')==='compiled'){
     const trim=scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-trim-packet');
     check(trim.length>0&&trim.every(w=>!w.mesh.castShadow),'Missing non-shadow compiled trim packets');
    }
    if(new URLSearchParams(location.search).get('wallWear')===null){
     check(scene.wallAudition?.atlas===true&&scene.wallAudition.effect==='all','Default wall renderer not W3');
     check(scene.patinaWallSurfaces.length>0&&scene.patinaWallSurfaces.every(w=>w.atlasSlot),'Default walls lack shared atlas');
    }
    if(new URLSearchParams(location.search).get('wallStructure')==='unified')check(scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-body').every(w=>w.mesh.userData.fieldworkUnifiedWall),'Missing unified structural bodies');
    const selected=team(s)[0].id;
    const draw=(session=s,id=selected,omniscient=false)=>scene.update(session,id,1,null,omniscient);
    const inventory=()=>scene.walls;
    const groups=()=>inventory().filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-body');
    const knowledge=session=>JSON.stringify({walls:[...session.intel.walls],rooms:[...session.intel.rooms],doors:[...session.intel.doors],cover:[...session.intel.cover],seen:[...session.seenGround]});
    const checkTactical=session=>{
     for(const w of groups())check(w.mesh.parent.visible===spatialSurfaceKnown(session,'wall',w.index),'Wall disclosure mismatch '+w.index);
    };
    let depthMismatches=0;
    const checkPieces=()=>{
     for(const w of inventory()){
      const m=w.mesh.material;
      if(m.depthWrite!==(m.opacity>=.995))depthMismatches++;
     }
     if(candidate)for(const owner of scene.wallOwners)
      for(const mesh of owner.pieces)check(mesh.material.opacity===owner.opacity,'Split segment fade '+owner.index);
    };
    const original=knowledge(s);
    scene.view.mode='iso';draw();checkTactical(s);
    const visible=()=>JSON.stringify({walls:groups().filter(w=>w.mesh.parent.visible).map(w=>w.index),actors:[...scene.actors].filter(([,a])=>a.root.visible).map(([id])=>id),cover:[...scene.coverGroups].filter(([,g])=>g.visible).map(([id])=>id)});
    const initialVisible=visible();
    check(scene.exteriorKnownFog.visible&&!scene.smoothFog.visible,'Exterior fog route changed');
    const exterior=groups().find(w=>w.exterior&&spatialSurfaceKnown(s,'wall',w.index));
    check(exterior,'No known exterior wall in fixture');
    const {a,b}=exterior.segment,mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    scene.view.focus=mid;scene.view.zoom=2.5;
    // Set a subject just inside either side of the tested wall; rotating
    // the camera must produce an actual fade and restore it without changing intel.
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    scene.setReplayDirectorSubjects([{x:mid.x-dy/len*16,y:mid.y+dx/len*16}]);
    let faded=false,restored=false;
    for(let i=0;i<16;i++){
     scene.view.yaw=i*Math.PI/4;draw();checkTactical(s);checkPieces();
     const m=exterior.mesh.material;
     if(m.opacity<.995)faded=true;
     else if(faded){restored=true;break;}
    }
    check(faded&&restored,'Camera rotation did not exercise cut and restore');
    check(knowledge(s)===original,'Camera altered knowledge');
    if(candidate)check(depthMismatches===0,'Incorrect structural depth writing');
    scene.setReplayDirectorSubjects([]);
    scene.setReplayDirectorCameraAnchor(mid,108,'wide');draw();
    check(inventory().every(w=>w.mesh.material.opacity===1),'Wide Director retained cutaway');
    scene.setReplayDirectorCameraAnchor(null);draw();
    scene.setPhotoLiveBodycam(true);
    scene.setReplayBodycam({actorId:selected,mount:'chest',stabilization:'balanced',fov:95});draw();
    check(inventory().every(w=>!w.mesh.material.transparent&&w.mesh.material.depthWrite&&w.mesh.material.opacity===1),'Bodycam retained tactical wall fade');
    scene.setReplayBodycam(null);scene.setPhotoLiveBodycam(false);
    const oldMeshes=new Set(inventory().map(w=>w.mesh));
    const other=makeSite(97);activateSite(other);
    const next=newSession(0,other.seed,'true-blind','standard',undefined,other);
    scene.applySite(other);
    if(candidate)check(scene.wallOwners.every(w=>w.opacity===1),'Site reset retained segment fade');
    draw(next,team(next)[0].id);checkTactical(next);
    check(scene.smoothFog.visible&&!scene.exteriorKnownFog.visible,'Second mission inherited exterior fog');
    scene.root.traverse(obj=>check(!oldMeshes.has(obj),'Retired structural mesh survived'));
    check(scene.lastFogSession===next,'Fog cache retained previous session');
    const result={candidate,faded,restored,depthMismatches,firstWalls:oldMeshes.size,secondWalls:inventory().length,secondMissionFog:true,initialKnowledge:original,initialVisible,secondVisible:visible()};
    scene.renderer.dispose();scene.renderer.forceContextLoss();
    return result;
   },viewport);
   if(errors.length)throw Error('Wall probe runtime errors: '+errors.join(' | '));
   console.log('W1_WALL_PRESENTATION '+JSON.stringify(evidence.wallProbe));
  }finally{await page.close();await browser.close();browser=undefined;}
 }
 evidence.wallMode=wallMode;
 evidence.comparison=evidence.runs.map(r=>({
  seed:r.seed,
  totalTransparentDraws:r.mainPassAttribution.transparentDrawsTotal,
  classifiedDraws:r.mainPassAttribution.transparentTaggedDrawsTotal,
  roles:r.mainPassAttribution.dominantTransparencyRoles,
  reconciledFrames:r.mainPassAttribution.transparentRoleReconciledFrames,
  mainDrawCallsP95:r.mainPassAttribution.drawCallsP95
 }));
 writeFileSync(dir+'/summary.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('E6_19_LIVE_SCENE_BROWSER',JSON.stringify(evidence));
}finally{await browser?.close();server.kill('SIGTERM');}
