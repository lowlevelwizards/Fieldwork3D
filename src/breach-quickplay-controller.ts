/** Stage 10a: Quick Play worker, progress, cancellation and staged loading.
 * Session creation, rendering, camera and campaign routing remain delegated.
 */
import type {BreachBootConfig} from './breach-boot-config.ts';
import type {CampaignMode} from './breach-app-mode.ts';
import {team,type Session} from './breach-game.ts';
import type {FavoriteMission} from './breach-mission-favorites.ts';
import type {RosterState} from './breach-roster.ts';
import type {FieldInventory,FieldCarryLocation} from './equipment-field-inventory.ts';
import type {CarryGearSlot} from './equipment-carry-gear-change.ts';
import type {LoadoutSlot} from './equipment-loadouts.ts';
import type {WeaponId} from './breach-combat.ts';
import type {MissionStartSnapshot} from './breach-mission-restart.ts';
import type {Site,SiteScale} from './breach-site.ts';
import type {OperationKind} from './breach-operations.ts';
import {resolveQuickPlaySettings,type QuickPlaySettings} from './quick-play-settings.ts';
import {setObjectiveIntelLevel} from './breach-objective-intel.ts';
import {createQuickPlayConfigurator} from './ui/quick-play-configurator.ts';
import type {TacticalScene3D,ViewMode} from './breach-3d.ts';
import {createColdDeviceEvidence,mountColdDeviceExport,
 captureColdReadyFrameIntervals} from './rendering/breach-cold-device-evidence.ts';
import {PostReadyRuntimeCapture,type PostReadyRuntimeFrame}
 from './rendering/breach-post-ready-attribution.ts';
import type {QuickPlayGenerationRequest,QuickPlayGenerationResponse}
  from './quick-play-generation.ts';


export type QuickPlayControllerHooks={
  boot:BreachBootConfig;
  randomSeed:()=>number;
  getRoster:()=>RosterState;
  equipFieldInventory:(id:string,inventory:FieldInventory)=>boolean;
  moveMagazine?:(id:string,magazineId:string,to:FieldCarryLocation)=>boolean;
  equipCarryGear?:(id:string,slot:CarryGearSlot,itemId:string)=>boolean;
  equipGear?:(id:string,slot:LoadoutSlot,itemId:string)=>boolean;
  equipWeapon?:(id:string,weapon:WeaponId)=>boolean;
  copyCarryLayout?:(sourceId:string,targetId:string)=>boolean;
  getScale:()=>SiteScale;
  getMode:()=>CampaignMode;
  setMode:(value:CampaignMode)=>void;
  getSession:()=>Session;
  startSession:(seed:number,site:Site,mission:OperationKind)=>void;
  getStage:()=>TacticalScene3D|null;
  getViewMode:()=>ViewMode;
  layout:()=>void;
  refreshHud:()=>void;
  prepareFirstFrame:()=>void;
  renderFirstFrame:()=>void;
  hideMenu:()=>void;
  showBriefing:()=>void;
  restoreFavoriteStart:(start:MissionStartSnapshot)=>void;
  activateFavorite:(id:string)=>void;
  showHelp:(message:string,duration:number)=>void;
  onConfiguratorVisibilityChange?:(visible:boolean)=>void;
};
export function createBreachQuickPlayController(config:QuickPlayControllerHooks){
 const el=<T extends HTMLElement>(id:string):T=>{
   const found=document.getElementById(id);
   if(!found)throw Error('Missing Quick Play UI: '+id);
   return found as T;
 };
let quickPlayBusy=false;
let postReadyRuntimeCapture:PostReadyRuntimeCapture|null=null;
let liveExecutionCapture:PostReadyRuntimeCapture|null=null;
let liveExecutionStarted=false;
let coldRuntimeEvidence:ReturnType<typeof createColdDeviceEvidence>|null=null;
/** The tactical runtime calls this only when ?coldBench=1. */
function recordRuntimeFrame(frame:PostReadyRuntimeFrame):void{
  // Opt-in only: this callback is already invoked by the single real
  // tactical RAF; never enqueue a separate simulation or renderer pass.
  const evidence=coldRuntimeEvidence;
  if(!evidence)return;
  const hidden=document.visibilityState==='hidden';
  const planning=postReadyRuntimeCapture;
  if(planning){
    if(hidden)planning.stopForVisibility();
    else planning.add(frame);
    if(planning.completed){
      evidence.postReadyRuntime=planning.finish();
      postReadyRuntimeCapture=null;
    }
  }
  if(!liveExecutionStarted&&!hidden&&frame.mode==='live'){
    liveExecutionStarted=true;
    liveExecutionCapture=new PostReadyRuntimeCapture(90);
  }
  const live=liveExecutionCapture;
  if(!live)return;
  if(hidden)live.stopForVisibility();
  else if(frame.mode!=='live')live.stopForInterruption();
  else live.add(frame);
  if(live.completed){
    evidence.liveExecutionRuntime=live.finish();
    liveExecutionCapture=null;
  }
}
let quickPlayRun=0;
let quickPlayWorker:Worker|null=null;
let quickPlayReject:((reason:Error)=>void)|null=null;
let quickPlayClockTimer:ReturnType<typeof setInterval>|null=null;
let quickPlayStarted=0,quickPlayLastUpdate=0,quickPlayPercent=0;
const quickPlayPanel=el<HTMLElement>('quickPlayProgress');
const quickPlayBar=el<HTMLProgressElement>('quickPlayBar');
const quickPlayPercentText=el<HTMLOutputElement>('quickPlayPercent');
const quickPlayRecipeText=el<HTMLElement>('quickPlayRecipe');
const quickPlayStageText=el<HTMLElement>('quickPlayStage');
const quickPlayDetailText=el<HTMLElement>('quickPlayDetail');
const quickPlayClockText=el<HTMLElement>('quickPlayClock');
const quickPlayCancelButton=el<HTMLButtonElement>('quickPlayCancel');
function quickPlayCheckpoint(value:number,stageName:string,detail:string){
  quickPlayPercent=Math.max(quickPlayPercent,Math.min(100,Math.round(value)));
  quickPlayBar.value=quickPlayPercent;
  quickPlayPercentText.textContent=quickPlayPercent+'%';
  // Player-facing states are concise; the real checkpoint sequence is unchanged.
  const friendlyStage:Record<string,string>={
   'Starting tactical sandbox':'Preparing your operation',
   'Starting architecture worker':'Generating the site',
   'Preparing tactical session':'Preparing the mission',
   'Building 3D environment':'Building the environment',
   'Preparing operator models':'Preparing your squad',
   'Preparing tactical controls':'Preparing controls',
   'Preparing first-frame visibility':'Preparing the first view',
   'Preparing GPU programs':'Preparing the scene',
   'Rendering first 3D frame':'Rendering the scene',
   'Revealing tactical scene':'Opening the mission',
   'TACTICAL SANDBOX READY':'Mission ready',
   'TACTICAL SANDBOX FAILED':'Mission could not load'
  };
  quickPlayStageText.textContent=friendlyStage[stageName]??stageName;
  quickPlayDetailText.textContent=detail;
  quickPlayLastUpdate=performance.now();
}
function quickPlayClockTick(){
  const elapsed=Math.floor((performance.now()-quickPlayStarted)/1000);
  const quiet=Math.floor((performance.now()-quickPlayLastUpdate)/1000);
  quickPlayClockText.textContent=elapsed+'s elapsed'+
    (quickPlayBusy&&quiet>10?' · Still working on this stage':'');
}
function finishQuickPlayClock(){
  if(quickPlayClockTimer!==null){
    clearInterval(quickPlayClockTimer);quickPlayClockTimer=null;
  }
}
const allowQuickPlayPaint=()=>new Promise<void>(resolve=>
  requestAnimationFrame(()=>setTimeout(resolve,0)));
quickPlayCancelButton.addEventListener('click',()=>{
  if(quickPlayPanel.dataset.state==='error'){
    quickPlayPanel.hidden=true;
    configurator.open();return;
  }
  if(!quickPlayBusy||quickPlayCancelButton.hidden)return;
  ++quickPlayRun;
  quickPlayReject?.(new Error('Quick Play loading cancelled'));
  quickPlayReject=null;
  quickPlayWorker?.terminate();quickPlayWorker=null;
  quickPlayBusy=false;finishQuickPlayClock();
  quickPlayPanel.hidden=true;
  // Cancel returns to the scenario creator, keeping the old mission intact.
  configurator.open();
});
const configurator=createQuickPlayConfigurator({
  getRoster:config.getRoster,onEquipField:config.equipFieldInventory,
  onMoveMagazine:config.moveMagazine,
  onEquipCarryGear:config.equipCarryGear,
  onEquipGear:config.equipGear,onEquipWeapon:config.equipWeapon,
  onCopyCarryLayout:config.copyCarryLayout,
  randomSeed:config.randomSeed,
  onGenerate:settings=>{void launchQuickPlay(settings);},
  onVisibilityChange:config.onConfiguratorVisibilityChange
});
async function launchQuickPlay(settings:QuickPlaySettings=configurator.getSettings()){
  if(quickPlayBusy)return;
  if(!settings.buildings.length){configurator.open();return;}
  let recipe:ReturnType<typeof resolveQuickPlaySettings>;
  try{recipe=resolveQuickPlaySettings(settings,config.randomSeed());}
  catch(error){
    config.showHelp(error instanceof Error?error.message:String(error),4000);
    configurator.open();return;
  }
  const id=++quickPlayRun,priorMode=config.getMode();
  const seed=recipe.seed,scale=recipe.scale;
  // Never mix samples from different mission startup attempts.
  postReadyRuntimeCapture=null;liveExecutionCapture=null;
  liveExecutionStarted=false;coldRuntimeEvidence=null;
  quickPlayBusy=true;quickPlayPercent=0;
  quickPlayPanel.hidden=false;quickPlayPanel.dataset.state='running';
  // Describe only player-selected setup, never unscouted threats or generated rooms.
  const chosenIncident=settings.incident==='random'?'Random incident':
   (settings.incident.replaceAll('-',' '));
  quickPlayRecipeText.textContent=chosenIncident+' · '+
   (settings.mission==='random'?'Random objective':settings.mission)+
   ' · '+(settings.size==='random'?'Random size':settings.size)+
   ' · '+(settings.seed===null?'Fresh seed':'Seed '+settings.seed);
  quickPlayCancelButton.hidden=false;quickPlayCancelButton.textContent='CANCEL';
  quickPlayStarted=performance.now();quickPlayLastUpdate=quickPlayStarted;
  quickPlayCheckpoint(0,'Starting tactical sandbox',
    'Preparing '+scale+' site · seed '+seed);
  quickPlayClockTick();
  finishQuickPlayClock();quickPlayClockTimer=setInterval(quickPlayClockTick,1000);
  try{
    await allowQuickPlayPaint();
    if(id!==quickPlayRun)return;
    const generated=await new Promise<Extract<QuickPlayGenerationResponse,
       {kind:'done'}>>((resolve,reject)=>{
      quickPlayReject=reject;
      const worker=new Worker(new URL('./quick-play-worker.ts',import.meta.url),
        {type:'module'});
      quickPlayWorker=worker;
      quickPlayCheckpoint(3,'Starting architecture worker',
        'Planning a reproducible tactical environment');
      worker.onmessage=(event:MessageEvent<QuickPlayGenerationResponse>)=>{
        const message=event.data;
        if(id!==quickPlayRun||message.id!==id)return;
        if(message.kind==='progress'){
          quickPlayCheckpoint(message.percent,message.stage,message.detail);
          return;
        }
        worker.terminate();quickPlayWorker=null;quickPlayReject=null;
        if(message.kind==='error')reject(new Error(message.message));
        else resolve(message);
      };
      worker.onerror=event=>{
        event.preventDefault();
        worker.terminate();quickPlayWorker=null;quickPlayReject=null;
        reject(new Error('Architecture worker stopped unexpectedly'));
      };
      const request:QuickPlayGenerationRequest={id,...recipe};
      worker.postMessage(request);
    });
    if(id!==quickPlayRun)return;
    quickPlayCancelButton.hidden=true;
    quickPlayCheckpoint(76,'Preparing tactical session',
      'Creating squad, navigation, intel and encounter state');
    await allowQuickPlayPaint();
    if(id!==quickPlayRun)return;
    const sessionStart=performance.now();
    config.setMode('quick');
    // Reuse the completed site rather than compiling the same map again.
    config.startSession(seed,generated.site,recipe.mission);
    // Objective truth is independent of architectural map visibility.
    setObjectiveIntelLevel(config.getSession(),recipe.objectiveIntel);
    const sessionMs=Math.round(performance.now()-sessionStart);
    quickPlayCheckpoint(86,'Building 3D environment',
      'Generating room meshes, fixtures, materials and static batches');
    await allowQuickPlayPaint();
    const stage=config.getStage();
    const coldTrace=stage?.coldRendererTrace&&!stage.coldRendererTrace.closed?
      stage.coldRendererTrace:null;
    const sceneStart=performance.now();
    stage?.applySite(config.getSession().site??null);
    const sceneMs=Math.round(performance.now()-sceneStart);
    // First rendered scene would otherwise construct every friendly rig at
    // once. Spread that expensive, reusable model allocation over paint turns.
    const operatorStart=performance.now();
    const initialTeam=team(config.getSession()),operatorStageMs:number[]=[];
    for(let i=0;i<initialTeam.length;i++){
      quickPlayCheckpoint(88+Math.floor(6*i/initialTeam.length),
        'Preparing operator models',
        initialTeam[i].name+' · '+(i+1)+' / '+initialTeam.length);
      await allowQuickPlayPaint();
      if(id!==quickPlayRun)return;
      const modelStart=performance.now();
      stage?.prepareOperatorModel(initialTeam[i]);
      const modelMs=Math.round(performance.now()-modelStart);
      operatorStageMs.push(modelMs);
      quickPlayDetailText.textContent=initialTeam[i].name+' ready in '+
        (modelMs/1000).toFixed(2)+'s · '+(i+1)+' / '+initialTeam.length;
    }
    const operatorMs=Math.round(performance.now()-operatorStart);
    quickPlayCheckpoint(95,'Preparing tactical controls',
      'Fitting the camera and updating the mission HUD');
    await allowQuickPlayPaint();
    if(id!==quickPlayRun)return;
    const hudStart=performance.now();
    config.layout();config.refreshHud();
    const hudMs=Math.round(performance.now()-hudStart);
    // Shader preparation can use KHR_parallel_shader_compile on capable
    // browsers. It does not pre-render the game or upload the whole wardrobe.
    // Keep an A/B opt-out: ?gpuWarmup=0 allows identical-seed comparisons.
    let shaderPreparationMs=0,preflightMs=0;
    // E6.10: the old compileAsync saw the unposed, largely invisible scene.
    // Apply exactly the initial frame's visual state *without drawing* first.
    // The ordinary final draw reuses this preparation, not a second update.
    if(stage&&config.getViewMode()!=='plan2d'&&
       config.boot.gpuWarmupEnabled&&config.boot.coldPrewarmEnabled){
      quickPlayCheckpoint(95,'Preparing first-frame visibility',
        'Synchronizing actual operator, fog, light and shadow variants');
      await allowQuickPlayPaint();
      if(id!==quickPlayRun)return;
      const preflightStart=performance.now();
      try{
        if(coldTrace)coldTrace.capture('preflight',()=>
          config.prepareFirstFrame());
        else config.prepareFirstFrame();
      }catch(error){
        // An interrupted preflight must not block the old render path.
        console.warn('[Quick Play preflight fallback]',error);
      }
      preflightMs=Math.round(performance.now()-preflightStart);
    }
    if(stage&&config.getViewMode()!=='plan2d'&&
       config.boot.gpuWarmupEnabled){
      quickPlayCheckpoint(96,'Preparing GPU programs',
        'Warming visible materials before the first 3D draw');
      await allowQuickPlayPaint();
      if(id!==quickPlayRun)return;
      const shaderStart=performance.now();
      try{
        if(coldTrace)await coldTrace.captureAsync('compileAsync',()=>
          stage.renderer.compileAsync(stage.scene,stage.camera));
        else await stage.renderer.compileAsync(stage.scene,stage.camera);
      }catch(error){
        // A failed async warmup must never prevent the ordinary first frame.
        console.warn('[Quick Play shader preparation fallback]',error);
      }
      shaderPreparationMs=Math.round(performance.now()-shaderStart);
      if(id!==quickPlayRun)return;
    }
    // The first WebGL render is the last major synchronous initialization
    // step (costume materials, visibility, fog, shadow atlas and shaders).
    // Keep the loading mask up while it runs and measure its real duration.
    quickPlayCheckpoint(97,'Rendering first 3D frame',
      'Applying uniforms, fog, lighting and GPU materials');
    await allowQuickPlayPaint();
    if(id!==quickPlayRun)return;
    const firstFrameStart=performance.now();
    // E6.9: Chromium DevTools can capture just this synchronous cold
    // scene update and first draw via console.profile; no profiling work
    // or material/render-policy changes occur without ?cpuTrace=1.
    const cpuTraceEnabled=config.boot.cpuTraceEnabled;
    const cdpProfileConsole=console as Console&{
      profile?:(label:string)=>void;profileEnd?:(label:string)=>void
    };
    if(cpuTraceEnabled)cdpProfileConsole.profile?.('fieldwork-e6.9-first-frame');
    try{
      if(coldTrace)coldTrace.capture('firstFrame',()=>config.renderFirstFrame());
      else config.renderFirstFrame();
    }finally{
      // End even when the draw throws, so browser automation receives a
      // finite CPU profile instead of hanging or leaking to later frames.
      if(cpuTraceEnabled)cdpProfileConsole.profileEnd?.('fieldwork-e6.9-first-frame');
    }
    const firstFrameMs=Math.round(performance.now()-firstFrameStart);
    if(cpuTraceEnabled){
      (window as Window&{__fieldworkE69?:unknown}).__fieldworkE69={
        schema:'fieldwork-e6.9-cold-cpu-v1',
        seed,shaderWarmupEnabled:config.boot.gpuWarmupEnabled,
        shaderPreparationMs,preflightMs,firstFrameMs,
        note:'Chrome DevTools CPU samples, not GPU time or measured iPhone FPS.'
      };
    }
    const coldRendererEvidence=coldTrace?.finish()??null;
    if(coldRendererEvidence){
      // Local debug-only readout for fresh-page cold A/B automation. No
      // upload, no persistent storage and no WebGL instrumentation afterward.
      const evidence={seed,shaderWarmupEnabled:config.boot.gpuWarmupEnabled,
        shaderPreparationMs,preflightMs,firstFrameMs,...coldRendererEvidence};
      (window as Window&{__fieldworkE68?:unknown}).__fieldworkE68=evidence;
      console.info('[E6.8 cold renderer]',evidence);
    }
    quickPlayCheckpoint(99,'Revealing tactical scene',
      'First render completed · preparing controls');
    config.hideMenu();
    await allowQuickPlayPaint();
    if(id!==quickPlayRun)return;
    const totalMs=Math.round(performance.now()-quickPlayStarted);
    quickPlayCheckpoint(100,'TACTICAL SANDBOX READY',
      (config.getSession().site?.name??'Site')+' · squad ready');
    quickPlayPanel.dataset.state='ready';
    quickPlayClockText.textContent=(totalMs/1000).toFixed(1)+'s total · map '+
      (generated.generationMs/1000).toFixed(1)+'s · 3D '+
      (sceneMs/1000).toFixed(1)+'s · operators '+
      (operatorMs/1000).toFixed(1)+'s · frame '+
      (firstFrameMs/1000).toFixed(1)+'s';
    console.info('[Quick Play startup]',{
      seed,scale,building:recipe.archetype,mission:recipe.mission,
      generationMs:generated.generationMs,sessionMs,sceneMs,
      operatorMs,operatorStageMs,hudMs,firstFrameMs,totalMs,
      shaderPreparationMs,preflightMs
    });
    // Now that an actual complete frame exists behind the overlay, allow
    // live RAF updates. Never declare READY before the render has returned.
    quickPlayBusy=false;
    finishQuickPlayClock();
    // E6.11: only ?coldBench=1 publishes a local device-level benchmark.
    // No network calls or storage; a download requires a deliberate tap.
    // A separate bounded RAF sampler starts after the live loop resumes and
    // does not delay readiness or add overhead to ordinary missions.
    if(config.boot.coldBenchEnabled){
      const benchmark=createColdDeviceEvidence({
        seed,gpuWarmupEnabled:config.boot.gpuWarmupEnabled,
        prewarmEnabled:config.boot.gpuWarmupEnabled&&
          config.boot.coldPrewarmEnabled,
        trace:coldRendererEvidence,
        phases:{generationMs:generated.generationMs,sessionMs,sceneMs,
          operatorMs,hudMs,preflightMs,shaderPreparationMs,firstFrameMs,totalMs}
      });
      (window as Window&{__fieldworkE611?:unknown}).__fieldworkE611=benchmark;
      mountColdDeviceExport(benchmark);
      // E6.12: align the real tactical loop callbacks with the independent
      // RAF sampler; no extra game update or canvas submission is scheduled.
      coldRuntimeEvidence=benchmark;
      postReadyRuntimeCapture=new PostReadyRuntimeCapture(90);
      void captureColdReadyFrameIntervals(90).then(stats=>{
        benchmark.postReadyFrames=stats;
        console.info('[E6.11 device cold benchmark ready]',benchmark);
      }).catch(error=>console.warn('[E6.11 RAF sampling]',error));
    }
    // The prior 1400ms READY hold made an already prepared game look frozen.
    // Let the resumed gameplay loop paint a frame behind the mask, then
    // release it on the next paint turn with no artificial countdown.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(id===quickPlayRun&&!quickPlayBusy&&
         quickPlayPanel.dataset.state==='ready')
        {
          // Mount the briefing *under* the loading mask first. Hiding the
          // mask afterward prevents a one-frame flash of the tactical scene.
          config.showBriefing();
          quickPlayPanel.hidden=true;
        }
    }));
  }catch(error){
    if(id!==quickPlayRun)return;
    quickPlayWorker?.terminate();quickPlayWorker=null;quickPlayReject=null;
    config.setMode(priorMode);quickPlayBusy=false;finishQuickPlayClock();
    quickPlayPanel.dataset.state='error';quickPlayCancelButton.hidden=false;
    quickPlayCancelButton.textContent='BACK';
    quickPlayStageText.textContent='MISSION COULD NOT LOAD';
    quickPlayDetailText.textContent=error instanceof Error?error.message:String(error);
    quickPlayClockText.textContent='Stopped · return to scenario generator';
    console.error('[Quick Play startup]',error);
  }
}
 function restoreFavorite(saved:FavoriteMission):void{
   if(config.getMode()==='mission'){
     config.showHelp('FAVORITES PLAY AS QUICK PLAY PRACTICE',3400);return;
   }
   const start=structuredClone(saved.start);
   config.setMode('quick');
   config.restoreFavoriteStart(start);
   config.activateFavorite(saved.id);
   config.layout();config.refreshHud();
   config.showHelp('FAVORITE LOADED · ORIGINAL MISSION SETUP',3800);
 }
 return {
   restoreFavorite,recordRuntimeFrame,
   launch:launchQuickPlay,
   customize:()=>{if(!quickPlayBusy)configurator.open();},
   get configuring(){return configurator.isOpen;},
   get busy(){return quickPlayBusy;},
   cancel:()=>quickPlayCancelButton.click()
 };
}
