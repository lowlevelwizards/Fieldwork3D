/** Player-facing training entry and quick tools. The mission and runtime
 * controllers still exclusively own Session creation and simulation. */
import {trainingTargetProgress} from '../training/training-targets.ts';
import type {Session} from '../breach-game.ts';
import {DEFAULT_TRAINING_CONFIG,TRAINING_LAYOUTS,TRAINING_LAYOUT_LABELS,
 normalizeTrainingConfig,type TrainingConfig} from '../training/training-courses.ts';
import './breach-training.css';
type Hooks={
 onStart:(config:TrainingConfig)=>void;
 onReturnToMenu:()=>void;
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
 let active=false,open=false;
 const root=document.createElement('section');
 root.id='breachTrainingScreen';root.className='breach-training-screen';
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.setAttribute('aria-label','Fieldwork training setup');root.hidden=true;
 const panel=document.createElement('div');panel.className='breach-training-panel';
 const title=document.createElement('h2');title.textContent='FIELDWORK / TRAINING';
 const summary=document.createElement('p');summary.textContent=
  'Use the actual tactical simulation. Practice runs never change campaign progress.';
 const options=document.createElement('div');options.className='breach-training-options';
 const activity=select('ACTIVITY',['killhouse','range'],
  {killhouse:'KILLHOUSE',range:'EQUIPMENT RANGE'});
 const layout=select('COURSE',TRAINING_LAYOUTS,TRAINING_LAYOUT_LABELS);
 const squad=select('OPERATORS',['1','2','3','4']);
 const density=select('TARGETS',['none','sparse','standard','dense']);
 const doors=select('DOORS',['open','closed','mixed']);
 const lighting=select('LIGHTING',['day','evening','night','blackout','emergency']);
 for(const field of [activity,layout,squad,density,doors,lighting])
  options.append(field.wrapper);
 const actions=document.createElement('div');actions.className='breach-training-actions';
 const close=()=>{
  open=false;root.hidden=true;
  document.body.classList.remove('training-setup-open');
 };
 const begin=()=>{
  const next=normalizeTrainingConfig({
   activity:activity.el.value as TrainingConfig['activity'],
   layout:layout.el.value as TrainingConfig['layout'],
   squadSize:Number(squad.el.value) as TrainingConfig['squadSize'],
   targetDensity:density.el.value as TrainingConfig['targetDensity'],
   doors:doors.el.value as TrainingConfig['doors'],
   lighting:lighting.el.value as TrainingConfig['lighting']
  });
  config=next;close();hooks.onStart({...config});
 };
 const beginButton=button('START TRAINING',begin);
 const closeButton=button('CLOSE',close);
 actions.append(beginButton,closeButton);
 panel.append(title,summary,options,actions);root.append(panel);
 document.body.append(root);
 const quick=document.createElement('div');quick.id='breachTrainingQuickTools';
 quick.className='breach-training-quick';quick.hidden=true;
 const progress=document.createElement('output');
 progress.className='breach-training-progress';progress.setAttribute('aria-live','off');
 quick.append(progress);
 quick.append(button('TRAINING TOOLS',()=>show()),button('RETRY',()=>retry()),
  button('MAIN MENU',()=>hooks.onReturnToMenu()));
 document.body.append(quick);
 function show():void{
  for(const [field,value] of [
   [activity.el,config.activity],[layout.el,config.layout],
   [squad.el,String(config.squadSize)],[density.el,config.targetDensity],
   [doors.el,config.doors],[lighting.el,config.lighting]
  ] as const)field.value=value;
  const isRange=config.activity==='range';
  layout.wrapper.hidden=isRange;density.wrapper.hidden=isRange;
  doors.wrapper.hidden=isRange;
  open=true;root.hidden=false;
  document.body.classList.add('training-setup-open');
  activity.el.focus();
 }
 function retry():void{if(active)hooks.onStart({...config});}
 function sync():void{
  quick.hidden=!active;
  if(!active&&open)close();
 }
 function setActive(value:boolean){active=value;sync();}
 function updateProgress(s:Session):void{
  if(!active||!s.site?.training)return;
  const p=trainingTargetProgress(s);
  const text=p.targets?('TARGETS '+p.hits+'/'+p.targets+
   ' · SHOTS '+p.shots):('FREE PRACTICE · SHOTS '+p.shots);
  if(progress.textContent!==text)progress.textContent=text;
 }
 activity.el.addEventListener('change',()=>{
  const isRange=activity.el.value==='range';
  layout.wrapper.hidden=isRange;density.wrapper.hidden=isRange;
  doors.wrapper.hidden=isRange;
 });
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close();}
 });
 return {
  show,retry,setActive,updateProgress,
  get active(){return active;},
  get config(){return {...config};}
 };
}
