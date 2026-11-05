/** Operator Studio: contextual appearance editing, not the animation workbench.
 * The hosting game owns authoritative roster/campaign writes. Standalone mode
 * uses the same validated roster persistence for previews and direct access.
 */
import * as THREE from 'three';
import {POLICE_VISOR_POSITIONS,POLICE_VISOR_TINTS,POLICE_VISOR_FRAMES,policeVisorFit} from './operator-police-visor-policy.ts';
import {M56_DETAILS,M56_NETS} from './operator-ddr-m56-policy.ts';
import {ALICE_LC2_LOADS,type AliceLc2Load} from './operator-alice-lc2-policy.ts';
import {HELMET_COVER_STYLES,HELMET_BANDS,HELMET_NET_STYLES,
 HELMET_SCRIM_STYLES,helmetCoverChoices} from './operator-helmet-cover-policy.ts';
import {identityMarkingChoices,setIdentityMarking,
 type MarkingSlot} from './operator-identity-markings.ts';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {studioUsesClothesOnly,studioUsesVisibleFace} from './operator-studio-preview-policy.ts';
import {studioCameraFocusForWardrobe,studioFocusEasing,clampStudioCameraZoom,
 STUDIO_FULL_FIT,STUDIO_MIN_ZOOM,STUDIO_MAX_ZOOM}
 from './operator-studio-camera-focus.ts';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {OperatorAppearanceGrid,APPEARANCE_GROUP_LABELS} from './operator-appearance-grid.ts';
import {FactionReferenceBrowser} from './faction-reference-browser.ts';
import {resolveFactionReference,referenceLookForKit} from './faction-reference-resolver.ts';
import {readRoster,initialRoster,
 freshQuickPlayRoster,serializeQuickPlayCosmetics} from './breach-roster.ts';
import {readCampaign} from './campaign-state.ts';
import {applyStudioRosterEdits,applyStudioCampaignEdits,
 type StudioAppearanceEdit} from './operator-studio-batch-save.ts';
import {setEquipmentChoice,type EquipmentLoadout} from './equipment-loadouts.ts';
import {readWardrobe,initialWardrobe,resolvedWardrobe,setWardrobeStyle,
 setWardrobeFabricSolid,setWardrobeFabricCamo,rerollWardrobeFabricCamo,
 sleeveStateOptions,trouserHemOptions,
 type WardrobeOptions,type WardrobeSlot} from './operator-wardrobe-data.ts';
import {fabricCamoChoices,type FabricCamoChannel} from './operator-fabric-camo-policy.ts';
import {resolveAutomaticGearColors} from './operator-gear-color-policy.ts';
import {D2_FACE_SOLIDS,D2_FACE_SOLID_COLORS,isD2Facewear,
 D2_FRAME_SOLIDS,D2_FRAME_COLORS,D2_LENS_TINTS,D2_LENS_MATERIALS,
 D2_MASK_SOLIDS,D2_MASK_COLORS,isD2Eyewear} from './operator-head-accessory-catalog.ts';
import {RIG_VISUAL_TEXTILES,ARMOR_VISUAL_TEXTILES,rigSignature,armorSignature,rigColorAssembly}
 from './operator-rig-authenticity-policy.ts';
import {GARMENT_SOLID_COLORS,solidChoicesFor,resolvedCuffSolid,
 resolvedCombatKnitSolid,type GarmentSolidId} from './operator-garment-color-policy.ts';
import {headwearColorChoices,HEADWEAR_SOLID_COLORS} from './operator-headwear-colors.ts';
import {SKIN_TONES,SKIN_TONE_IDS,HAIR_STYLES,HAIR_STYLE_IDS,
 HAIR_TONES,HAIR_TONE_IDS,seededSkinTone,seededHairStyle,seededHairTone,
 type HairStyleId} from './operator-identity-palette.ts';
import {headwearCamoChoices,HEADWEAR_CAMO_RECIPES,
 nextHeadwearCamoRoll,type HeadwearCamoId} from './operator-headwear-camo.ts';
import {topColorwayChoices,resolvedTopColorway} from './operator-upper-colorways.ts';
import {coordinateOutfit,suggestOutfitEquipmentSolids}
 from './operator-material-coordination.ts';
import {browseCamos,camoBrowseSection,sortGarmentSolids,sortHeadwearSolids,
 readCamoBrowserPrefs,recordCamoRecent} from './operator-material-browser.ts';
import {createCamoBrowseControls,createCamoFavoriteButton,
 appendCamoSectionHeading,createCamoResultSummary,syncCamoFavoriteButton}
 from './operator-material-browser-ui.ts';
import {paintCamoPreview} from './operator-camo-preview-cache.ts';
import {STUDIO_PRESET_STORAGE_KEY,STUDIO_PRESET_LIMIT,
 readStudioPresets,saveStudioPreset,deleteStudioPreset,
 serializeStudioPresets,outfitPresetForKit,
 type StudioPreset} from './operator-studio-presets.ts';
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
type StudioStep='items'|'materials'|'details';
let activeStep:StudioStep='items';
let identityMode=false;
let advancedFabricColorsOpen=false;
const openCamoLibraries=new Set<string>();
let advancedPouchOpen=false;
let clothesOnly=true;
let referenceOpen=false;
let previousClothesOnly=true;
let comparingSaved=false;
let saveInFlight=false;
let studioPresets:StudioPreset[]=[];
try{studioPresets=readStudioPresets(localStorage.getItem(STUDIO_PRESET_STORAGE_KEY));}
catch{/* Appearance presets are optional when storage is blocked. */}
let rig:OperatorRig|null=null;
const history=new Map<string,WardrobeOptions[]>();
const edits=new Map<string,WardrobeOptions>();
const dirty=new Set<string>();
const status=$<HTMLOutputElement>('studioStatus');
const canvas=$<HTMLCanvasElement>('studioCanvas');
const stage=canvas.parentElement!;
const materialRoot=$<HTMLElement>('studioMaterials');
const itemRoot=$<HTMLElement>('studioItemBrowser');
const workflowHint=$<HTMLElement>('studioWorkflowHelp');
const workflowButtons=Array.from(document.querySelectorAll<HTMLButtonElement>(
 '[data-studio-step]'));
const applyButton=$<HTMLButtonElement>('studioApply');
const modelSelector=$<HTMLSelectElement>('studioOperator');
const gearToggle=$<HTMLButtonElement>('studioGearToggle');
const undoButton=$<HTMLButtonElement>('studioUndo');
const categories=$<HTMLElement>('studioCategories');
const subcategories=$<HTMLElement>('studioSubcategories');
const compareButton=$<HTMLButtonElement>('studioCompare');
const resetButton=$<HTMLButtonElement>('studioReset');
const matchSetButton=$<HTMLButtonElement>('studioMatchSet');
const presetSelect=$<HTMLSelectElement>('studioPresetSelect');
const presetSave=$<HTMLButtonElement>('studioPresetSave');
const presetApply=$<HTMLButtonElement>('studioPresetApply');
const presetDelete=$<HTMLButtonElement>('studioPresetDelete');
const moreDetails=$<HTMLDetailsElement>('studioMore');
const modeLabel=$<HTMLElement>('studioModeLabel');
const studioRoot=$<HTMLElement>('studioRoot');
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
controls.minZoom=STUDIO_MIN_ZOOM;controls.maxZoom=STUDIO_MAX_ZOOM;
controls.target.set(0,23,0);controls.update();
const thumbBrowser=new OperatorAppearanceGrid(
 $('studioItemBrowser'),renderer,(slot,id)=>chooseStyle(slot,id),
 (slot,id)=>canEquip(slot,id),true);
const member=()=>people.find(p=>p.id===selected);
const current=()=>edits.get(selected)??member()?.wardrobe??initialWardrobe();
const previewWardrobe=()=>comparingSaved?member()?.wardrobe??initialWardrobe():current();
const say=(message:string)=>{status.textContent=message;};
const referenceBrowser=new FactionReferenceBrowser(
 $<HTMLElement>('studioReferencesPanel'),{
  onPreview:()=>{if(referenceOpen)posePreview();},
  onApply:id=>{
   const p=member();
   if(!p||readOnly||saveInFlight)return;
   const applied=referenceLookForKit(id,p.loadout,current());
   changeWardrobe(applied.wardrobe);
   closeReferenceBrowser();
   say('REFERENCE APPLIED TO UNSAVED LOOK · '+
    (applied.substituted.length+applied.lostPrints.length?
     (applied.substituted.length+' STYLES / '+applied.lostPrints.length+
      ' PRINTS ADAPTED TO ACTUAL KIT'):'NO KIT SUBSTITUTIONS')+
    ' · SAVE LOOK TO KEEP IT');
  },
  onClose:()=>closeReferenceBrowser(),
  compatibility:id=>{
   const p=member();
   if(!p)return {substituted:[],lostPrints:[]};
   const result=referenceLookForKit(id,p.loadout,current());
   return {substituted:result.substituted,lostPrints:result.lostPrints};
  }
 });
function openReferenceBrowser(){
 if(referenceOpen)return;
 previousClothesOnly=clothesOnly;
 identityMode=false;
 referenceOpen=true;clothesOnly=false;syncGearToggle();
 referenceBrowser.show(readOnly);
 refresh();
}
function closeReferenceBrowser(){
 if(!referenceOpen)return;
 referenceOpen=false;referenceBrowser.hide();
 clothesOnly=previousClothesOnly;syncGearToggle();
 refresh();
}
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
function renderScene(){
 renderer.setRenderTarget(null);renderer.render(scene,camera);
 canvas.dataset.ready='true';
 canvas.dataset.drawCalls=String(renderer.info.render.calls);
}
controls.addEventListener('change',renderScene);
new ResizeObserver(resize).observe(stage);

/** Damped target+zoom changes, canceled immediately by touch orbit/pinch,
 * wheel or a manual view button. Never changes the rig pose or wardrobe. */
let focusAnimation=0;
const cancelCameraFocus=()=>{
 if(focusAnimation)cancelAnimationFrame(focusAnimation);
 focusAnimation=0;
};
controls.addEventListener('start',cancelCameraFocus);
function activeStudioFocus(slot:WardrobeSlot){
 const p=member(),look=previewWardrobe();
 const facewear=p?resolvedWardrobe(look,p.loadout).facewear:look.styles.facewear;
 return studioCameraFocusForWardrobe(slot,facewear,look.d2FaceMode);
}
function focusCameraOnCategory(slot:WardrobeSlot,immediate=false){
 cancelCameraFocus();
 const focus=activeStudioFocus(slot);
 const startTarget=controls.target.clone();
 const nextTarget=new THREE.Vector3(0,focus.targetY,0);
 const startCamera=camera.position.clone();
 const offset=camera.position.clone().sub(controls.target);
 // Rear 3/4 frames the backpack when browsing PACK. Other categories
 // preserve the player's manually chosen azimuth and elevation.
 const nextOffset=focus.side==='back'?
  new THREE.Vector3(-69,29,44):offset;
 const nextCamera=nextTarget.clone().add(nextOffset);
 const startZoom=camera.zoom,nextZoom=clampStudioCameraZoom(focus.zoom);
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const renderAt=(t:number)=>{
  const ease=studioFocusEasing(t);
  controls.target.lerpVectors(startTarget,nextTarget,ease);
  camera.position.lerpVectors(startCamera,nextCamera,ease);
  camera.zoom=startZoom+(nextZoom-startZoom)*ease;
  camera.updateProjectionMatrix();
  controls.update();
  renderScene();
 };
 if(immediate||reducedMotion){renderAt(1);return;}
 const start=performance.now(),duration=300;
 const step=(now:number)=>{
  const t=Math.max(0,Math.min(1,(now-start)/duration));
  renderAt(t);
  if(t<1)focusAnimation=requestAnimationFrame(step);
  else focusAnimation=0;
 };
 focusAnimation=requestAnimationFrame(step);
}
/** The neutral rig's historical +X-forward adapters cancel; these are
 * actual rendered views, not a rotated placeholder. FRONT/SIDE/BACK retain
 * the focused part's framing, while FIT restores the complete character. */
function frameView(view:'front'|'side'|'back'|'fit'){
 cancelCameraFocus();
 const center=view==='fit'?
  new THREE.Vector3(0,STUDIO_FULL_FIT.targetY,0):
  new THREE.Vector3(0,activeStudioFocus(activeCategory).targetY,0);
 const distance=82;
 const directions={
  front:new THREE.Vector3(distance,18,0),
  side:new THREE.Vector3(0,18,distance),
  back:new THREE.Vector3(-distance,18,0),
  fit:new THREE.Vector3(distance*.75,35,distance*.68)
 } as const;
 controls.target.copy(center);
 camera.position.copy(center).add(directions[view]);
 camera.zoom=clampStudioCameraZoom(
  view==='fit'?STUDIO_FULL_FIT.zoom:camera.zoom);
 camera.updateProjectionMatrix();
 controls.update();renderScene();
}
document.querySelectorAll<HTMLButtonElement>('[data-studio-view]').forEach(button=>
 button.addEventListener('click',()=>frameView(
  button.dataset.studioView as 'front'|'side'|'back'|'fit')));
/** Clothes-only inspection is display-only, never a saved gear change.
  * Strip the visible vest/rig/pack/helmet without changing the real kit,
  * inventory, or the player's saved appearance. */
function inspectKit(kit:EquipmentLoadout):EquipmentLoadout{
 if(!clothesOnly)return kit;
 let preview=kit;
 for(const [slot,id] of [
  ['head','head-none'],['armor','armor-none'],['rig','rig-none'],
  ['belt','belt-none'],['backpack','backpack-none'],
  ['medical','medical-none'],['tactical','tactical-none'],
  ['utility','utility-none']
 ] as const)preview=setEquipmentChoice(preview,slot,id);
 return preview;
}
function inspectWardrobe(wardrobe:WardrobeOptions):WardrobeOptions{
 if(!clothesOnly)return wardrobe;
 return {...wardrobe,styles:{...wardrobe.styles,headwear:'bare',
  armorStyle:'armor-bare',rigStyle:'no-rig',beltStyle:'no-belt',
  packStyle:'no-pack'}};
}
function syncGearToggle(){
 gearToggle.setAttribute('aria-pressed',String(clothesOnly));
 gearToggle.textContent=clothesOnly?'CLOTHES ONLY':'SHOWING GEAR';
}
gearToggle.addEventListener('click',()=>{
 clothesOnly=!clothesOnly;syncGearToggle();posePreview();
});
syncGearToggle();
function posePreview(){
 const p=member();if(!p)return;
 const reference=referenceOpen?resolveFactionReference(referenceBrowser.selectedId):null;
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
  faceStyle:studioUsesVisibleFace(activeCategory)?'quiet':'blank',
  unarmedPreview:true,equipment:inspectKit(reference?.kit??p.loadout),
  wardrobe:inspectWardrobe(reference?.wardrobe??previewWardrobe())
 },0);
 renderScene();
}
function canEquip(slot:WardrobeSlot,id:string){
 const p=member();
 return !!p&&resolvedWardrobe(setWardrobeStyle(current(),slot,id),p.loadout)[slot]===id;
}
function changeWardrobe(next:WardrobeOptions){
 if(saveInFlight)return;
 const oldLook=current();
 const changedFacewear=next.styles.facewear!==oldLook.styles.facewear||
  next.d2FaceMode!==oldLook.d2FaceMode;
 if(comparingSaved)comparingSaved=false;
 if(readOnly){say('Appearance is locked during an active campaign operation');return;}
 if(JSON.stringify(next)===JSON.stringify(current()))return;
 history.set(selected,[...(history.get(selected)??[]).slice(-24),readWardrobe(current())]);
 const parsed=readWardrobe(next);
 if(JSON.stringify(parsed)===JSON.stringify(member()?.wardrobe)){
  edits.delete(selected);dirty.delete(selected);
 }else{edits.set(selected,parsed);dirty.add(selected);}
 say(dirty.size+' UNSAVED OPERATOR LOOK'+(dirty.size===1?'':'S'));
 refresh();
 if(changedFacewear&&activeCategory==='facewear')focusCameraOnCategory('facewear');
}
function chooseStyle(slot:WardrobeSlot,id:string){
 if(comparingSaved){comparingSaved=false;refresh();}
 if(!canEquip(slot,id)){
  say(slot==='armorStyle'?'THIS ARMOR LOOK NEEDS A MATCHING EQUIPPED PROTECTION CLASS':
   slot==='rigStyle'?'THIS RIG LOOK NEEDS A MATCHING EQUIPPED LOAD-BEARING CLASS':
   'This item requires a different equipped kit');return;
 }
 activeStep='materials';
 changeWardrobe(setWardrobeStyle(current(),slot,id));
 applyStudioStep();
}
function undo(){
 comparingSaved=false;
 const stack=history.get(selected)??[],last=stack.pop();
 if(!last)return;
 history.set(selected,stack);edits.set(selected,last);dirty.add(selected);
 say('RESTORED PREVIOUS APPEARANCE');refresh();
}
undoButton.addEventListener('click',undo);
const MATERIAL_LABELS=/^(SKIN TONE|HAIR COLOR|FACEWEAR FABRIC|MASK BODY|FRAME COLOR|LENS TINT|FABRIC MATERIAL|HEADGEAR FINISH|COMPATIBLE HEADGEAR PRINTS|GORKA TWO-TONE)/;
function studioSectionKind(node:HTMLElement):'materials'|'details'{
 return node.dataset.studioStep==='materials'?'materials':'details';
}
function applyStudioStep(){
 itemRoot.hidden=identityMode||activeStep!=='items';
 materialRoot.hidden=!identityMode&&activeStep==='items';
 let count=0;
 const children=Array.from(materialRoot.children) as HTMLElement[];
 for(const child of children){
  if(child.id==='studioEmptyStep')continue;
  const show=activeStep!=='items'&&studioSectionKind(child)===activeStep;
  child.hidden=!show;if(show)count++;
 }
 let empty=materialRoot.querySelector<HTMLElement>('#studioEmptyStep');
 if(activeStep!=='items'&&!count){
  if(!empty){
   empty=document.createElement('p');
   empty.id='studioEmptyStep';empty.className='studio-empty-step';
   materialRoot.append(empty);
  }
  empty.textContent=activeStep==='materials'?
   'No additional material choices for this item. Open DETAILS to adjust fit or position.':
   'This item has no additional detail adjustments.';
  empty.hidden=false;
 }else if(empty)empty.hidden=true;
 for(const button of workflowButtons){
  const pressed=button.dataset.studioStep===activeStep;
  button.setAttribute('aria-pressed',String(pressed));
 }
 workflowHint.textContent=activeStep==='items'?
  'Choose a 3D item to edit · select an equipped card to inspect its material':
  activeStep==='materials'?'Choose a fabric, finish or color · changes preview immediately':
  'Optional fit, wear, and equipment coordination settings';
}
function setStudioStep(step:StudioStep){
 activeStep=step;applyStudioStep();
 if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const sheet=materialRoot.closest('.studio-sheet');
  if(sheet instanceof HTMLElement)sheet.scrollTo({top:0,behavior:'smooth'});
 }
}
for(const button of workflowButtons)button.addEventListener('click',()=>{
 setStudioStep(button.dataset.studioStep as StudioStep);
});
function row(label:string,help?:string){
 const g=document.createElement('div');g.className='material-group';
 g.dataset.studioStep=MATERIAL_LABELS.test(label)?'materials':'details';
 const heading=document.createElement('div');heading.className='material-heading';
 const title=document.createElement('label');title.textContent=label;heading.append(title);
 g.append(heading);if(help){const small=document.createElement('small');small.textContent=help;g.append(small);}
 materialRoot.append(g);return g;
}
function makeButton(text:string,active:boolean,action:()=>void){
 const b=document.createElement('button');b.type='button';b.textContent=text;
 b.setAttribute('aria-pressed',String(active));b.disabled=readOnly||comparingSaved||saveInFlight;
 b.addEventListener('click',action);return b;
}
function addSolidSwatches(target:HTMLElement,values:readonly GarmentSolidId[],
 active:GarmentSolidId|null,choose:(id:GarmentSolidId)=>void){
 const grid=document.createElement('div');grid.className='solid-swatches';
 for(const id of sortGarmentSolids(values)){
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
 active:HeadwearCamoId|null,choose:(id:HeadwearCamoId)=>void,
 context:string,reference?:HeadwearCamoId|null){
 const picker=document.createElement('details');picker.className='studio-camo-picker';
 picker.open=openCamoLibraries.has(context);
 const summary=document.createElement('summary');summary.className='studio-camo-selected';
 const currentSwatch=document.createElement('canvas');
 if(active)paintCamoPreview(currentSwatch,active);
 currentSwatch.setAttribute('aria-hidden','true');
 if(!active)currentSwatch.className='studio-camo-none';
 const name=document.createElement('span');
 name.textContent=active?HEADWEAR_CAMO_RECIPES[active].label:'CHOOSE CAMOUFLAGE';
 const change=document.createElement('strong');change.textContent='CHANGE';
 summary.append(currentSwatch,name,change);picker.append(summary);
 const library=document.createElement('div');library.className='studio-camo-library';
 picker.append(library);target.append(picker);
 const grid=document.createElement('div');grid.className='camo-swatches';
 const cards=new Map<HeadwearCamoId,HTMLDivElement>();
 const state=createCamoBrowseControls(library,'studio:'+context,()=>paint());
 const showResults=createCamoResultSummary(library);
 library.append(grid);
 const paint=()=>{
  if(!picker.open)return;
  grid.replaceChildren();
  const prefs=readCamoBrowserPrefs();
  const ordered=browseCamos(ids,{state,active,reference,prefs});
  showResults(ordered,ids.filter(id=>id!=='splittertarn-31').length,active);
  let section='';
  for(const id of ordered){
   section=appendCamoSectionHeading(grid,
    camoBrowseSection(id,{state,active,reference,prefs}),section);
   let wrap=cards.get(id);
   if(!wrap){
    wrap=document.createElement('div');wrap.className='fw-camo-choice-wrap';
    const b=makeButton(HEADWEAR_CAMO_RECIPES[id].label,active===id,()=>{
     recordCamoRecent(id);choose(id);
    });
    b.className='swatch';
    const canvas=document.createElement('canvas');paintCamoPreview(canvas,id);
    b.prepend(canvas);
    wrap.append(b,createCamoFavoriteButton(id,prefs.favorites.includes(id),
     ()=>paint(),readOnly||comparingSaved||saveInFlight));
    cards.set(id,wrap);
   }
   const star=wrap.querySelector<HTMLButtonElement>('.fw-material-favorite');
   if(star)syncCamoFavoriteButton(star,prefs.favorites.includes(id));
   grid.append(wrap);
  }
  if(!ordered.length){
   const empty=document.createElement('small');
   empty.textContent='No compatible print matches these filters';
   grid.append(empty);
  }
 };
 picker.addEventListener('toggle',()=>{
  if(picker.open){openCamoLibraries.add(context);paint();}
  else openCamoLibraries.delete(context);
 });
 if(picker.open)paint();
}
function renderCuff(host:HTMLElement){
 const w=current(),printed=w.fabricCamo?.top;
 const resolved=resolvedCuffSolid({
  print:printed??null,solid:w.fabricSolids?.top??null,
  override:w.cuffSolid??null,fallback:'olive-drab'});
 const section=row('CUFF / ROLLED FABRIC',
  'AUTO follows the top print or solid. Explicit overrides also affect actual trouser cuffs, not bloused fabric.');
 host.append(section);
 const actions=document.createElement('div');actions.className='material-row';
 actions.append(makeButton('AUTO · '+GARMENT_SOLID_COLORS[resolved].label,
  !w.cuffSolid,()=>changeWardrobe({...current(),cuffSolid:undefined})));
 section.append(actions);
 addSolidSwatches(section,solidChoicesFor('top').filter(x=>x!=='off-white'),
  w.cuffSolid??null,id=>changeWardrobe({...current(),cuffSolid:id}));
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
function renderIdentityControls(){
 const choices=([['leftShoulder','LEFT SHOULDER'],['rightShoulder','RIGHT SHOULDER'],
  ['chest','CHEST LABEL'],['armband','FIELD ARMBAND']] as const);
 for(const [slot,title] of choices){
  const help=slot==='chest'?
   'Visible on a supported external tactical vest; concealed armor cannot show patches.':
   'Personal customization only; national flags are not automatically authentic for every time and unit.';
  const section=row(title,help);
  const options:readonly (readonly [string,string])[]=[
   ['', 'NONE'],...identityMarkingChoices(slot).map(x=>[x.id,x.label] as const)];
  addSelect(section,options,current().markings?.[slot]??'',
   id=>changeWardrobe({...current(),
    markings:setIdentityMarking(current().markings??{},slot as MarkingSlot,id||null)}));
 }
}
function renderMaterials(){
 materialRoot.replaceChildren();
 if(identityMode){renderIdentityControls();applyStudioStep();return;}
 const p=member();if(!p)return;
 const w=current(),outfit=resolvedWardrobe(w,p.loadout);
 const item=outfit[activeCategory];
 if(activeCategory==='facewear'){
  const identitySwatches=(heading:string,
   values:readonly string[],colorFor:(id:string)=>{label:string;hex:number},
   active:string,select:(id:string)=>void)=>{
   const section=row(heading,'Appearance only; does not change protection, ancestry or gameplay.');
   const grid=document.createElement('div');grid.className='solid-swatches';
   for(const id of values){
    const info=colorFor(id),button=makeButton(info.label,id===active,
     ()=>select(id));
    button.className='swatch';button.title=info.label;
    const chip=document.createElement('span');chip.className='swatch-chip';
    chip.style.backgroundColor='#'+info.hex.toString(16).padStart(6,'0');
    button.prepend(chip);grid.append(button);
   }
   section.append(grid);
  };
  identitySwatches('SKIN TONE',SKIN_TONE_IDS,
   id=>SKIN_TONES[id as keyof typeof SKIN_TONES],
   w.skinTone??seededSkinTone(p.appearanceSeed),
   id=>changeWardrobe({...current(),skinTone:id as keyof typeof SKIN_TONES}));
  const hair=row('HAIRCUT','Hair fits the unchanged head and is hidden beneath incompatible helmets or full balaclavas.');
  addSelect(hair,HAIR_STYLE_IDS.map(id=>[id,HAIR_STYLES[id].label] as const),
   w.hairStyle??seededHairStyle(p.appearanceSeed),
   value=>changeWardrobe({...current(),hairStyle:value as HairStyleId}));
  identitySwatches('HAIR COLOR',HAIR_TONE_IDS,
   id=>HAIR_TONES[id as keyof typeof HAIR_TONES],
   w.hairTone??seededHairTone(p.appearanceSeed),
   id=>changeWardrobe({...current(),hairTone:id as keyof typeof HAIR_TONES}));
  const modes:readonly (readonly [string,string])[]=item==='balaclava-three'?
   [['three-hole','Three openings'],['two-hole','Eyes only']]:
   item==='gaiter'?[['lowered','Neck'],['mouth','Mouth'],['nose','Nose + mouth']]:
   item==='shemagh'?[['draped','Draped'],['face-wrap','Face wrapped'],
     ['head-wrap','Head wrapped']]:
   item==='bandana'?[['raised','Face covered'],['lowered','Neck']]:[];
  if(item==='shemagh'&&outfit.headwear!=='bare'&&w.d2FaceMode==='head-wrap'){
   row('HEAD-WRAP FIT',
    'Head-wrapped fabric needs an uncovered head. A helmet or hat uses face-wrapped fabric instead.');
  }
  if(modes.length){
   const section=row('HOW WORN','One model, multiple fitted wearing positions.');
   addSelect(section,modes,w.d2FaceMode&&modes.some(([id])=>id===w.d2FaceMode)?
    w.d2FaceMode:modes[0][0],
    value=>changeWardrobe({...current(),d2FaceMode:value as NonNullable<WardrobeOptions['d2FaceMode']>}));
  }
  if(isD2Facewear(item)&&['balaclava-one','balaclava-three','balaclava-open',
      'gaiter','shemagh','bandana'].includes(item)){
   const section=row('FACEWEAR FABRIC','Independent textile colors; headwear and uniform colors stay unchanged.');
   const swatches=document.createElement('div');swatches.className='solid-swatches';
   for(const id of D2_FACE_SOLIDS){
    const info=D2_FACE_SOLID_COLORS[id];
    const b=makeButton(info.label,w.d2FaceSolid===id,()=>
     changeWardrobe({...current(),d2FaceSolid:id}));
    b.className='swatch';b.title=info.label;
    const chip=document.createElement('span');chip.className='swatch-chip';
    chip.style.backgroundColor='#'+info.hex.toString(16).padStart(6,'0');
    b.prepend(chip);swatches.append(b);
   }
   section.append(swatches);
  }
  if(item==='gas-gp5'&&outfit.headwear!=='bare')
   row('HOOD CLEARANCE','The hood hides the hat/helmet model without changing saved headwear or actual protection.');
  if(item==='half-mask'||item==='respirator-half'){
   const variants:readonly (readonly [string,string])[]=item==='half-mask'?
    [['solid','Hard shell'],['mesh','Mesh-faced']]:
    [['twin-filter','Twin cartridges'],['compact-filter','Compact filter']];
   const wear=row('MASK CONSTRUCTION','Variants belong to the same physical mask family.');
   addSelect(wear,variants,w.d2Accessories?.faceMode??variants[0][0],
    faceMode=>changeWardrobe({...current(),d2Accessories:{
     ...current().d2Accessories,faceMode}}));
  }
  if(['half-mask','respirator-half','gas-gp5','gas-m17',
      'gas-m40','gas-m50'].includes(item)){
   const section=row('MASK BODY','Cosmetic rubber or polymer finish. No in-game filtration bonus.');
   const swatches=document.createElement('div');swatches.className='solid-swatches';
   for(const id of D2_MASK_SOLIDS){
    const info=D2_MASK_COLORS[id];
    const b=makeButton(info.label,(w.d2MaskColor??'black')===id,
     ()=>changeWardrobe({...current(),d2MaskColor:id}));
    b.className='swatch';b.title=info.label;
    const chip=document.createElement('span');chip.className='swatch-chip';
    chip.style.backgroundColor='#'+info.hex.toString(16).padStart(6,'0');
    b.prepend(chip);swatches.append(b);
   }
   section.append(swatches);
  }
 }
 if(activeCategory==='eyewear'&&isD2Eyewear(item)){
  const selected=w.d2Accessories??{};
  const save=(patch:Partial<NonNullable<WardrobeOptions['d2Accessories']>>)=>
   changeWardrobe({...current(),d2Accessories:{...current().d2Accessories,...patch}});
  if(item.startsWith('goggles-')){
   if((w.d2Accessories?.eyePosition??'eyes')==='raised'&&
      ['patrol-cap','boonie'].includes(outfit.headwear))
    row('HEADWEAR CLEARANCE',
     'This brim prevents raised placement. Goggles remain over the eyes until compatible headwear is selected.');
   const worn=row('GOGGLE POSITION',
    'Raised goggles rest on the helmet or forehead when the selected headwear permits it.');
   addSelect(worn,[['eyes','Over eyes'],['raised','Raised'],['neck','Around neck']] as const,
    selected.eyePosition??'eyes',
    eyePosition=>save({eyePosition:eyePosition as NonNullable<NonNullable<WardrobeOptions['d2Accessories']>['eyePosition']>}));
  }
  if(item==='glasses-standard'){
   const shape=row('FRAME SHAPE','One core model with recognizable frame subtypes.');
   addSelect(shape,[['rectangular','Rectangular'],['round','Round'],
     ['heavy-square','Heavy square']] as const,
    selected.eyeMode??'rectangular',eyeMode=>save({eyeMode}));
  }
  const frame=row('FRAME COLOR','Independent plastic or metal finish.');
  const swatches=document.createElement('div');swatches.className='solid-swatches';
  for(const id of D2_FRAME_SOLIDS){
   const info=D2_FRAME_COLORS[id];
   const b=makeButton(info.label,(selected.eyeFrame??'black')===id,
    ()=>save({eyeFrame:id}));
   b.className='swatch';b.title=info.label;
   const chip=document.createElement('span');chip.className='swatch-chip';
   chip.style.backgroundColor='#'+info.hex.toString(16).padStart(6,'0');
   b.prepend(chip);swatches.append(b);
  }
  frame.append(swatches);
  const lens=row('LENS TINT','Tint is a material option, not another glasses model.');
  addSelect(lens,D2_LENS_TINTS.map(id=>[id,D2_LENS_MATERIALS[id].label] as const),
   selected.eyeTint??'clear',eyeTint=>save({eyeTint:eyeTint as NonNullable<NonNullable<WardrobeOptions['d2Accessories']>['eyeTint']>}));
 }
 if(activeCategory==='armorStyle'||activeCategory==='rigStyle'){
  const category=activeCategory==='armorStyle'?'ARMOR SHELL':'LOAD-BEARING RIG';
  row(category+' · APPEARANCE',
   activeCategory==='armorStyle'?
    'Visible armor shapes do not alter protection. Equip soft or plated armor in the loadout to unlock that family.':
    'Rig variants only change silhouette and where carried magazines appear. Actual capacity stays in the equipment loadout.');
  const labLink=document.createElement('a');
  labLink.href='./operator-armor-rig-lab.html';
  labLink.textContent='OPEN ARMOR & RIG SILHOUETTE LAB';
  labLink.target='_blank';labLink.rel='noopener noreferrer';
  labLink.className='material-heading';
  materialRoot.append(labLink);
 }

 const channel:FabricCamoChannel|null=
  activeCategory==='top'?'top':activeCategory==='trousers'?'trousers':
  activeCategory==='armorStyle'?'armor':
  activeCategory==='rigStyle'||activeCategory==='beltStyle'?'gear':
  activeCategory==='packStyle'?'pack':null;
 if(channel){
  const choices=fabricCamoChoices(channel,outfit);
  // A saved swatch may belong to a DIFFERENT armor or rig. Preserve it,
  // but display the active cut's iconic color instead of a stale choice.
  const rawPattern=w.fabricCamo?.[channel]??null;
  const pattern=rawPattern&&
   (channel!=='armor'&&channel!=='gear'||choices.includes(rawPattern))?
    rawPattern:null;
  const eligibleSolids=channel==='gear'?
   (outfit.rigStyle==='no-rig'?solidChoicesFor('gear'):
    RIG_VISUAL_TEXTILES[outfit.rigStyle]?.solids??[]):
   channel==='armor'?
   (ARMOR_VISUAL_TEXTILES[outfit.armorStyle]?.solids??[]):
   solidChoicesFor(channel);
  const rawSolid=w.fabricSolids?.[channel];
  const manualSolid=rawSolid&&
   (channel!=='armor'&&channel!=='gear'||eligibleSolids.includes(rawSolid))?
    rawSolid:null;
  const iconicSignature=channel==='gear'&&outfit.rigStyle!=='no-rig'?
   rigSignature(outfit.rigStyle):
   channel==='armor'&&outfit.armorStyle!=='armor-bare'?
    armorSignature(outfit.armorStyle):null;
  const group=row('FABRIC MATERIAL','Select a solid or an approved print. Printed material never changes its original artwork.');
  if(channel==='armor'||channel==='gear'||channel==='pack'){
   const automatic=resolveAutomaticGearColors({print:w.fabricCamo?.top,
    solid:w.fabricSolids?.top})[channel];
   const hint=document.createElement('small');
   hint.textContent=iconicSignature?
    'ICONIC DEFAULT: '+(iconicSignature.print?
     HEADWEAR_CAMO_RECIPES[iconicSignature.print].label:
     GARMENT_SOLID_COLORS[iconicSignature.solid].label)+
    ' · Select an available solid or print to override this reference appearance.':
    'AUTO MATCH: '+GARMENT_SOLID_COLORS[automatic].label+
    ' · Based on uniform family. Manual armor, rig and pack choices remain independent.';
   group.append(hint);
   const auto=document.createElement('div');auto.className='material-row';
   auto.append(makeButton(iconicSignature?'RESTORE ICONIC DEFAULT':'USE AUTO MATCH',
    !pattern&&!manualSolid,()=>{
    const now=current();
    changeWardrobe({...now,
     fabricCamo:{...now.fabricCamo,[channel]:undefined},
     fabricSolids:{...now.fabricSolids,[channel]:undefined}});
   }));
   group.append(auto);
  }
  const tabs=document.createElement('div');tabs.className='material-tabs';
  const iconic=!!iconicSignature&&!pattern&&!manualSolid;
  const solidSelected=!pattern&&!iconic;
  if(iconicSignature)
   tabs.append(makeButton('ICONIC DEFAULT',iconic,()=>{
    const now=current();
    changeWardrobe({...now,
     fabricCamo:{...now.fabricCamo,[channel]:undefined},
     fabricSolids:{...now.fabricSolids,[channel]:undefined}});
   }));
  tabs.append(makeButton('SOLID',solidSelected,()=>{
   const id=manualSolid??iconicSignature?.solid??
    eligibleSolids[0]??'olive-drab';
   changeWardrobe(setWardrobeFabricSolid(current(),channel,id,outfit));
  }));
  if(choices.length)tabs.append(makeButton('CAMOUFLAGE',!!pattern,()=>{
   if(!pattern){
    const previous=w.lastFabricCamo?.[channel];
    const restored=previous&&choices.includes(previous)?previous:choices[0];
    changeWardrobe(setWardrobeFabricCamo(current(),channel,restored,outfit));
   }
  }));
  group.append(tabs);
  if(pattern&&choices.length){
   addCamoSwatches(group,choices,pattern,id=>
    changeWardrobe(setWardrobeFabricCamo(current(),channel,id,outfit)),
    channel,w.fabricCamo?.top??null);
   const actions=document.createElement('div');actions.className='material-row';
   actions.append(makeButton('↻ REROLL PATTERN',false,()=>
    changeWardrobe(rerollWardrobeFabricCamo(current(),channel,outfit))));
   group.append(actions);
  }else{
   addSolidSwatches(group,eligibleSolids,
    manualSolid??null,id=>
     changeWardrobe(setWardrobeFabricSolid(current(),channel,id,outfit)));
  }
  // A matching set is explicitly opt-in: one tap copies only a compatible
  // print or solid, never an item or equipment slot.
  if(channel==='top'||channel==='trousers'){
   const source=channel==='top'?'trousers':'top';
   const sourcePrint=w.fabricCamo?.[source];
   const sourceSolid=w.fabricSolids?.[source];
   const canCopyPrint=!!sourcePrint&&choices.includes(sourcePrint)&&
    pattern!==sourcePrint;
   const canCopySolid=!sourcePrint&&!!sourceSolid&&
    solidChoicesFor(channel).includes(sourceSolid)&&
    (pattern!==null||w.fabricSolids?.[channel]!==sourceSolid);
   if(canCopyPrint||canCopySolid){
    const match=document.createElement('div');match.className='material-row';
    match.append(makeButton('MATCH '+(source==='top'?'TOP':'TROUSER')+
      ' '+(canCopyPrint?'CAMOUFLAGE':'SOLID'),false,()=>{
     if(canCopyPrint&&sourcePrint)
      changeWardrobe(setWardrobeFabricCamo(current(),channel,sourcePrint,outfit));
     else if(canCopySolid&&sourceSolid)
      changeWardrobe(setWardrobeFabricSolid(current(),channel,sourceSolid));
    }));
    group.append(match);
   }
  }
 }
 if(activeCategory==='headwear'){
  row('HEADWEAR APPEARANCE',
   'All approved hats and helmets are selectable. Appearance does not alter head protection or inventory; the equipped kit controls those.');
  const solids=headwearColorChoices(item==='high-cut-rails'?'high-cut':item);
  const prints=headwearCamoChoices(item);
  const group=row('HEADGEAR FINISH','Select an appropriate solid shell/fabric or approved cover print.');
  if(solids.length){
   const grid=document.createElement('div');grid.className='solid-swatches';
   for(const id of sortHeadwearSolids(solids,w.headwearColor)){
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
  if(item==='police-helmet'){
   const pos=row('POLICE PROTECTIVE VISOR',
    'Optional head-mounted shield; appearance only, no added ballistic or impact protection.');
   addSelect(pos,POLICE_VISOR_POSITIONS.map(id=>[id,id.toUpperCase()] as const),
    w.policeVisorPosition??'none',id=>changeWardrobe({...current(),
     policeVisorPosition:id as WardrobeOptions['policeVisorPosition']}));
   if(w.policeVisorPosition&&w.policeVisorPosition!=='none'){
    const tint=row('VISOR FINISH','Restrained transparent or smoke-tinted face panel.');
    addSelect(tint,POLICE_VISOR_TINTS.map(id=>[id,id.toUpperCase()] as const),
     w.policeVisorTint??'clear',id=>changeWardrobe({...current(),
      policeVisorTint:id as WardrobeOptions['policeVisorTint']}));
    const frame=row('VISOR FRAME','Standard or heavier reinforced silhouette.');
    addSelect(frame,POLICE_VISOR_FRAMES.map(id=>[id,id.toUpperCase()] as const),
     w.policeVisorFrame??'standard',id=>changeWardrobe({...current(),
      policeVisorFrame:id as WardrobeOptions['policeVisorFrame']}));
    const fit=policeVisorFit(item,w.styles.facewear??'face-none',
     w.styles.eyewear??'eyes-none',w.styles.headset??'comms-none');
    if(!fit.compatible)row('VISOR FIT RESTRICTED',
     fit.reason+' — your stored selection is preserved, but the visor is hidden.');
   }
  }
  if(item==='ddr-m56'){
   const details=row('M56 STEEL SHELL','Historical exterior details on the same flared shell.');
   addSelect(details,M56_DETAILS.map(id=>[id,id.toUpperCase()] as const),
    w.m56Details??'late-smooth',id=>changeWardrobe({...current(),
     m56Details:id as WardrobeOptions['m56Details']}));
   const net=row('M56 HELMET NET','Coarse period textile overlay; does not recolor the painted steel.');
   addSelect(net,M56_NETS.map(id=>[id,id.toUpperCase()] as const),
    w.m56Net??'none',id=>changeWardrobe({...current(),
     m56Net:id as WardrobeOptions['m56Net']}));
  }
  if(item==='m1-steel'){
   const panel=row('M1 HELMET COVER',
    'A separate cloth layer over the steel shell. The rolled metal rim stays visible.');
   addSelect(panel,HELMET_COVER_STYLES.map(id=>[id,
    id==='none'?'BARE PAINTED STEEL':id==='fitted'?'FITTED COVER':'LOOSE COVER'] as const),
    w.helmetCover??'none',value=>changeWardrobe({...current(),
     helmetCover:value as WardrobeOptions['helmetCover']}));
   if(w.helmetCover&&w.helmetCover!=='none'){
    const available=helmetCoverChoices(item);
    const fabric=row('M1 COVER CAMOUFLAGE',
     'Historical selection, not a generic camouflage permission for the steel shell.');
    addCamoSwatches(fabric,available,w.helmetCoverCamo??null,id=>
     changeWardrobe({...current(),helmetCoverCamo:id}),
     'm1-cover',w.fabricCamo?.top??null);
    const band=row('HELMET RETAINING BAND');
    addSelect(band,HELMET_BANDS.map(x=>[x,x.toUpperCase()] as const),
     w.helmetBand??'none',value=>changeWardrobe({...current(),
      helmetBand:value as WardrobeOptions['helmetBand']}));
    const net=row('COARSE NETTING');
    addSelect(net,HELMET_NET_STYLES.map(x=>[x,x.toUpperCase()] as const),
     w.helmetNet??'none',value=>changeWardrobe({...current(),
      helmetNet:value as WardrobeOptions['helmetNet']}));
    const scrim=row('HELMET SCRIM');
    addSelect(scrim,HELMET_SCRIM_STYLES.map(x=>[x,x.toUpperCase()] as const),
     w.helmetScrim??'none',value=>changeWardrobe({...current(),
      helmetScrim:value as WardrobeOptions['helmetScrim']}));
   }
  }
  if(item==='beret'){
   const drape=row('BERET DRAPE','One asymmetric wool silhouette, mirrored without adding a separate hat.');
   addSelect(drape,[['right','RIGHT DRAPE'],['left','LEFT DRAPE']] as const,
    w.beretDrape??'right',value=>changeWardrobe({...current(),
     beretDrape:value as 'left'|'right'}));
  }
  if(prints.length){
   const printRow=row('COMPATIBLE HEADGEAR PRINTS');
   addCamoSwatches(printRow,prints,w.headwearCamo??null,id=>
    changeWardrobe({...current(),headwearCamo:id,headwearCamoRoll:
      w.headwearCamo===id?nextHeadwearCamoRoll(w.headwearCamoRoll):0}),
    'headwear',w.fabricCamo?.top??null);
  }
 }
 if(activeCategory==='rigStyle'&&item==='alice-lc2'){
  const load=row('ALICE FIELD LOAD',
   'Visual pouch arrangement only. No extra ammunition, water or carrying capacity.');
  addSelect(load,ALICE_LC2_LOADS.map(id=>[id,id.toUpperCase()] as const),
   w.aliceLoad??'standard',id=>changeWardrobe({...current(),aliceLoad:id as AliceLc2Load}));
 }
 if(activeCategory==='rigStyle'&&item!=='no-rig'&&
  rigColorAssembly(item).detachablePouches){
  row('POUCH FABRIC',w.pouchSolid?
   'Advanced pouch-only fabric override: '+GARMENT_SOLID_COLORS[w.pouchSolid].label:
   'AUTO · Match rig material, including original camouflage and cut position.');
  const advanced=document.createElement('details');
  advanced.className='material-group';advanced.open=advancedPouchOpen;
  const summary=document.createElement('summary');
  summary.textContent='ADVANCED POUCH COLOR';advanced.append(summary);
  advanced.addEventListener('toggle',()=>{advancedPouchOpen=advanced.open;});
  const actions=document.createElement('div');actions.className='material-row';
  actions.append(makeButton('AUTO · MATCH RIG',!w.pouchSolid,()=>
   changeWardrobe({...current(),pouchSolid:undefined})));
  advanced.append(actions);
  addSolidSwatches(advanced,
   RIG_VISUAL_TEXTILES[item]?.solids??solidChoicesFor('gear'),
   w.pouchSolid??null,
   id=>changeWardrobe({...current(),pouchSolid:id}));
  materialRoot.append(advanced);
 }
 if(activeCategory==='rigStyle'&&item!=='no-rig'&&
  rigColorAssembly(item).replaceableHarness){
  row('HARNESS / WEBBING',w.strapSolid?
   'REPLACEABLE HARNESS: '+GARMENT_SOLID_COLORS[w.strapSolid].label:
   'AUTO · Match rig, with plain webbing when historically appropriate.');
  const advanced=document.createElement('details');
  advanced.className='material-group';
  const summary=document.createElement('summary');
  summary.textContent='ADVANCED HARNESS COLOR';advanced.append(summary);
  const actions=document.createElement('div');actions.className='material-row';
  actions.append(makeButton('AUTO · MATCH RIG',!w.strapSolid,()=>
   changeWardrobe({...current(),strapSolid:undefined})));
  advanced.append(actions);
  addSolidSwatches(advanced,
   RIG_VISUAL_TEXTILES[item]?.solids??solidChoicesFor('gear'),
   w.strapSolid??null,id=>changeWardrobe({...current(),strapSolid:id}));
  materialRoot.append(advanced);
 }
 if(activeCategory==='top'){
  const suggested=suggestOutfitEquipmentSolids(w,outfit,'coordinated');
  const section=row('OUTFIT COLOR COORDINATION',
   'Optional equipment palettes · only manufactured, compatible colors. Manual choices remain untouched unless you explicitly replace them.');
  if(suggested.length){
   const detail=document.createElement('small');
   detail.textContent=suggested.map(x=>x.channel.toUpperCase()+': '+
    GARMENT_SOLID_COLORS[x.color].label).join(' · ');
   section.append(detail);
   const actions=document.createElement('div');actions.className='material-row';
   actions.append(makeButton('FILL UNSET EQUIPMENT COLORS',false,()=>
    changeWardrobe(coordinateOutfit(current(),outfit,{
     profile:'coordinated',scope:'unset'}))));
   actions.append(makeButton('APPLY COORDINATED PALETTE',false,()=>
    changeWardrobe(coordinateOutfit(current(),outfit,{
     profile:'coordinated',scope:'replace'}))));
   actions.append(makeButton('AUTHENTIC EQUIPMENT FINISHES',false,()=>
    changeWardrobe(coordinateOutfit(current(),outfit,{
     profile:'authentic',scope:'replace'}))));
   if(w.fabricCamo?.top&&headwearCamoChoices(outfit.headwear).includes(w.fabricCamo.top))
    actions.append(makeButton('MATCH HELMET COVER',false,()=>
     changeWardrobe(coordinateOutfit(current(),outfit,{
      profile:'coordinated',scope:'replace',headwear:outfit.headwear,
      matchHeadwearPrint:true}))));
   section.append(actions);
  }
  // Combat knit and smock solids are controlled by their actual material
  // swatches above, never a second competing color dropdown. Keep the
  // Gorka's purpose-built TWO-TONE family options as its one exception.
  const special=item==='gorka-jacket'?topColorwayChoices(item):[];
  if(special.length){
   const section=row('GORKA TWO-TONE / REINFORCEMENTS');
   addSelect(section,special,resolvedTopColorway(item,w.topColorway),
    value=>changeWardrobe({...current(),topColorway:value}));
  }
  const editableUpper=['bdu-shirt','acu-shirt','combat-shirt','smock-jacket','gorka-jacket'].includes(item);
  if(editableUpper){
   const autoFold=resolvedCuffSolid({print:w.fabricCamo?.top,
    solid:w.fabricSolids?.top,override:w.cuffSolid,fallback:'olive-drab'});
   row('ROLLED / CUFF FABRIC',
    (w.cuffSolid?'Advanced override: ':'Automatically matched: ')+
     GARMENT_SOLID_COLORS[autoFold].label);
  }
  if(item==='combat-shirt'){
   const autoKnit=resolvedCombatKnitSolid({print:w.fabricCamo?.top,
    solid:w.fabricSolids?.top,override:w.knitSolid,fallback:'khaki'});
   row('COMBAT-SHIRT KNIT · TORSO + COLLAR',
    (w.knitSolid?'Advanced override: ':'Automatically matched: ')+
     GARMENT_SOLID_COLORS[autoKnit].label);
  }
  // Auto pairing is the normal experience. Keep manual swatches available
  // to specialists without putting a second color picker in the main flow.
  if(editableUpper){
   const advanced=document.createElement('details');
   advanced.className='material-group';
   advanced.open=advancedFabricColorsOpen;
   const summary=document.createElement('summary');
   summary.textContent='ADVANCED COLOR OVERRIDES';
   advanced.append(summary);
   advanced.addEventListener('toggle',()=>{
    advancedFabricColorsOpen=advanced.open;
   });
   materialRoot.append(advanced);
   if(item==='combat-shirt'){
    const section=row('COMBAT-SHIRT KNIT OVERRIDE');
    advanced.append(section);
    const actions=document.createElement('div');
    actions.className='material-row';
    actions.append(makeButton('AUTO',!w.knitSolid,()=>
     changeWardrobe({...current(),knitSolid:undefined})));
    section.append(actions);
    addSolidSwatches(section,solidChoicesFor('top'),w.knitSolid??null,
     id=>changeWardrobe({...current(),knitSolid:id}));
   }
   renderCuff(advanced);
  }
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
 applyStudioStep();
}
/** Six primary categories replace the old fourteen-tab strip.
 * Subslots are an intentional second step only where needed. */
const categoryGroups:readonly {label:string;slots:readonly WardrobeSlot[]}[]=[
 {label:'HEAD',slots:['headwear','facewear','eyewear','headset']},
 {label:'TOPS',slots:['top']},
 {label:'LEGS',slots:['trousers','footwear']},
 {label:'ARMOR',slots:['armorStyle']},
 {label:'GEAR',slots:['rigStyle','beltStyle','packStyle']},
 {label:'DETAILS',slots:['gloves','knees','wrist']}
];
const categoryGroup=()=>categoryGroups.find(group=>
 group.slots.includes(activeCategory))??categoryGroups[1];
function selectCategory(slot:WardrobeSlot){
 identityMode=false;
 activeCategory=slot;activeStep='items';
 if(referenceOpen){referenceOpen=false;referenceBrowser.hide();}
 // Look at the cloth unobscured for garments, but show all available
 // headgear/armor/gear when browsing those categories.
 clothesOnly=studioUsesClothesOnly(slot);
 comparingSaved=false;syncGearToggle();refresh();
 focusCameraOnCategory(slot);
}
function renderCategories(){
 categories.replaceChildren();subcategories.replaceChildren();
 const referenceButton=document.createElement('button');
 referenceButton.type='button';referenceButton.textContent='REFERENCES';
 referenceButton.setAttribute('aria-pressed',String(referenceOpen));
 referenceButton.disabled=saveInFlight;
 referenceButton.addEventListener('click',()=>openReferenceBrowser());
 categories.append(referenceButton);
 for(const group of categoryGroups){
  const button=makeButton(group.label,group.slots.includes(activeCategory),()=>
   selectCategory(group.slots[0]));
  button.setAttribute('aria-label','Customize '+group.label.toLowerCase());
  categories.append(button);
 }
 const group=categoryGroup();
 if(group.label==='DETAILS'){
  const mark=makeButton('MARKINGS',identityMode,()=>{
   if(referenceOpen){referenceOpen=false;referenceBrowser.hide();}
   identityMode=true;activeStep='details';clothesOnly=false;
   comparingSaved=false;syncGearToggle();refresh();
  });
  subcategories.append(mark);
 }
 if(group.slots.length>1)for(const slot of group.slots){
  const button=makeButton(APPEARANCE_GROUP_LABELS[slot],slot===activeCategory,
   ()=>selectCategory(slot));
  subcategories.append(button);
 }
}
function pairedUniformFor(slot:WardrobeSlot,look:WardrobeOptions,kit:EquipmentLoadout):
 {slot:WardrobeSlot;id:string}|null{
 const outfit=resolvedWardrobe(look,kit);
 if(slot==='top'){
  const pairs:Record<string,string>={
   'bdu-shirt':'bdu-trousers','acu-shirt':'acu-trousers',
   'combat-shirt':'acu-trousers','smock-jacket':'bdu-trousers',
   'gorka-jacket':'gorka-trousers'};
  const id=pairs[outfit.top];return id?{slot:'trousers',id}:null;
 }
 if(slot==='trousers'){
  const pairs:Record<string,string>={
   'bdu-trousers':'bdu-shirt','acu-trousers':'acu-shirt',
   'gorka-trousers':'gorka-jacket'};
  const id=pairs[outfit.trousers];return id?{slot:'top',id}:null;
 }
 return null;
}
function renderPresetMenu(){
 const selectedPreset=presetSelect.value;
 presetSelect.replaceChildren();
 const none=document.createElement('option');
 none.value='';none.textContent=studioPresets.length?
  'SELECT SAVED APPEARANCE':'NO SAVED APPEARANCES';
 presetSelect.append(none);
 for(const preset of studioPresets){
  const option=document.createElement('option');option.value=preset.name;
  option.textContent=preset.name; presetSelect.append(option);
 }
 if(studioPresets.some(x=>x.name===selectedPreset))presetSelect.value=selectedPreset;
 const selectedName=presetSelect.value;
 presetApply.disabled=readOnly||comparingSaved||saveInFlight||!selectedName;
 presetDelete.disabled=readOnly||comparingSaved||saveInFlight||!selectedName;
 presetSave.disabled=readOnly||comparingSaved||saveInFlight||
  studioPresets.length>=STUDIO_PRESET_LIMIT;
 const p=member();
 const pair=p?pairedUniformFor(activeCategory,current(),p.loadout):null;
 matchSetButton.hidden=!pair;
 matchSetButton.disabled=readOnly||comparingSaved||saveInFlight||!pair||
  !canEquip(pair.slot,pair.id)||
  resolvedWardrobe(current(),member()!.loadout)[pair.slot]===pair.id;
 if(pair)matchSetButton.textContent='MATCH '+(pair.slot==='top'?'TOP':'TROUSERS')+
  ' · '+(pair.id==='gorka-trousers'?'GORKA':pair.id.includes('acu')?'ACU':'BDU');
}
function persistStudioPresets(){
 try{localStorage.setItem(STUDIO_PRESET_STORAGE_KEY,
  serializeStudioPresets(studioPresets));return true;}
 catch{say('PRESET SAVE BLOCKED BY BROWSER STORAGE');return false;}
}
compareButton.addEventListener('click',()=>{
 if(!dirty.has(selected))return;
 comparingSaved=!comparingSaved;refresh();
 say(comparingSaved?'PREVIEWING LAST SAVED LOOK · NO CHANGES APPLIED':
  'PREVIEWING YOUR UNSAVED CHANGES');
});
resetButton.addEventListener('click',()=>{
 if(readOnly||!dirty.has(selected))return;
 if(!window.confirm('Discard unsaved changes for this operator and restore the last saved look?'))return;
 edits.delete(selected);dirty.delete(selected);history.delete(selected);
 comparingSaved=false;refresh();say('RESTORED LAST SAVED LOOK');
 moreDetails.open=false;
});
presetSelect.addEventListener('change',renderPresetMenu);
presetSave.addEventListener('click',()=>{
 if(readOnly||comparingSaved)return;
 const name=window.prompt('Name this appearance-only preset (up to 32 characters):');
 if(name===null||!name.trim())return;
 const next=saveStudioPreset(studioPresets,name,current());
 if(next.length===studioPresets.length&&
  !studioPresets.some(x=>x.name.toLowerCase()===name.trim().toLowerCase())){
  say('MAXIMUM OF '+STUDIO_PRESET_LIMIT+' APPEARANCE PRESETS');return;
 }
 studioPresets=next;
 if(!persistStudioPresets())return;
 renderPresetMenu();presetSelect.value=name.trim().replace(/\s+/g,' ').slice(0,32);
 renderPresetMenu();say('APPEARANCE PRESET SAVED · NO EQUIPMENT');
});
presetApply.addEventListener('click',()=>{
 if(readOnly||comparingSaved)return;
 const item=studioPresets.find(x=>x.name===presetSelect.value);
 if(!item)return;
 changeWardrobe(outfitPresetForKit(item.wardrobe,member()!.loadout));
 say('PRESET APPLIED TO DRAFT · SAVE LOOK TO KEEP IT');
 moreDetails.open=false;
});
presetDelete.addEventListener('click',()=>{
 if(readOnly||comparingSaved||!presetSelect.value)return;
 const name=presetSelect.value;
 if(!window.confirm('Delete appearance preset "'+name+'"?'))return;
 studioPresets=deleteStudioPreset(studioPresets,name);
 if(!persistStudioPresets())return;
 renderPresetMenu();say('PRESET DELETED');
});
matchSetButton.addEventListener('click',()=>{
 const p=member();if(!p||readOnly||comparingSaved)return;
 const pair=pairedUniformFor(activeCategory,current(),p.loadout);
 if(!pair||!canEquip(pair.slot,pair.id))return;
 changeWardrobe(setWardrobeStyle(current(),pair.slot,pair.id));
 say('MATCHED '+(pair.slot==='top'?'TOP':'TROUSERS')+
  ' · FABRIC UNCHANGED · SAVE LOOK TO KEEP IT');
 moreDetails.open=false;
});
function refresh(){
 const p=member();if(!p)return;
 studioRoot.dataset.referenceOpen=String(referenceOpen);
 studioRoot.dataset.identityMode=String(identityMode);
 $('studioTitle').textContent=referenceOpen?'REFERENCE KITS / '+p.callsign:identityMode?'IDENTITY MARKINGS / '+p.callsign:APPEARANCE_GROUP_LABELS[activeCategory]+' / '+p.callsign;
 $('studioSubheading').textContent=readOnly?'LOCKED DURING ACTIVE OPERATION':
  'Select a 3D item, then edit materials and details';
 applyButton.disabled=readOnly||!dirty.size||saveInFlight;
 applyButton.textContent=saveInFlight?'SAVING…':dirty.size>1?
  'SAVE '+dirty.size+' LOOKS':dirty.size===1?'SAVE LOOK':'SAVED';
 modelSelector.disabled=saveInFlight;
 for(const option of Array.from(modelSelector.options)){
  const person=people.find(p=>p.id===option.value);
  if(person)option.textContent=person.callsign.toUpperCase()+
   (dirty.has(person.id)?' · UNSAVED':'');
 }
 compareButton.disabled=saveInFlight||!dirty.has(selected);
 compareButton.setAttribute('aria-pressed',String(comparingSaved));
 compareButton.textContent=comparingSaved?'EDITING ↔':'COMPARE';
 studioRoot.dataset.comparing=String(comparingSaved);
 modeLabel.textContent=(mode==='campaign'?'CAMPAIGN · PERSISTENT':
  'QUICK PLAY · APPEARANCE')+
  (dirty.size?' · '+dirty.size+' UNSAVED':'');
 undoButton.disabled=readOnly||saveInFlight||!(history.get(selected)?.length);
 renderCategories();
 // Reference catalog uses the shared 3D viewport, not the item thumbnail grid.
 if(!referenceOpen){
  if(!identityMode){
   thumbBrowser.setCategory(activeCategory,true);
   thumbBrowser.refresh(p.loadout,previewWardrobe(),p.id);
  }
  renderMaterials();
 }
 renderPresetMenu();referenceBrowser.refresh(readOnly);posePreview();
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
 identityMode=false;referenceOpen=false;referenceBrowser.hide();
 mode=data.mode;selected=data.selected;readOnly=data.readonly;
 comparingSaved=false;saveInFlight=false;
 people=data.members.map(p=>({...p,wardrobe:readWardrobe(p.wardrobe)}));
 history.clear();edits.clear();dirty.clear();
 populate();
 say(readOnly?'Active operation: appearance editing locked':
  mode==='campaign'?'CAMPAIGN · SAVE PERSISTENT APPEARANCE':
   'QUICK PLAY · COSMETICS PERSIST / COMBAT GEAR DOES NOT');
 resize();
 focusCameraOnCategory(activeCategory,true);
}
modelSelector.addEventListener('change',()=>{
 selected=modelSelector.value;activeStep='items';
 refresh();focusCameraOnCategory(activeCategory);
});
/** Save every operator draft as one transaction, not merely the selected
 * character. Switching operators never loses unsaved work. */
function pendingStudioEdits():StudioAppearanceEdit[]{
 return people.filter(p=>dirty.has(p.id)).map(p=>({
  id:p.id,wardrobe:readWardrobe(edits.get(p.id)??p.wardrobe)
 }));
}
function acknowledgeSave(ids:readonly string[]){
 for(const id of ids){
  const person=people.find(p=>p.id===id);
  if(person)person.wardrobe=readWardrobe(edits.get(id)??person.wardrobe);
  dirty.delete(id);edits.delete(id);history.delete(id);
 }
 comparingSaved=false;saveInFlight=false;
 refresh();
 say('SAVED '+ids.length+' LOOK'+(ids.length===1?'':'S')+
  ' · '+(mode==='campaign'?'CAMPAIGN':'QUICK PLAY')+' APPEARANCE ONLY');
}
function apply(){
 if(readOnly||saveInFlight||!dirty.size)return;
 const entries=pendingStudioEdits();
 if(!entries.length)return;
 saveInFlight=true;refresh();
 if(embedded){
  window.parent.postMessage({type:'fw-studio-commit-batch',entries},
   location.origin);
  say('SAVING '+entries.length+' OPERATOR LOOK'+
   (entries.length===1?'':'S')+'…');
  return;
 }
 try{
  if(mode==='quick'){
   const saved=freshQuickPlayRoster(readRoster(
    localStorage.getItem('fieldwork3d.quickplay-cosmetics.v1')));
   const next=applyStudioRosterEdits(saved,entries);
   if(!next)throw Error('Missing Quick Play operator');
   localStorage.setItem('fieldwork3d.quickplay-cosmetics.v1',
    serializeQuickPlayCosmetics(next));
  }else{
   const campaign=readCampaign(localStorage.getItem('fieldwork3d.campaign.v1'));
   if(!campaign)throw Error('No saved campaign');
   const updated=applyStudioCampaignEdits(campaign,entries);
   if(!updated)throw Error('Campaign operator or active mission is locked');
   localStorage.setItem('fieldwork3d.campaign.v1',JSON.stringify(updated));
  }
  acknowledgeSave(entries.map(e=>e.id));
 }catch{
  saveInFlight=false;refresh();
  say('SAVE REJECTED · RETAINED '+entries.length+' UNSAVED LOOKS');
 }
}
applyButton.addEventListener('click',apply);
function close(){
 if(dirty.size&&!window.confirm('Discard unsaved changes for '+
  dirty.size+' operator'+(dirty.size===1?'':'s')+'?'))return;
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
  }else if(data?.type==='fw-studio-batch-saved'){
   const response=data as {type:string;ids?:unknown;ok?:boolean};
   saveInFlight=false;
   if(response.ok&&Array.isArray(response.ids)&&
      response.ids.every(id=>typeof id==='string')){
    acknowledgeSave(response.ids as string[]);
   }else{
    refresh();
    say('SAVE REJECTED · ALL UNSAVED DRAFTS PRESERVED');
   }
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
