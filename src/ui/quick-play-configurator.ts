/** Optional, mobile-first Quick Play generator screen.
 * The landing page's one-tap QUICK PLAY remains the primary entry.
 */
import {defaultQuickPlaySettings,QUICK_PLAY_BUILDINGS,
 QUICK_PLAY_MISSIONS,type QuickPlaySettings,
 type QuickPlaySize,type QuickPlayMission,type QuickPlayPresence,
 type QuickPlayCivilians} from '../quick-play-settings.ts';
import type {BuildingArchetype} from '../breach-site.ts';
import './quick-play-configurator.css';

const STORAGE_KEY='fieldwork.quickplay.generator.v1';
function readSettings():QuickPlaySettings{
 const fallback=defaultQuickPlaySettings();
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)??'null') as
    Partial<QuickPlaySettings>|null;
  if(!saved)return fallback;
  const buildings=QUICK_PLAY_BUILDINGS.filter(b=>
    Array.isArray(saved.buildings)&&saved.buildings.includes(b));
  return {
    seed:saved.seed===null||saved.seed===undefined?null:
      Number.isInteger(saved.seed)&&saved.seed>=1&&saved.seed<=0xffffffff?
        saved.seed:null,
    size:['random','small','medium','large'].includes(saved.size??'')?
      saved.size!:fallback.size,
    buildings,
    mission:(['random',...QUICK_PLAY_MISSIONS] as string[]).includes(saved.mission??'')?
      saved.mission!:fallback.mission,
    presence:['random','light','typical','heavy'].includes(saved.presence??'')?
      saved.presence!:fallback.presence,
    civilians:['scenario','on','off'].includes(saved.civilians??'')?
      saved.civilians!:fallback.civilians
  };
 }catch{return fallback;}
}
function saveSettings(settings:QuickPlaySettings){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}
 catch{/* Optional local persistence; private browsing remains supported. */}
}
function node<K extends keyof HTMLElementTagNameMap>(
 tag:K,cls='',label=''
):HTMLElementTagNameMap[K]{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(label)element.textContent=label;
 return element;
}
function command(text:string,onClick:()=>void,cls=''){
 const button=node('button',cls,text);button.type='button';
 button.addEventListener('click',onClick);return button;
}
function picker(title:string,values:readonly [string,string][],
 onChange:(value:string)=>void){
 const group=node('label','fw-quick-config-field');
 group.append(node('span','',title));
 const select=node('select');
 for(const [value,label] of values){
  const option=node('option','',label);option.value=value;select.append(option);
 }
 select.addEventListener('change',()=>onChange(select.value));
 group.append(select);return {group,select};
}
export function createQuickPlayConfigurator(options:{
 randomSeed:()=>number;
 onGenerate:(settings:QuickPlaySettings)=>void;
}){
 let settings=readSettings();
 let previouslyFocused:HTMLElement|null=null;
 const backdrop=node('section','fw-quick-config-backdrop');
 backdrop.hidden=true;
 const dialog=node('main','fw-quick-config-dialog');
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-label','Quick Play scenario generator');
 const header=node('header','fw-quick-config-heading');
 const identity=node('div');
 identity.append(node('small','','FIELDWORK / TACTICAL SCENARIOS'),
   node('h2','','QUICK PLAY'));
 const close=command('✕ CLOSE',()=>hide(),'fw-quick-config-close');
 header.append(identity,close);
 const intro=node('p','fw-quick-config-intro',
  'Choose only what matters. Random keeps the unknowns; the same seed and settings recreate the scenario.');
 const content=node('div','fw-quick-config-content');
 const seedGroup=node('label','fw-quick-config-field fw-quick-config-seed');
 seedGroup.append(node('span','','SCENARIO SEED'));
 const seedRow=node('div','fw-quick-config-seed-row');
 const seedInput=node('input');seedInput.type='number';seedInput.min='1';
 seedInput.max='4294967295';seedInput.step='1';seedInput.placeholder='RANDOM';
 seedInput.setAttribute('aria-label','Seed, blank for random');
 const dice=command('RANDOM',()=>{settings.seed=null;seedInput.value='';update();});
 seedRow.append(seedInput,dice);seedGroup.append(seedRow);
 seedInput.addEventListener('input',()=>{
  settings.seed=seedInput.value===''?null:Number(seedInput.value);
  update();
 });
 const size=picker('BUILDING SIZE',[
  ['random','Random'],['small','Small'],['medium','Medium'],['large','Large']
 ],v=>{settings.size=v as QuickPlaySize;update();});
 const mission=picker('MISSION OBJECTIVE',[
  ['random','Random'],['clear','Clear'],['intel','Gather intel'],
  ['rescue','Rescue'],['hold','Hold'],['capture','Capture']
 ],v=>{settings.mission=v as QuickPlayMission;update();});
 const presence=picker('ARMED PRESENCE',[
  ['random','Random'],['light','Light'],['typical','Typical'],
  ['heavy','Heavy']
 ],v=>{settings.presence=v as QuickPlayPresence;update();});
 const civilians=picker('AMBIENT CIVILIANS',[
  ['scenario','Scenario appropriate'],['on','Allowed where appropriate'],
  ['off','Off (rescue targets remain)']
 ],v=>{settings.civilians=v as QuickPlayCivilians;update();});
 const fieldGrid=node('div','fw-quick-config-grid');
 fieldGrid.append(size.group,mission.group,presence.group,civilians.group);
 const buildingSection=node('section','fw-quick-config-buildings');
 const buildingHeader=node('div','fw-quick-config-building-header');
 const buildingHeading=node('strong','','ALLOWED BUILDINGS');
 const buildingActions=node('div','fw-quick-config-building-actions');
 const checks=node('div','fw-quick-config-checks');
 const checkInputs=new Map<BuildingArchetype,HTMLInputElement>();
 function chooseBuildings(value:BuildingArchetype[]){
  settings.buildings=[...value];update();
 }
 buildingActions.append(
  command('ALL',()=>chooseBuildings([...QUICK_PLAY_BUILDINGS])),
  command('NONE',()=>chooseBuildings([])),
  command('RANDOM SET',()=>{
   const seed=options.randomSeed();
   const enabled=QUICK_PLAY_BUILDINGS.filter((_,i)=>
     (Math.imul(seed^(i+11),0x9e3779b1)>>>0)%3!==0);
   chooseBuildings(enabled.length?enabled:[QUICK_PLAY_BUILDINGS[seed%QUICK_PLAY_BUILDINGS.length]]);
  })
 );
 buildingHeader.append(buildingHeading,buildingActions);
 for(const kind of QUICK_PLAY_BUILDINGS){
  const label=node('label','fw-quick-config-building');
  const checkbox=node('input');checkbox.type='checkbox';checkbox.value=kind;
  checkbox.addEventListener('change',()=>{
   const enabled=new Set(settings.buildings);
   if(checkbox.checked)enabled.add(kind);else enabled.delete(kind);
   chooseBuildings([...enabled]);
  });
  checkInputs.set(kind,checkbox);
  label.append(checkbox,node('span','',kind.toUpperCase()));
  checks.append(label);
 }
 buildingSection.append(buildingHeader,checks);
 const summary=node('p','fw-quick-config-summary');
 const error=node('p','fw-quick-config-error');error.setAttribute('role','status');
 const footer=node('footer','fw-quick-config-footer');
 const start=command('GENERATE MISSION',()=>generate(),'fw-quick-config-start');
 footer.append(command('SURPRISE ME',()=>{
   settings=defaultQuickPlaySettings();render();generate();
 }),start);
 content.append(seedGroup,fieldGrid,buildingSection,summary,error);
 dialog.append(header,intro,content,footer);
 backdrop.append(dialog);document.body.append(backdrop);
 backdrop.addEventListener('click',e=>{
  if(e.target===backdrop)hide();
 });
 backdrop.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();hide();}
  // Keep keyboard navigation inside the modal.
  if(e.key==='Tab'){
   const items=[...dialog.querySelectorAll<HTMLElement>(
    'button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
   const first=items[0],last=items.at(-1);
   if(e.shiftKey&&document.activeElement===first){
    e.preventDefault();last?.focus();
   }else if(!e.shiftKey&&document.activeElement===last){
    e.preventDefault();first?.focus();
   }
  }
 });
 function update(){
  error.textContent='';
  const count=settings.buildings.length;
  const validSeed=settings.seed===null||
   (Number.isInteger(settings.seed)&&settings.seed>=1&&settings.seed<=0xffffffff);
  summary.textContent=count+' building types enabled · '+
   (settings.size==='random'?'Random size':settings.size)+
   ' · '+(settings.mission==='random'?'Random objective':settings.mission)+
   ' · '+(settings.seed===null?'Fresh seed each launch':'Seed '+settings.seed);
  start.disabled=count===0||!validSeed;
  if(!count)error.textContent='Enable at least one building type.';
  else if(!validSeed)error.textContent='Seed must be a whole number from 1 to 4294967295.';
  for(const [kind,input] of checkInputs)
   input.checked=settings.buildings.includes(kind);
  saveSettings(settings);
 }
 function render(){
  seedInput.value=settings.seed===null?'':String(settings.seed);
  size.select.value=settings.size;mission.select.value=settings.mission;
  presence.select.value=settings.presence;
  civilians.select.value=settings.civilians;update();
 }
 function hide(){
  backdrop.hidden=true;
  previouslyFocused?.focus();previouslyFocused=null;
 }
 function generate(){
  update();if(start.disabled)return;
  const recipe:QuickPlaySettings={...settings,buildings:[...settings.buildings]};
  hide();options.onGenerate(recipe);
 }
 render();
 return {
  open(){previouslyFocused=document.activeElement instanceof HTMLElement?
     document.activeElement:null;backdrop.hidden=false;close.focus();},
  close:hide,
  getSettings:()=>({...settings,buildings:[...settings.buildings]})
 };
}
