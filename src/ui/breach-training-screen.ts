/** Player-facing training entry and quick tools. The mission and runtime
 * controllers still exclusively own Session creation and simulation. */
import {trainingTargetProgress} from '../training/training-targets.ts';
import {TRIAL_IDS,TRIALS,trialConfig} from '../training/training-trials.ts';
import {assessTrainingTrial,type TrialAssessment} from '../training/training-scoring.ts';
import {saveTrainingRecord,loadTrainingRecords,trainingRecordKey} from '../training/training-records.ts';
import type {Session} from '../breach-game.ts';
import {DEFAULT_TRAINING_CONFIG,TRAINING_LAYOUTS,TRAINING_LAYOUT_LABELS,
 normalizeTrainingConfig,type TrainingConfig} from '../training/training-courses.ts';
import './breach-training.css';
type Hooks={
 onStart:(config:TrainingConfig)=>void;
 onReturnToMenu:()=>void;
 onReplay:()=>boolean;
 onResetTargets:()=>boolean;
 onArmTargetFire:()=>boolean;
};
const select=(label:string,values:readonly string[],names?:Record<string,string>)=>{
 const wrapper=document.createElement('label');wrapper.textContent=label;
 const el=document.createElement('select');el.setAttribute('aria-label',label);
 for(const value of values){const option=document.createElement('option');
  option.value=value;option.textContent=names?.[value]??value.toUpperCase();
  el.add(option);}
 wrapper.append(el);return {wrapper,el};
};
const button=(label:string,action:()=>void)=>{
 const el=document.createElement('button');el.type='button';
 el.textContent=label;el.addEventListener('click',action);return el;
};
export function createBreachTrainingScreen(hooks:Hooks){
 let config:TrainingConfig={...DEFAULT_TRAINING_CONFIG};
 let active=false,open=false,inReplay=false;
 const recorded=new WeakSet<Session>();
 let lastAssessment:TrialAssessment|null=null;
 const browserStorage=()=>{try{return localStorage;}catch{return null;}};
 const root=document.createElement('section');
 root.id='breachTrainingScreen';root.className='breach-training-screen';
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.setAttribute('aria-label','Fieldwork training setup');root.hidden=true;
 const panel=document.createElement('div');panel.className='breach-training-panel';
 const title=document.createElement('h2');title.textContent='FIELDWORK / TRAINING';
 const summary=document.createElement('p');summary.textContent=
  'Select an operator and use TARGET FIRE to place a firing order. '+
  'Only real projectile strikes score; green silhouettes are NO-SHOOT. '+
  'Practice never changes Campaign progress.';
 const options=document.createElement('div');options.className='breach-training-options';
 const activity=select('ACTIVITY',['killhouse','range','trial'],
  {killhouse:'KILLHOUSE',range:'EQUIPMENT RANGE',trial:'TACTICAL TRIALS'});
 const trials=select('TRIAL',TRIAL_IDS,
  Object.fromEntries(TRIAL_IDS.map(id=>[id,TRIALS[id].name])));
 const personalBest=document.createElement('output');
 personalBest.className='breach-training-personal-best';
 personalBest.setAttribute('role','status');personalBest.setAttribute('aria-live','polite');
 trials.wrapper.append(personalBest);
 const layout=select('COURSE',TRAINING_LAYOUTS,TRAINING_LAYOUT_LABELS);
 const squad=select('OPERATORS',['1','2','3','4']);
 const density=select('TARGETS',['none','sparse','standard','dense']);
 const doors=select('DOORS',['open','closed','mixed']);
 const lighting=select('LIGHTING',['day','evening','night','blackout','emergency']);
 for(const field of [activity,trials,layout,squad,density,doors,lighting])
  options.append(field.wrapper);
 const actions=document.createElement('div');actions.className='breach-training-actions';
 const close=()=>{
  open=false;root.hidden=true;
  document.body.classList.remove('training-setup-open');
 };
 const begin=()=>{
  const requested=normalizeTrainingConfig({
   activity:activity.el.value as TrainingConfig['activity'],
   trial:trials.el.value as NonNullable<TrainingConfig['trial']>,
   layout:layout.el.value as TrainingConfig['layout'],
   squadSize:Number(squad.el.value) as TrainingConfig['squadSize'],
   targetDensity:density.el.value as TrainingConfig['targetDensity'],
   doors:doors.el.value as TrainingConfig['doors'],
   lighting:lighting.el.value as TrainingConfig['lighting']
  });
  const next=requested.activity==='trial'?{
   ...trialConfig(requested.trial??'discrimination'),activity:'trial' as const,
   trial:requested.trial??'discrimination' as const}:requested;
  config=next;lastAssessment=null;resultsButton.hidden=true;
  resetTargetsButton.hidden=next.activity==='trial';
  close();hooks.onStart({...config});
 };
 const beginButton=button('START TRAINING',begin);
 const closeButton=button('CLOSE',close);
 actions.append(beginButton,closeButton);
 panel.append(title,summary,options,actions);
 const resultPanel=document.createElement('div');
 resultPanel.className='breach-training-panel breach-training-results';
 resultPanel.hidden=true;
 const resultTitle=document.createElement('h2');
 const resultSummary=document.createElement('p');
 const resultStats=document.createElement('div');resultStats.className='breach-training-result-stats';
 const breakdown=document.createElement('div');breakdown.className='breach-training-breakdown';
 const resultActions=document.createElement('div');
 resultActions.className='breach-training-actions';
 resultActions.append(button('RETRY COURSE',()=>{close();retry();}),
  button('WATCH REPLAY',()=>{if(hooks.onReplay())close();}),
  button('CHANGE COURSE',()=>show()),
  button('BACK TO GAME',()=>close()),
  button('MAIN MENU',()=>{close();hooks.onReturnToMenu();}));
 resultPanel.append(resultTitle,resultSummary,resultStats,breakdown,resultActions);
 root.append(panel,resultPanel);
 document.body.append(root);
 const quick=document.createElement('div');quick.id='breachTrainingQuickTools';
 quick.className='breach-training-quick';quick.hidden=true;
 const progress=document.createElement('output');
 progress.className='breach-training-progress';progress.setAttribute('aria-live','off');
 quick.append(progress);
 const resultsButton=button('RESULTS',()=>{
  if(lastAssessment)showResult(lastAssessment,false);
 });
 resultsButton.hidden=true;
 const resetTargetsButton=button('RESET TARGETS',()=>{
  if(!hooks.onResetTargets())progress.textContent=
   'CANNOT RESET TARGETS IN THIS COURSE OR WHILE OCCUPIED';
 });
 const targetFireButton=button('TARGET FIRE',()=>{
  if(hooks.onArmTargetFire()){
   progress.textContent='TARGET FIRE ARMED · TAP A PLATE, THEN GO';
  }else progress.textContent='TARGET FIRE IS AVAILABLE WHILE PLANNING';
 });
 targetFireButton.title='Place an area-fire order at a target; only physical projectile hits count';
 quick.append(button('TRAINING TOOLS',()=>show()),targetFireButton,resetTargetsButton,
  button('RETRY',()=>retry()),
  resultsButton,
  button('MAIN MENU',()=>hooks.onReturnToMenu()));
 document.body.append(quick);
 function show():void{
  for(const [field,value] of [
   [activity.el,config.activity],[trials.el,config.trial??'discrimination'],
   [layout.el,config.layout],
   [squad.el,String(config.squadSize)],[density.el,config.targetDensity],
   [doors.el,config.doors],[lighting.el,config.lighting]
  ] as const)field.value=value;
  panel.hidden=false;resultPanel.hidden=true;
  syncVisibleOptions();renderPersonalBest();
  open=true;root.hidden=false;
  document.body.classList.add('training-setup-open');
  activity.el.focus();
 }
 function retry():void{if(active){lastAssessment=null;
  resultsButton.hidden=true;hooks.onStart({...config});}}
 function renderPersonalBest():void{
  const id=trials.el.value as keyof typeof TRIALS;
  const trial=TRIALS[id];
  const storage=browserStorage();
  if(!trial||!storage){personalBest.textContent='NO RECORD ON THIS DEVICE';return;}
  try{
   const key=trainingRecordKey(trial);
   const best=loadTrainingRecords(storage).find(r=>r.key===key);
   personalBest.textContent=best?'PERSONAL BEST · '+best.grade+' · '+
    best.score+'/100 · '+best.elapsed.toFixed(1)+'s':
    'NO RECORD FOR THIS COURSE';
  }catch{personalBest.textContent='LOCAL RECORDS UNAVAILABLE';}
 }
 function syncVisibleOptions():void{
  const isRange=activity.el.value==='range';
  const isTrial=activity.el.value==='trial';
  trials.wrapper.hidden=!isTrial;
  for(const field of [layout,density,doors])
   field.wrapper.hidden=isRange||isTrial;
  squad.wrapper.hidden=isTrial;
  lighting.wrapper.hidden=isTrial;
 }
 function showResult(result:TrialAssessment,personalBest:boolean):void{
  lastAssessment=result;resultsButton.hidden=false;
  panel.hidden=true;resultPanel.hidden=false;
  open=true;root.hidden=false;
  document.body.classList.add('training-setup-open');
  resultTitle.tabIndex=-1;
  resultTitle.textContent=result.outcome==='passed'?'TRIAL COMPLETE':'TRIAL FAILED';
  resultSummary.textContent=(TRIALS[config.trial??'discrimination']?.name??'TRIAL')+
   ' · '+result.grade+' · '+result.score+' / 100'+
   (personalBest?' · NEW PERSONAL BEST':'');
  resultStats.replaceChildren();breakdown.replaceChildren();
  for(const [label,value] of [
   ['TARGETS',result.targetsHit+' / '+result.targetsTotal],
   ['NO-SHOOT HITS',String(result.noShootHits)],
   ['SHOTS',String(result.shots)],
   ['SQUAD SAFE',result.squadSurvived+' / '+result.squadSize],
   ['EXECUTION',result.elapsed.toFixed(1)+'s']]){
   const item=document.createElement('div');item.textContent=label+' · '+value;
   resultStats.append(item);
  }
  const title=document.createElement('strong');title.textContent='SCORING';
  breakdown.append(title);
  for(const component of result.components){
   const row=document.createElement('div');
   const label=document.createElement('span');label.textContent=component.name;
   const value=document.createElement('output');value.textContent=component.points+' PTS';
   row.append(label,value);breakdown.append(row);
  }
  if(result.outcome==='failed'){
   const fail=document.createElement('p');
   fail.textContent='SAFETY OR TIME FAILURE OVERRIDES PARTIAL POINTS';
   breakdown.append(fail);
  }
  resultTitle.focus();
 }
 function sync():void{
  quick.hidden=!active||inReplay;
  if(!active&&open)close();
 }
 function setActive(value:boolean){active=value;
  if(!active){lastAssessment=null;resultsButton.hidden=true;}
  resetTargetsButton.hidden=!active||config.activity==='trial';
  sync();}
 function setReplayVisible(value:boolean){
  if(inReplay===value)return;inReplay=value;sync();
 }
 function useEquipmentRange():void{
  config={...DEFAULT_TRAINING_CONFIG,activity:'range'};
  setActive(true);
 }
 function updateProgress(s:Session):void{
  if(!active||!s.site?.training)return;
  targetFireButton.disabled=s.phase!=='planning';
  const p=trainingTargetProgress(s);
  const text=p.targets?('TARGETS '+p.hits+'/'+p.targets+
   (p.noShootTargets?' · NO-SHOOT '+p.noShootHits:'')+
   ' · SHOTS '+p.shots):('FREE PRACTICE · SHOTS '+p.shots);
  if(progress.textContent!==text)progress.textContent=text;
  if(!s.site.trainingTrial||!['won','lost'].includes(s.phase)||
   recorded.has(s))return;
  recorded.add(s);
  const t=TRIALS[s.site.trainingTrial.id];
  const result=assessTrainingTrial(s,t);
  let personalBest=false;
  const storage=browserStorage();
  if(storage){
   try{personalBest=saveTrainingRecord(t,result,storage).saved;}
   catch{ /* device storage is optional */ }
  }
  showResult(result,personalBest);
  renderPersonalBest();
 }
 activity.el.addEventListener('change',syncVisibleOptions);
 trials.el.addEventListener('change',renderPersonalBest);
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close();}
 });
 return {
  show,retry,setActive,setReplayVisible,useEquipmentRange,updateProgress,
  get active(){return active;},
  get config(){return {...config};}
 };
}
