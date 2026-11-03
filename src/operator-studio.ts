/** Operator Studio: contextual appearance editing, not the animation workbench.
 * The hosting game owns authoritative roster/campaign writes. Standalone mode
 * uses the same validated roster persistence for previews and direct access.
 */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {OperatorAppearanceGrid,APPEARANCE_GROUP_LABELS} from './operator-appearance-grid.ts';
import {readRoster,initialRoster,setRosterWardrobe,
 freshQuickPlayRoster,serializeQuickPlayCosmetics} from './breach-roster.ts';
import {readCampaign,setCampaignWardrobe} from './campaign-state.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {readWardrobe,initialWardrobe,resolvedWardrobe,setWardrobeStyle,
 setWardrobeFabricSolid,setWardrobeFabricCamo,rerollWardrobeFabricCamo,
 sleeveStateOptions,trouserHemOptions,
 type WardrobeOptions,type WardrobeSlot} from './operator-wardrobe-data.ts';
import {fabricCamoChoices,type FabricCamoChannel} from './operator-fabric-camo-policy.ts';
import {GARMENT_SOLID_COLORS,solidChoicesFor,resolvedCuffSolid,
 type GarmentSolidId} from './operator-garment-color-policy.ts';
import {headwearColorChoices,HEADWEAR_SOLID_COLORS} from './operator-headwear-colors.ts';
import {headwearCamoChoices,headwearCamoPixels,headwearCamoSize,
 HEADWEAR_CAMO_RECIPES,
 nextHeadwearCamoRoll,type HeadwearCamoId} from './operator-headwear-camo.ts';
import {topColorwayChoices,resolvedTopColorway} from './operator-upper-colorways.ts';
import './operator-appearance-grid.css';

type StudioMode='quick'|'campaign';
type StudioPerson={id:string;callsign:string;appearanceSeed:number;
 loadout:EquipmentLoadout;wardrobe:WardrobeOptions};
type StudioInit={type:'fw-studio-init';mode:StudioMode;
 selected:string;members:StudioPerson[];readonly:boolean};
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const params=new URLSearchParams(location.search);
const embedded=params.get('embedded')==='1'&&window.parent!==window;
let mode:StudioMode=params.get('mode')==='campaign'?'campaign':'quick';
let selected=params.get('operator')??'rook';
let readOnly=false;
let people:StudioPerson[]=[];
let activeCategory:WardrobeSlot='top';
let rig:OperatorRig|null=null;
const history=new Map<string,WardrobeOptions[]>();
const edits=new Map<string,WardrobeOptions>();
const dirty=new Set<string>();
const status=$<HTMLOutputElement>('studioStatus');
const canvas=$<HTMLCanvasElement>('studioCanvas');
const stage=canvas.parentElement!;
const materialRoot=$<HTMLElement>('studioMaterials');
const applyButton=$<HTMLButtonElement>('studioApply');
const modelSelector=$<HTMLSelectElement>('studioOperator');
const undoButton=$<HTMLButtonElement>('studioUndo');
const categories=$<HTMLElement>('studioCategories');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setClearColor(0xc4c7bd);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xc4c7bd);
scene.add(new THREE.HemisphereLight(0xffffff,0x798a7f,2.0));
const key=new THREE.DirectionalLight(0xfff2d6,2.8);
key.position.set(25,65,-40);scene.add(key);
const fill=new THREE.DirectionalLight(0xaec5c2,1.0);
fill.position.set(-35,23,30);scene.add(fill);
const floor=new THREE.GridHelper(160,16,0x9fa69d,0xb1b6ae);
floor.position.y=-.2;scene.add(floor);
const camera=new THREE.OrthographicCamera(-22,22,30,-30,.1,600);
camera.position.set(65,53,-68);
const controls=new OrbitControls(camera,canvas);
controls.enablePan=false;controls.enableDamping=false;
controls.minZoom=.7;controls.maxZoom=2.8;
controls.target.set(0,23,0);controls.update();
const thumbBrowser=new OperatorAppearanceGrid(
 $('studioItemBrowser'),renderer,(slot,id)=>chooseStyle(slot,id),
 (slot,id)=>canEquip(slot,id));
const member=()=>people.find(p=>p.id===selected);
const current=()=>edits.get(selected)??member()?.wardrobe??initialWardrobe();
const say=(message:string)=>{status.textContent=message;};
function resize(){
 const rect=stage.getBoundingClientRect();
 const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
 renderer.setSize(w,h,false);
 const half=30,aspect=w/h;
 camera.left=-half*aspect;camera.right=half*aspect;
 camera.top=half;camera.bottom=-half;
 camera.updateProjectionMatrix();
 renderScene();
}
function renderScene(){renderer.setRenderTarget(null);renderer.render(scene,camera);}
controls.addEventListener('change',renderScene);
new ResizeObserver(resize).observe(stage);
function frameView(view:'front'|'side'|'back'|'fit'){
 const center=new THREE.Vector3(0,23,0);
 controls.target.copy(center);
 const distance=view==='fit'?78:82;
 camera.position.copy(center).add(new THREE.Vector3(
  view==='side'?distance:view==='fit'?51:0,
  view==='fit'?35:17,
  view==='back'?distance:view==='side'?0:view==='fit'?-51:-distance));
 if(view==='fit')camera.zoom=1; 
 camera.updateProjectionMatrix();
 controls.update();renderScene();
}
document.querySelectorAll<HTMLButtonElement>('[data-studio-view]').forEach(button=>
 button.addEventListener('click',()=>frameView(
  button.dataset.studioView as 'front'|'side'|'back'|'fit')));
function posePreview(){
 const p=member();if(!p)return;
 if(!rig||rig.camoIdentity!==p.id){
  if(rig){scene.remove(rig.root);rig.dispose();}
  rig=createOperatorRig(p.id,'blue');
  scene.add(rig.root);
 }
 poseOperator(rig,{
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  unarmedPreview:true,equipment:p.loadout,wardrobe:current()
 },0);
 renderScene();
}
function canEquip(slot:WardrobeSlot,id:string){
 const p=member();
 return !!p&&resolvedWardrobe(setWardrobeStyle(current(),slot,id),p.loadout)[slot]===id;
}
function changeWardrobe(next:WardrobeOptions){
 if(readOnly){say('Appearance is locked during an active campaign operation');return;}
 if(JSON.stringify(next)===JSON.stringify(current()))return;
 history.set(selected,[...(history.get(selected)??[]).slice(-24),readWardrobe(current())]);
 edits.set(selected,readWardrobe(next));dirty.add(selected);
 say('UNSAVED APPEARANCE');
 refresh();
}
function chooseStyle(slot:WardrobeSlot,id:string){
 if(!canEquip(slot,id)){say('This item requires a different equipped kit');return;}
 changeWardrobe(setWardrobeStyle(current(),slot,id));
}
function undo(){
 const stack=history.get(selected)??[],last=stack.pop();
 if(!last)return;
 history.set(selected,stack);edits.set(selected,last);dirty.add(selected);
 say('RESTORED PREVIOUS APPEARANCE');refresh();
}
undoButton.addEventListener('click',undo);
function row(label:string,help?:string){
 const g=document.createElement('div');g.className='material-group';
 const heading=document.createElement('div');heading.className='material-heading';
 const title=document.createElement('label');title.textContent=label;heading.append(title);
 g.append(heading);if(help){const small=document.createElement('small');small.textContent=help;g.append(small);}
 materialRoot.append(g);return g;
}
function makeButton(text:string,active:boolean,action:()=>void){
 const b=document.createElement('button');b.type='button';b.textContent=text;
 b.setAttribute('aria-pressed',String(active));b.disabled=readOnly;
 b.addEventListener('click',action);return b;
}
function addSolidSwatches(target:HTMLElement,values:readonly GarmentSolidId[],
 active:GarmentSolidId|null,choose:(id:GarmentSolidId)=>void){
 const grid=document.createElement('div');grid.className='solid-swatches';
 for(const id of values){
  const info=GARMENT_SOLID_COLORS[id];
  const b=makeButton(info.label,active===id,()=>choose(id));
  b.className='swatch';b.title=info.label;
  const chip=document.createElement('span');chip.className='swatch-chip';
  chip.style.backgroundColor='#'+info.hex.toString(16).padStart(6,'0');
  b.prepend(chip);grid.append(b);
 }
 target.append(grid);
}
function addCamoSwatches(target:HTMLElement,ids:readonly HeadwearCamoId[],
 active:HeadwearCamoId|null,choose:(id:HeadwearCamoId)=>void){
 const search=document.createElement('input');search.type='search';
 search.placeholder='Search compatible patterns';
 search.setAttribute('aria-label','Search camouflage patterns');target.append(search);
 const grid=document.createElement('div');grid.className='camo-swatches';
 target.append(grid);
 const paint=()=>{
  grid.replaceChildren();
  const q=search.value.trim().toLowerCase();
  for(const id of ids){
   if(q&&!((HEADWEAR_CAMO_RECIPES[id].label+' '+id).toLowerCase().includes(q)))continue;
   const b=makeButton(HEADWEAR_CAMO_RECIPES[id].label,active===id,()=>choose(id));
   b.className='swatch';
   const canvas=document.createElement('canvas'),size=headwearCamoSize(id);
   canvas.width=canvas.height=size;
   const ctx=canvas.getContext('2d');
   if(ctx){const image=ctx.createImageData(size,size);
    image.data.set(headwearCamoPixels(id));ctx.putImageData(image,0,0);}
   b.prepend(canvas);grid.append(b);
  }
  if(!grid.children.length){const small=document.createElement('small');
   small.textContent='No compatible print matches';grid.append(small);}
 };
 search.addEventListener('input',paint);paint();
}
function renderCuff(){
 const w=current(),printed=w.fabricCamo?.top;
 const fallback:GarmentSolidId='olive-drab';
 const resolved=resolvedCuffSolid({
  print:printed??null,solid:w.fabricSolids?.top??null,
  override:w.cuffSolid??null,fallback});
 const section=row('CUFF / ROLLED FABRIC','AUTO follows the selected print family (woodland → green, arid → tan).');
 const actions=document.createElement('div');actions.className='material-row';
 actions.append(makeButton('AUTO · '+GARMENT_SOLID_COLORS[resolved].label,
  !w.cuffSolid,()=>changeWardrobe({...w,cuffSolid:undefined})));
 section.append(actions);
 addSolidSwatches(section,solidChoicesFor('top').filter(x=>x!=='off-white'),
  w.cuffSolid??null,(id)=>changeWardrobe({...current(),cuffSolid:id}));
}
function addSelect(section:HTMLElement,options:readonly (readonly [string,string])[],
 active:string,onChange:(value:string)=>void){
 const select=document.createElement('select');select.disabled=readOnly;
 for(const [id,title] of options){const option=document.createElement('option');
  option.value=id;option.textContent=title;select.append(option);}
 select.value=active;
 select.addEventListener('change',()=>onChange(select.value));
 section.append(select);
}
function renderMaterials(){
 materialRoot.replaceChildren();
 const p=member();if(!p)return;
 const w=current(),outfit=resolvedWardrobe(w,p.loadout);
 const item=outfit[activeCategory];
 const channel:FabricCamoChannel|null=
  activeCategory==='top'?'top':activeCategory==='trousers'?'trousers':
  activeCategory==='armorStyle'?'armor':
  activeCategory==='rigStyle'||activeCategory==='beltStyle'?'gear':
  activeCategory==='packStyle'?'pack':null;
 if(channel){
  const choices=fabricCamoChoices(channel,outfit);
  const pattern=w.fabricCamo?.[channel]??null;
  const group=row('FABRIC MATERIAL','Select a solid or an approved print. Printed material never changes its original artwork.');
  const tabs=document.createElement('div');tabs.className='material-tabs';
  const solidSelected=!pattern;
  tabs.append(makeButton('SOLID',solidSelected,()=>{
   const id=w.fabricSolids?.[channel]??'olive-drab';
   changeWardrobe(setWardrobeFabricSolid(current(),channel,id));
  }));
  tabs.append(makeButton('CAMOUFLAGE',!!pattern,()=>{
   if(choices.length&&!pattern)changeWardrobe(setWardrobeFabricCamo(current(),
    channel,choices[0],outfit));
  }));
  group.append(tabs);
  if(pattern&&choices.length){
   addCamoSwatches(group,choices,pattern,id=>
    changeWardrobe(setWardrobeFabricCamo(current(),channel,id,outfit)));
   const actions=document.createElement('div');actions.className='material-row';
   actions.append(makeButton('↻ REROLL PATTERN',false,()=>
    changeWardrobe(rerollWardrobeFabricCamo(current(),channel,outfit))));
   group.append(actions);
  }else{
   addSolidSwatches(group,solidChoicesFor(channel),
    w.fabricSolids?.[channel]??null,id=>
     changeWardrobe(setWardrobeFabricSolid(current(),channel,id)));
  }
 }
 if(activeCategory==='headwear'){
  const solids=headwearColorChoices(item==='high-cut-rails'?'high-cut':item);
  const prints=headwearCamoChoices(item);
  const group=row('HEADGEAR FINISH','Select an appropriate solid shell/fabric or approved cover print.');
  if(solids.length){
   const grid=document.createElement('div');grid.className='solid-swatches';
   for(const id of solids){
    const info=HEADWEAR_SOLID_COLORS[id];
    const b=makeButton(info.label,!w.headwearCamo&&
     (w.headwearColor??solids[0])===id,()=>changeWardrobe({
      ...current(),headwearColor:id,headwearCamo:undefined}));
    b.className='swatch';const chip=document.createElement('span');
    chip.className='swatch-chip';
    chip.style.backgroundColor='#'+info.hex.toString(16).padStart(6,'0');
    b.prepend(chip);grid.append(b);
   }group.append(grid);
  }
  if(prints.length){
   const printRow=row('COMPATIBLE HEADGEAR PRINTS');
   addCamoSwatches(printRow,prints,w.headwearCamo??null,id=>
    changeWardrobe({...current(),headwearCamo:id,headwearCamoRoll:
      w.headwearCamo===id?nextHeadwearCamoRoll(w.headwearCamoRoll):0}));
  }
 }
 if(activeCategory==='top'){
  const special=topColorwayChoices(item);
  if(special.length){
   const section=row(item==='combat-shirt'?'KNIT TORSO COLOR':'GARMENT COLORWAY');
   addSelect(section,special,resolvedTopColorway(item,w.topColorway),
    value=>changeWardrobe({...current(),topColorway:value}));
  }
  if(item==='combat-shirt'){
   const section=row('KNITTED BODY / COLLAR COLOR');
   addSolidSwatches(section,solidChoicesFor('top').filter(x=>
    ['olive-drab','ranger-green','foliage','khaki','sand','coyote','brown','charcoal','black'].includes(x)),
    w.knitSolid??null,id=>changeWardrobe({...current(),knitSolid:id}));
   const reset=document.createElement('div');reset.className='material-row';
   reset.append(makeButton('FOLLOW STANDARD KNIT',!w.knitSolid,()=>
    changeWardrobe({...current(),knitSolid:undefined})));section.append(reset);
  }
  if(['bdu-shirt','acu-shirt','combat-shirt','smock-jacket','gorka-jacket'].includes(item))
   renderCuff();
  const sleeves=sleeveStateOptions(item);
  if(sleeves.length>1){
   const section=row('SLEEVE FINISH');
   addSelect(section,sleeves.map(id=>[id,id==='unrolled'?'FULL LENGTH':
    id==='cuffed'?'WRIST CUFF':'ROLLED ABOVE ELBOW']),
    w.sleeveState,value=>changeWardrobe({...current(),sleeveState:
     value as WardrobeOptions['sleeveState']}));
  }
 }
 if(activeCategory==='trousers'){
  const section=row('TROUSER HEM');
  const options=trouserHemOptions(item);
  addSelect(section,options.map(x=>[x,x.toUpperCase()]),w.trouserHem,
   value=>changeWardrobe({...current(),trouserHem:
    value as WardrobeOptions['trouserHem']}));
 }
 if(!materialRoot.children.length){
  const hint=document.createElement('small');hint.textContent=
   'This item has no additional appearance material controls.';materialRoot.append(hint);
 }
}
const categoryRows:readonly (readonly [WardrobeSlot,string])[]=[
 ['headwear','HEAD'],['top','TOPS'],['trousers','LEGS'],
 ['armorStyle','ARMOR'],['rigStyle','RIG'],['beltStyle','BELT'],
 ['packStyle','PACK'],['footwear','BOOTS'],['facewear','FACE'],
 ['eyewear','EYES'],['headset','COMMS'],['gloves','GLOVES'],
 ['knees','KNEES'],['wrist','EXTRAS']];
function renderCategories(){
 categories.replaceChildren();
 for(const [slot,label] of categoryRows){
  const button=makeButton(label,slot===activeCategory,()=>{
   activeCategory=slot;refresh();
  });
  button.setAttribute('aria-label','Customize '+APPEARANCE_GROUP_LABELS[slot]);
  categories.append(button);
 }
}
function refresh(){
 const p=member();if(!p)return;
 $('studioTitle').textContent=APPEARANCE_GROUP_LABELS[activeCategory]+' / '+p.callsign;
 $('studioSubheading').textContent=readOnly?'LOCKED DURING ACTIVE OPERATION':
  'Select a 3D item, then edit materials and details';
 applyButton.disabled=readOnly||!dirty.has(selected);
 applyButton.textContent=dirty.has(selected)?'SAVE LOOK':'SAVED';
 undoButton.disabled=readOnly||!(history.get(selected)?.length);
 renderCategories();
 thumbBrowser.setCategory(activeCategory);
 thumbBrowser.refresh(p.loadout,current());
 renderMaterials();posePreview();
}
function populate(){
 modelSelector.replaceChildren();
 for(const p of people){
  const option=document.createElement('option');option.value=p.id;
  option.textContent=p.callsign.toUpperCase();modelSelector.append(option);
 }
 if(!people.some(p=>p.id===selected))selected=people[0]?.id??'';
 modelSelector.value=selected;refresh();
}
function start(data:{mode:StudioMode;selected:string;members:StudioPerson[];readonly:boolean}){
 mode=data.mode;selected=data.selected;readOnly=data.readonly;
 people=data.members.map(p=>({...p,wardrobe:readWardrobe(p.wardrobe)}));
 history.clear();edits.clear();dirty.clear();
 populate();
 say(readOnly?'Active operation: appearance editing locked':
  mode==='campaign'?'CAMPAIGN · SAVE PERSISTENT APPEARANCE':
   'QUICK PLAY · COSMETICS PERSIST / COMBAT GEAR DOES NOT');
 resize();
}
modelSelector.addEventListener('change',()=>{selected=modelSelector.value;refresh();});
function apply(){
 const p=member();if(!p||readOnly||!dirty.has(selected))return;
 if(embedded){
  window.parent.postMessage({type:'fw-studio-commit',id:p.id,
   wardrobe:readWardrobe(current())},location.origin);
  say('SAVING APPEARANCE…');
  return;
 }
 try{
  if(mode==='quick'){
   const raw=localStorage.getItem('fieldwork3d.quickplay-cosmetics.v1');
   const saved=freshQuickPlayRoster(readRoster(raw));
   const next=setRosterWardrobe(saved,p.id,current());
   localStorage.setItem('fieldwork3d.quickplay-cosmetics.v1',
    serializeQuickPlayCosmetics(next));
  }else{
   const campaign=readCampaign(localStorage.getItem('fieldwork3d.campaign.v1'));
   if(!campaign||campaign.activeContractId){say('CAMPAIGN APPEARANCE LOCKED');return;}
   const updated=setCampaignWardrobe(campaign,p.id,current());
   localStorage.setItem('fieldwork3d.campaign.v1',JSON.stringify(updated));
  }
  p.wardrobe=readWardrobe(current());dirty.delete(p.id);history.delete(p.id);
  say('SAVED · RETURN TO GAME');refresh();
 }catch{say('COULD NOT SAVE · STORAGE UNAVAILABLE');}
}
applyButton.addEventListener('click',apply);
function close(){
 if(dirty.size&&!window.confirm('Discard unsaved appearance changes?'))return;
 if(embedded)window.parent.postMessage({type:'fw-studio-close'},location.origin);
 else if(window.history.length>1)window.history.back();
 else location.href='./index.html';
}
$('studioBack').addEventListener('click',close);
if(embedded){
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent)return;
  const data=event.data as StudioInit|{type:string;id?:string;ok?:boolean};
  if(data?.type==='fw-studio-init'){
   const init=data as StudioInit;
   start({mode:init.mode,selected:init.selected,
    members:init.members,readonly:init.readonly});
  }else if(data?.type==='fw-studio-saved'&&data.id){
   if(data.ok){
    const p=people.find(x=>x.id===data.id);
    if(p)p.wardrobe=readWardrobe(edits.get(p.id)??p.wardrobe);
    dirty.delete(data.id);history.delete(data.id);
    say('APPLIED · SAVED TO '+(mode==='campaign'?'CAMPAIGN':'QUICK PLAY'));refresh();
   }else say('SAVE REJECTED · OPERATOR OR MISSION IS LOCKED');
  }
 });
 window.parent.postMessage({type:'fw-studio-ready'},location.origin);
}else{
 try{
  const campaign=mode==='campaign'?
   readCampaign(localStorage.getItem('fieldwork3d.campaign.v1')):null;
  if(mode==='campaign'&&campaign){
   start({mode,selected,readonly:!!campaign.activeContractId,
    members:campaign.operators.filter(x=>x.status!=='retired'&&x.status!=='lost')
     .map(x=>({id:x.id,callsign:x.callsign,appearanceSeed:x.appearanceSeed,
       wardrobe:readWardrobe(x.wardrobe),loadout:x.loadout}))});
  }else{
   const roster=freshQuickPlayRoster(readRoster(
    localStorage.getItem('fieldwork3d.quickplay-cosmetics.v1')));
   start({mode:'quick',selected,readonly:false,
    members:roster.members.map(x=>({id:x.id,callsign:x.callsign,
     appearanceSeed:x.appearanceSeed,wardrobe:x.wardrobe,loadout:x.loadout}))});
  }
 }catch{
  const roster=initialRoster();
  start({mode:'quick',selected:'rook',readonly:false,
   members:roster.members.map(x=>({id:x.id,callsign:x.callsign,
    appearanceSeed:x.appearanceSeed,wardrobe:x.wardrobe,loadout:x.loadout}))});
 }
}
