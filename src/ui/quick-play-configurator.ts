/** Primary Quick Play entry and reusable in-mission scenario creator.
 * Opening the overlay never replaces the live tactical session.
 */
import {defaultQuickPlaySettings,QUICK_PLAY_BUILDINGS,
 QUICK_PLAY_MISSIONS,QUICK_PLAY_INCIDENTS,quickPlayIncidentDefinition,
 type QuickPlaySettings,type QuickPlayIncident,
 type QuickPlaySize,type QuickPlayMission,type QuickPlayPresence,
 type QuickPlayCivilians,type QuickPlayObjectiveIntel} from '../quick-play-settings.ts';
import type {BuildingArchetype} from '../breach-site.ts';
import type {RosterState} from '../breach-roster.ts';
import {initialFieldInventory,type FieldInventory} from '../equipment-field-inventory.ts';
import {FieldInventoryUndoHistory} from '../equipment-field-undo.ts';
import {createFieldGadgetEditor} from './field-gadget-editor.ts';
import {createLoadoutSquadRail} from './loadout-squad-rail.ts';
import {CampaignKitPreview} from '../equipment-preview.ts';
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
    incident:(['random',...QUICK_PLAY_INCIDENTS] as string[]).includes(saved.incident??'')?
      saved.incident!:fallback.incident,
    presence:['random','light','typical','heavy'].includes(saved.presence??'')?
      saved.presence!:fallback.presence,
    civilians:['scenario','on','off'].includes(saved.civilians??'')?
      saved.civilians!:fallback.civilians,
    objectiveIntel:['unknown','approximate','confirmed','random'].includes(
      saved.objectiveIntel??'')?saved.objectiveIntel!:fallback.objectiveIntel
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
 onVisibilityChange?:(visible:boolean)=>void;
 getRoster?:()=>RosterState;
 onEquipField?:(id:string,inventory:FieldInventory)=>boolean;
}){
 let settings=readSettings();
 let previouslyFocused:HTMLElement|null=null;
 const backdrop=node('section','fw-quick-config-backdrop');
 backdrop.hidden=true;
 const dialog=node('main','fw-quick-config-dialog');
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-label','Quick Play mission setup');
 const header=node('header','fw-quick-config-heading');
 const identity=node('div');
 identity.append(node('small','','FIELDWORK / QUICK PLAY'),
   node('h2','','MISSION SETUP'));
 const close=command('✕ CLOSE',()=>hide(),'fw-quick-config-close');
 header.append(identity,close);
 const intro=node('p','fw-quick-config-intro',
  'Build a standalone operation. Leave options on Random for fresh scenarios.');
 const content=node('div','fw-quick-config-content');
 const seedGroup=node('label','fw-quick-config-field fw-quick-config-seed');
 seedGroup.append(node('span','','SITE SEED'));
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
 ],v=>{
   settings.mission=v as QuickPlayMission;
   const current=quickPlayIncidentDefinition(settings.incident);
   if(current&&v!=='random'&&!current.missions.some(kind=>kind===v))
     settings.incident='random';
   render();
 });
 const incident=picker('INCIDENT',[
  ['random','Random case'],
  ['warrant-service','High-Risk Warrant · Capture'],
  ['missing-person','Missing Person · Rescue'],
  ['evidence-seizure','Evidence Seizure · Intel']
 ],v=>{
  settings.incident=v as QuickPlayIncident;
  const selected=quickPlayIncidentDefinition(settings.incident);
  if(selected)settings.mission=selected.missions[0];
  render();
 });
 const presence=picker('ARMED PRESENCE',[
  ['random','Random'],['light','Light'],['typical','Typical'],
  ['heavy','Heavy']
 ],v=>{settings.presence=v as QuickPlayPresence;update();});
 const civilians=picker('AMBIENT CIVILIANS',[
  ['scenario','Scenario appropriate'],['on','Allowed where appropriate'],
  ['off','Off (rescue targets remain)']
 ],v=>{settings.civilians=v as QuickPlayCivilians;update();});
 const objectiveIntel=picker('OBJECTIVE INTELLIGENCE',[
  ['unknown','Unknown · search required'],
  ['approximate','Approximate · broad area'],
  ['confirmed','Confirmed · exact location'],
  ['random','Random · seed-determined']
 ],v=>{settings.objectiveIntel=v as QuickPlayObjectiveIntel;update();});
 const fieldGrid=node('div','fw-quick-config-grid fw-quick-config-primary');
 fieldGrid.append(incident.group,mission.group,size.group);
 const advanced=node('details','fw-quick-config-advanced');
 advanced.append(node('summary','','ADVANCED · SITE & CONDITIONS'));
 const advancedBody=node('div','fw-quick-config-advanced-content');
 const conditions=node('div','fw-quick-config-grid');
 conditions.append(presence.group,civilians.group,objectiveIntel.group);
 const buildingDisclosure=node('details','fw-quick-config-building-details');
 const buildingDisclosureSummary=node('summary','','BUILDING TYPES');
 const buildingSection=node('section','fw-quick-config-buildings');
 const buildingHeader=node('div','fw-quick-config-building-header');
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
 buildingHeader.append(buildingActions);
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
 buildingDisclosure.append(buildingDisclosureSummary,buildingSection);
 advancedBody.append(seedGroup,conditions,buildingDisclosure);
 advanced.append(advancedBody);
 const squadPrep=node('details','fw-quick-config-squad-prep');
 const squadLabel=node('summary','','SQUAD LOADOUT · PREPARE EQUIPMENT');
 const squadContent=node('div','fw-quick-config-advanced-content');
 let selectedSquadMember:string|null=null;
 const fieldUndo=new FieldInventoryUndoHistory();
 let squadPreview:CampaignKitPreview|null=null;
 let squadPreviewId:string|null=null;
 const disposeSquadPreview=()=>{
  squadPreview?.dispose();squadPreview=null;squadPreviewId=null;
 };
 const renderSquadPrep=()=>{
  if(!options.getRoster||!options.onEquipField)return;
  const members=options.getRoster().members;
  squadContent.replaceChildren();
  const selected=members.find(m=>m.id===selectedSquadMember)??members[0];
  if(!selected)return;
  selectedSquadMember=selected.id;
  squadContent.append(createLoadoutSquadRail(members.map(m=>({
   id:m.id,name:m.callsign.toUpperCase(),detail:m.weapon.toUpperCase()
  })),selected.id,id=>{selectedSquadMember=id;renderSquadPrep();}));
  const hint=node('p','fw-quick-config-intro',
   'Ready this squad before generating a mission. Changes apply to the next Quick Play operation.');
  squadContent.append(hint);
  const previewHost=node('div','fw-prep-operator-viewer fw-quick-config-operator-preview');
  previewHost.setAttribute('aria-label','Rotatable 3D Quick Play operator equipment');
  squadContent.append(previewHost);
  if(squadPreview&&squadPreviewId!==selected.id)disposeSquadPreview();
  if(!squadPreview){
   squadPreview=new CampaignKitPreview(previewHost,selected.id,selected.weapon,
    selected.appearanceSeed,selected.loadout,selected.weaponConfiguration,
    selected.magazines,selected.wardrobe,'carry');
   squadPreviewId=selected.id;
  }else{
   squadPreview.attachHost(previewHost,false);
   squadPreview.updateEquipment(selected.weapon,selected.appearanceSeed,
    selected.loadout,selected.weaponConfiguration,selected.magazines,
    selected.wardrobe);
  }
  const gadgetHost=node('div','fw-quick-config-field-gear');
  squadContent.append(gadgetHost);
  const renderGadgets=(operator:typeof selected)=>{
   const applyChange=(targetId:string,inventory:FieldInventory,undo=false)=>{
    const before=options.getRoster?.().members.find(m=>m.id===targetId);
    if(!before||!options.onEquipField?.(targetId,inventory))return false;
    const after=options.getRoster?.().members.find(m=>m.id===targetId);
    if(after){
     if(undo)fieldUndo.clear(targetId);
     else fieldUndo.record(targetId,
      before.loadout.fieldInventory??initialFieldInventory(before.loadout),
      after.loadout.fieldInventory??initialFieldInventory(after.loadout));
    }
    return true;
   };
   gadgetHost.replaceChildren(createFieldGadgetEditor({
    loadout:operator.loadout,magazines:operator.magazines,
     onInspectLocation:location=>squadPreview?.highlightCarryLocation(location),
    copyTargets:(options.getRoster?.().members??[]).filter(m=>m.id!==operator.id)
     .map(m=>({id:m.id,name:m.callsign,loadout:m.loadout,magazines:m.magazines})),
    onCopy:(targetId,inventory)=>{
     if(applyChange(targetId,inventory))renderSquadPrep();
    },
    canUndo:!!fieldUndo.peek(operator.id,
     operator.loadout.fieldInventory??initialFieldInventory(operator.loadout)),
    onUndo:()=>{
     const previous=fieldUndo.peek(operator.id,
      operator.loadout.fieldInventory??initialFieldInventory(operator.loadout));
     if(previous&&applyChange(operator.id,previous,true)){
      const changed=options.getRoster?.().members.find(m=>m.id===operator.id);
      if(changed){
        renderGadgets(changed);
        squadPreview?.updateEquipment(changed.weapon,changed.appearanceSeed,
         changed.loadout,changed.weaponConfiguration,changed.magazines,
         changed.wardrobe);
       }
     }
    },
    onCommit:inventory=>{
     const prior=document.activeElement instanceof HTMLElement?
      document.activeElement.getAttribute('aria-label'):null;
     if(!applyChange(operator.id,inventory))return;
     const changed=options.getRoster?.().members.find(m=>m.id===operator.id);
     if(!changed)return;
     renderGadgets(changed);
      squadPreview?.updateEquipment(changed.weapon,changed.appearanceSeed,
       changed.loadout,changed.weaponConfiguration,changed.magazines,
       changed.wardrobe);
     if(prior){
      const target=Array.from(gadgetHost.querySelectorAll<HTMLElement>(
       'button[aria-label],select[aria-label]')).find(el=>
        el.getAttribute('aria-label')===prior&&
        !(el as HTMLButtonElement|HTMLSelectElement).disabled);
      target?.focus({preventScroll:true});
     }
    }
   }));
  };
  renderGadgets(selected);
 };
 squadPrep.append(squadLabel,squadContent);
 squadPrep.addEventListener('toggle',()=>{
  if(squadPrep.open&&!backdrop.hidden)renderSquadPrep();
   else disposeSquadPreview();
 });
 const summary=node('p','fw-quick-config-summary');
 const error=node('p','fw-quick-config-error');error.setAttribute('role','status');
 const footer=node('footer','fw-quick-config-footer');
 const start=command('GENERATE MISSION',()=>generate(),'fw-quick-config-start');
 footer.append(command('SURPRISE ME',()=>{
   settings=defaultQuickPlaySettings();render();generate();
 }),start);
 content.append(fieldGrid,squadPrep,advanced,summary,error);
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
  buildingDisclosureSummary.textContent='ALLOWED BUILDINGS · '+count+
   ' / '+QUICK_PLAY_BUILDINGS.length+' SELECTED';
  const selectedIncident=quickPlayIncidentDefinition(settings.incident);
  const incidentBuildings=!selectedIncident?.buildings||
   settings.buildings.some(b=>selectedIncident.buildings!.includes(b));
  const incidentMission=!selectedIncident||settings.mission==='random'||
   selectedIncident.missions.includes(settings.mission);
  const validSeed=settings.seed===null||
   (Number.isInteger(settings.seed)&&settings.seed>=1&&settings.seed<=0xffffffff);
  summary.textContent=(selectedIncident?selectedIncident.name:'Random incident')+
   ' · '+(settings.mission==='random'?'Random objective':settings.mission)+
   ' · '+(settings.size==='random'?'Random size':settings.size)+
   ' · Objective intel: '+settings.objectiveIntel+
   (settings.seed===null?'':' · Seed '+settings.seed);
  if(!count||!validSeed||!incidentBuildings){
   advanced.open=true;
   if(!count||!incidentBuildings)buildingDisclosure.open=true;
  }
  start.disabled=count===0||!validSeed||!incidentBuildings||!incidentMission;
  if(!count)error.textContent='Enable at least one building type.';
  else if(!validSeed)error.textContent='Seed must be a whole number from 1 to 4294967295.';
  else if(!incidentBuildings)error.textContent=
   'This incident needs a compatible building type. Adjust allowed buildings.';
  else if(!incidentMission)error.textContent=
   'This incident requires a different mission objective.';
  for(const [kind,input] of checkInputs)
   input.checked=settings.buildings.includes(kind);
  saveSettings(settings);
 }
 function render(){
  seedInput.value=settings.seed===null?'':String(settings.seed);
  size.select.value=settings.size;mission.select.value=settings.mission;
  incident.select.value=settings.incident;
  presence.select.value=settings.presence;
  civilians.select.value=settings.civilians;
  objectiveIntel.select.value=settings.objectiveIntel;update();
 }
 function hide(returnFocus=true){
   disposeSquadPreview();
  backdrop.hidden=true;
  options.onVisibilityChange?.(false);
  if(returnFocus&&previouslyFocused?.isConnected&&!previouslyFocused.hidden)
   previouslyFocused.focus({preventScroll:true});
  previouslyFocused=null;
 }
 function generate(){
  update();if(start.disabled)return;
  const recipe:QuickPlaySettings={...settings,buildings:[...settings.buildings]};
  hide(false);options.onGenerate(recipe);
 }
 render();
 return {
  open(){previouslyFocused=document.activeElement instanceof HTMLElement?
     document.activeElement:null;backdrop.hidden=false;
     if(squadPrep.open)renderSquadPrep();
     options.onVisibilityChange?.(true);close.focus();},
  close:hide,
  get isOpen(){return !backdrop.hidden;},
  getSettings:()=>({...settings,buildings:[...settings.buildings]})
 };
}
