/** Stage 10a: Quick Play worker, progress, cancellation and staged loading.
 * Session creation, rendering, camera and campaign routing remain delegated.
 */
import {team,type Session} from './breach-game.ts';
import type {FavoriteMission} from './breach-mission-favorites.ts';
import type {MissionStartSnapshot} from './breach-mission-restart.ts';
import type {Site,SiteScale} from './breach-site.ts';
import type {OperationKind} from './breach-operations.ts';
import {resolveQuickPlaySettings,type QuickPlaySettings} from './quick-play-settings.ts';
import {createQuickPlayConfigurator} from './ui/quick-play-configurator.ts';
import type {TacticalScene3D,ViewMode} from './breach-3d.ts';
import type {QuickPlayGenerationRequest,QuickPlayGenerationResponse}
  from './quick-play-generation.ts';

type CampaignMode='menu'|'home'|'mission'|'quick';
export type QuickPlayControllerHooks={
  randomSeed:()=>number;
  getScale:()=>SiteScale;
  getMode:()=>CampaignMode;
  setMode:(value:CampaignMode)=>void;
  getSession:()=>Session;
  startSession:(seed:number,site:Site,mission:OperationKind)=>void;
  getStage:()=>TacticalScene3D|null;
  getViewMode:()=>ViewMode;
  layout:()=>void;
  refreshHud:()=>void;
  renderFirstFrame:()=>void;
  hideMenu:()=>void;
  showBriefing:()=>void;
  restoreFavoriteStart:(start:MissionStartSnapshot)=>void;
  activateFavorite:(id:string)=>void;
  showHelp:(message:string,duration:number)=>void;
};
export function createBreachQuickPlayController(config:QuickPlayControllerHooks){
 const el=<T extends HTMLElement>(id:string):T=>{
   const found=document.getElementById(id);
   if(!found)throw Error('Missing Quick Play UI: '+id);
   return found as T;
 };
let quickPlayBusy=false;
let quickPlayRun=0;
let quickPlayWorker:Worker|null=null;
let quickPlayReject:((reason:Error)=>void)|null=null;
let quickPlayClockTimer:ReturnType<typeof setInterval>|null=null;
let quickPlayStarted=0,quickPlayLastUpdate=0,quickPlayPercent=0;
const quickPlayPanel=el<HTMLElement>('quickPlayProgress');
const quickPlayBar=el<HTMLProgressElement>('quickPlayBar');
const quickPlayPercentText=el<HTMLOutputElement>('quickPlayPercent');
const quickPlayStageText=el<HTMLElement>('quickPlayStage');
const quickPlayDetailText=el<HTMLElement>('quickPlayDetail');
const quickPlayClockText=el<HTMLElement>('quickPlayClock');
const quickPlayCancelButton=el<HTMLButtonElement>('quickPlayCancel');
function quickPlayCheckpoint(value:number,stageName:string,detail:string){
  quickPlayPercent=Math.max(quickPlayPercent,Math.min(100,Math.round(value)));
  quickPlayBar.value=quickPlayPercent;
  quickPlayPercentText.textContent=quickPlayPercent+'%';
  quickPlayStageText.textContent=stageName;
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
    quickPlayPanel.hidden=true;return;
  }
  if(!quickPlayBusy||quickPlayCancelButton.hidden)return;
  ++quickPlayRun;
  quickPlayReject?.(new Error('Quick Play loading cancelled'));
  quickPlayReject=null;
  quickPlayWorker?.terminate();quickPlayWorker=null;
  quickPlayBusy=false;finishQuickPlayClock();
  quickPlayPanel.hidden=true;
});
const configurator=createQuickPlayConfigurator({
  randomSeed:config.randomSeed,
  onGenerate:settings=>{void launchQuickPlay(settings);}
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
  quickPlayBusy=true;quickPlayPercent=0;
  quickPlayPanel.hidden=false;quickPlayPanel.dataset.state='running';
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
    const sessionMs=Math.round(performance.now()-sessionStart);
    quickPlayCheckpoint(86,'Building 3D environment',
      'Generating room meshes, fixtures, materials and static batches');
    await allowQuickPlayPaint();
    const stage=config.getStage();
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
    let shaderPreparationMs=0;
    if(stage&&config.getViewMode()!=='plan2d'&&
       new URLSearchParams(location.search).get('gpuWarmup')!=='0'){
      quickPlayCheckpoint(96,'Preparing GPU programs',
        'Warming visible materials before the first 3D draw');
      await allowQuickPlayPaint();
      if(id!==quickPlayRun)return;
      const shaderStart=performance.now();
      try{
        await stage.renderer.compileAsync(stage.scene,stage.camera);
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
    config.renderFirstFrame();
    const firstFrameMs=Math.round(performance.now()-firstFrameStart);
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
      shaderPreparationMs
    });
    // Now that an actual complete frame exists behind the overlay, allow
    // live RAF updates. Never declare READY before the render has returned.
    quickPlayBusy=false;
    finishQuickPlayClock();
    // The prior 1400ms READY hold made an already prepared game look frozen.
    // Let the resumed gameplay loop paint a frame behind the mask, then
    // release it on the next paint turn with no artificial countdown.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(id===quickPlayRun&&!quickPlayBusy&&
         quickPlayPanel.dataset.state==='ready')
        {
          quickPlayPanel.hidden=true;
          config.showBriefing();
        }
    }));
  }catch(error){
    if(id!==quickPlayRun)return;
    quickPlayWorker?.terminate();quickPlayWorker=null;quickPlayReject=null;
    config.setMode(priorMode);quickPlayBusy=false;finishQuickPlayClock();
    quickPlayPanel.dataset.state='error';quickPlayCancelButton.hidden=false;
    quickPlayCancelButton.textContent='BACK';
    quickPlayStageText.textContent='TACTICAL SANDBOX FAILED';
    quickPlayDetailText.textContent=error instanceof Error?error.message:String(error);
    quickPlayClockText.textContent='Stopped · return to menu and retry';
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
   restoreFavorite,
   launch:launchQuickPlay,
   customize:()=>{if(!quickPlayBusy)configurator.open();},
   get busy(){return quickPlayBusy;},
   cancel:()=>quickPlayCancelButton.click()
 };
}
