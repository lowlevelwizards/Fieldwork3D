/** Build 122: deterministic physical animation workbench.
 * Identical Build 119/120 rig and footstep scheduler as gameplay/replay.
 */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createOperatorRig,poseOperator,type OperatorRig}
  from './breach-operator-rig.ts';
import {weaponGrips,type Handling} from './breach-weapon-pose.ts';
import {stockPocket,elbowCorridor} from './breach-anatomy.ts';
import {HANDLING_PROFILES} from './breach-handling-profiles.ts';
import {weaponTruth,footTruth,legReachTruth} from './breach-animation-diagnostics.ts';
import {timedHandling,smoothHandling,type HandlingTransition}
  from './breach-handling-transition.ts';
import {lateralAxis,sideOffset,uncrossed} from './breach-locomotion.ts';
import {bodyFromContacts} from './breach-body-motion.ts';
import {LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,LEG_HIP_SIDE} from './breach-leg-geometry.ts';
import {LabMotionCache,LabHistoricalMotionCache,LabDistanceMotionCache,TRACK_DURATION,type LabTrack}
  from './breach-lab-tracks.ts';
import type {WeaponId} from './breach-combat.ts';
import {initialEquipmentLoadout,setEquipmentChoice,syncPrimaryWeapon,
 type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {carryPlacementLedger} from './equipment-carry-placement.ts';
import {itemsForSlot} from './equipment-catalog.ts';
import {bareLabEquipment,unequipLabAppearance} from './operator-lab-baseline.ts';
import {LEGACY_FRAME_YAW} from './operator-axis-convention.ts';
import {safeLabWindow,safeLabZoom,safeLabProjectionShift,
 type LabCameraFraming} from './operator-lab-camera-framing.ts';
import {operatorAttachmentPoint,type OperatorAttachmentZone}
 from './operator-attachment-zones.ts';
import {garmentFitWorldPoint,sampleGarmentFit,garmentFitDiagnosticLines,
 type GarmentFitAnchorId} from './operator-garment-fit.ts';
import {selectWardrobeItem} from './operator-wardrobe-unified.ts';
import {OperatorAppearanceGrid} from './operator-appearance-grid.ts';
import './operator-appearance-grid.css';
import {createWardrobeFabricCamoPicker} from './operator-fabric-camo-picker.ts';
import {topColorwayChoices,resolvedTopColorway} from './operator-upper-colorways.ts';
import {sleeveStateOptions} from './operator-wardrobe-data.ts';
import {FAMILY_PRESETS} from './equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from './equipment-weapon-assemblies.ts';
import {uniformCutCamoChoices,type UniformCompareCut}
 from './operator-uniform-cut-eligibility.ts';
import {uniformCompareKit,uniformCompareWardrobe,UNIFORM_COMPARE_LABELS,
 UNIFORM_COMPARE_DEFAULT_PRINTS} from './operator-uniform-comparison.ts';
import './operator-fabric-camo-picker.css';
import {MAX_WARDROBE_LOOKS,makeWardrobeLook,readWardrobeLooks,
 exportWardrobeLook,importWardrobeLook,type WardrobeLook}
 from './operator-wardrobe-storage.ts';
import {WARDROBE_ACCESSORY_SLOTS,WARDROBE_ACCESSORY_OPTIONS}
 from './operator-wardrobe-accessories.ts';
import {WARDROBE_MOUNTS,wardrobeMount} from './operator-wardrobe-mounts.ts';
import {WARDROBE_RECIPES,wardrobeRecipe,applyWardrobeRecipe}
 from './operator-wardrobe-recipes.ts';
import {HEADWEAR_SOLID_COLORS,headwearColorChoices,resolvedHeadwearSolid}
 from './operator-headwear-colors.ts';
import {HEADWEAR_CAMO_IDS,headwearCamoChoices,resolvedHeadwearCamo,headwearCamoSize,
 HEADWEAR_CAMO_RECIPES,HEADWEAR_CAMO_DENSITY,nextHeadwearCamoRoll,
 type HeadwearCamoId} from './operator-headwear-camo.ts';
import {CAMO_ORIGINS,filterCamoCatalog,type CamoFilter,type CamoOrigin}
 from './operator-headwear-camo-catalog.ts';
import {browseCamos,camoBrowseSection,camoSearchMatches,readCamoBrowserPrefs,
 recordCamoRecent,toggleCamoFavorite} from './operator-material-browser.ts';
import {appendCamoSectionHeading} from './operator-material-browser-ui.ts';
import {getCamoPreviewSource} from './operator-camo-preview-cache.ts';
import {initialWardrobe,readWardrobe,resolvedWardrobe,wardrobeConflicts,
 type WardrobeOptions} from './operator-wardrobe-data.ts';


let labKit:EquipmentLoadout=bareLabEquipment();
let labPalette=1;
let wardrobeOptions:WardrobeOptions=initialWardrobe();
/** URL opt-in development inspector, not a second character renderer. */
const poseFitMode=new URLSearchParams(location.search).get('poseFit')==='1';
const poseV4ReloadPreview=new URLSearchParams(location.search).get('poseV4')==='1';
const poseV3Preview=poseV4ReloadPreview||
 new URLSearchParams(location.search).get('poseV3')==='1';
/** Use the actual action clock while preserving the Pose Fit weapon/armor. */
const poseV3Action=poseFitMode&&poseV3Preview&&
 (poseV4ReloadPreview||
  new URLSearchParams(location.search).get('poseV3Action')==='1');
const poseFitStatic=poseFitMode&&!poseV3Action;
let poseFitPreset='ar-m4a1',poseFitArmor='plate-jpc';
let poseFitRig='no-rig',poseFitTop='bdu-shirt';
let poseFitOutput:HTMLOutputElement|null=null;
if(poseFitMode){
 document.body.classList.add('pose-fit-mode');
 const panel=document.createElement('details');
 panel.id='poseFitPanel';
 panel.open=true;panel.setAttribute('aria-label','Pose Fit Inspector');
 panel.style.cssText='position:fixed;z-index:9;top:calc(env(safe-area-inset-top) + 65px);'+
  'right:8px;width:min(290px,calc(100vw - 16px));'+
  'max-height:42dvh;overflow-y:auto;padding:9px;border:1px solid #c8ac72;'+
  'border-radius:8px;background:#20352ff0;color:#e8e6da;'+
  'touch-action:pan-y;font:11px monospace';
 const heading=document.createElement('summary');
 heading.textContent='POSE FIT · AR / AK';heading.style.cursor='pointer';
 panel.append(heading);
 const picker=(label:string,options:readonly (readonly [string,string])[],
  current:string,set:(value:string)=>void)=>{
  const field=document.createElement('label');
  field.style.cssText='display:grid;gap:3px;margin-top:7px';
  field.textContent=label;
  const select=document.createElement('select');select.style.width='100%';
  for(const [id,title] of options){
   const opt=document.createElement('option');
   opt.value=id;opt.textContent=title;select.add(opt);
  }
  select.value=current;select.addEventListener('change',()=>{
   set(select.value);draw();
  });
  field.append(select);panel.append(field);
 };
 picker('Weapon',FAMILY_PRESETS.map(p=>[p.id,p.name] as const),
  poseFitPreset,x=>{poseFitPreset=x});
 picker('Armor',[['armor-bare','Bare'],['plate-slick','Slick'],
  ['plate-jpc','JPC'],['plate-standard','Standard'],['plate-heavy','Heavy'],
  ['plate-legacy','Legacy'],['soft-flak','Flak']],poseFitArmor,
  x=>{poseFitArmor=x});
 picker('Rig',[['no-rig','None'],['chest-placard','Placard'],
  ['full-chest','Full Chest'],['chicom-rig','Chicom'],
  ['sadf-webbing','SADF']],poseFitRig,x=>{poseFitRig=x});
 picker('Uniform',[['bdu-shirt','BDU'],['acu-shirt','ACU'],
  ['combat-shirt','Combat'],['smock-jacket','Smock']],
  poseFitTop,x=>{poseFitTop=x});
 poseFitOutput=document.createElement('output');
 poseFitOutput.style.cssText='display:block;margin:8px 0;white-space:pre-wrap';
 panel.append(poseFitOutput);
 const copy=document.createElement('button');copy.textContent='COPY POSE REPORT';
 copy.type='button';copy.addEventListener('click',()=>{
  const info={preset:poseFitPreset,armor:poseFitArmor,rig:poseFitRig,
   top:poseFitTop,status:rig?.root.userData.lowReadyPoseReport,
   leftHand:rig?.arms[0].hand.position.toArray(),
   rightHand:rig?.arms[1].hand.position.toArray(),
   stock:rig?.weapon.position.toArray(),camera:camera.position.toArray()};
  void navigator.clipboard?.writeText(JSON.stringify(info,null,2));
 });
 panel.append(copy);document.body.append(panel);
}
let appearanceGrid:OperatorAppearanceGrid|null=null;
/** One-step Lab-only undo: snapshot display choices, never owned inventory. */
type AppearanceSnapshot={kit:EquipmentLoadout;wardrobe:WardrobeOptions;
 weapon:string;magazines:string;face:string;seed:number};
let previousAppearance:AppearanceSnapshot|null=null;
const wardrobeUndoButton=document.getElementById('wardrobeUndo') as HTMLButtonElement;
function checkpointAppearance(){
 previousAppearance={
  kit:{...labKit,slots:{...labKit.slots}},
  wardrobe:readWardrobe(wardrobeOptions),
  weapon:(document.getElementById('weapon') as HTMLSelectElement).value,
  magazines:(document.getElementById('kitMagazines') as HTMLSelectElement).value,
  face:(document.getElementById('faceTreatment') as HTMLSelectElement).value,
  seed:labPalette
 };
 wardrobeUndoButton.disabled=false;
}
function undoAppearance(){
 const restore=previousAppearance;if(!restore)return;
 previousAppearance=null;wardrobeUndoButton.disabled=true;
 labKit=restore.kit;wardrobeOptions=restore.wardrobe;labPalette=restore.seed;
 (document.getElementById('weapon') as HTMLSelectElement).value=restore.weapon;
 (document.getElementById('kitMagazines') as HTMLSelectElement).value=restore.magazines;
 (document.getElementById('faceTreatment') as HTMLSelectElement).value=restore.face;
 syncKit();updateMagazineState();

}
wardrobeUndoButton.addEventListener('click',undoAppearance);

const kitSelects=Array.from(document.querySelectorAll<HTMLSelectElement>('[data-kit-slot]'));
for(const select of kitSelects){
 const slot=select.dataset.kitSlot as LoadoutSlot;
 for(const item of itemsForSlot(slot)){
  const option=document.createElement('option');
  option.value=item.id;
  option.textContent=item.id==='tactical-smoke'?
    item.name+' (visual preview only)':item.name;
  select.append(option);
 }
 select.addEventListener('change',()=>{
  checkpointAppearance();labKit=setEquipmentChoice(labKit,slot,select.value);syncKit();
 });
}
const kitPresets:Record<string,Partial<Record<LoadoutSlot,string>>>={
 light:{head:'head-none',armor:'armor-none',rig:'rig-none',belt:'belt-light',
 backpack:'backpack-none',top:'top-light',legs:'legs-light',feet:'feet-light',
 medical:'medical-none',tactical:'tactical-none',utility:'utility-none'},
 standard:{head:'head-helmet',armor:'armor-soft',rig:'rig-light',
 belt:'belt-standard',backpack:'backpack-day',top:'top-uniform',
 legs:'legs-field',feet:'feet-boots'},
 heavy:{head:'head-helmet',armor:'armor-carrier',rig:'rig-full',
 belt:'belt-standard',backpack:'backpack-field',top:'top-uniform',
 legs:'legs-field',feet:'feet-boots',medical:'medical-trauma',
 tactical:'tactical-flash',utility:'utility-breach'}
};
function kitPreset(name:string){
 let next=initialEquipmentLoadout();
 for(const [slot,id] of Object.entries(kitPresets[name]??{}))
  next=setEquipmentChoice(next,slot as LoadoutSlot,id);
 return next;
}
/** The Lab can display synthetic magazines, but their storage locations
 * must be the real game's authoritative placement projection. Shotguns use
 * individually loaded shells and have no detachable magazines. */
function previewCarry(kit:EquipmentLoadout,weapon:WeaponId){
 const requested=(document.getElementById('weapon') as HTMLSelectElement).value==='none'||
  weapon==='shotgun'?0:
   Number((document.getElementById('kitMagazines') as HTMLSelectElement).value);
 const sample:MagazineItem[]=Array.from({length:requested},(_,i)=>({
  id:'lab-preview/'+i,weapon,rounds:1
 }));
 return carryPlacementLedger(kit,sample);
}
function syncKit(){
 for(const select of kitSelects)
  select.value=labKit.slots[select.dataset.kitSlot as LoadoutSlot];
 syncWardrobe();
}
const recipeSelect=document.getElementById('wardrobeRecipe') as HTMLSelectElement;
for(const recipe of WARDROBE_RECIPES){
 const option=document.createElement('option');option.value=recipe.id;
 option.textContent=recipe.name+' · '+recipe.category.toUpperCase();
 recipeSelect.append(option);
}
document.getElementById('wardrobeApply')?.addEventListener('click',()=>{
 const recipe=wardrobeRecipe(recipeSelect.value);if(!recipe)return;
 const result=applyWardrobeRecipe(recipe);
 checkpointAppearance();labKit=result.kit;wardrobeOptions=result.wardrobe;
 (document.getElementById('weapon') as HTMLSelectElement).value=
  result.kit.slots.primary.replace(/^primary-/,'');
 // Archived color wheels are retired; headwear receives its own swatch.
 labPalette=1;
 syncKit();updateMagazineState();

});
const cosmeticMountSelects=Array.from(
 document.querySelectorAll<HTMLSelectElement>('[data-wardrobe-accessory]'));
for(const select of cosmeticMountSelects){
 const slot=select.dataset.wardrobeAccessory as
  typeof WARDROBE_ACCESSORY_SLOTS[number];
 for(const id of WARDROBE_ACCESSORY_OPTIONS[slot]){
  const option=document.createElement('option');option.value=id;
  option.textContent=id.replaceAll('-',' ').toUpperCase();
  select.append(option);
 }
 select.addEventListener('change',()=>{
  checkpointAppearance();wardrobeOptions={...wardrobeOptions,accessories:{
   ...wardrobeOptions.accessories,[slot]:select.value
  }};
  syncWardrobe();
 });
}
const mountSelectors=Array.from(document.querySelectorAll<HTMLSelectElement>(
 '[data-wardrobe-mount]'));
for(const select of mountSelectors){
 const kind=select.dataset.wardrobeMount as 'medical'|'utility';
 const automatic=document.createElement('option');
 automatic.value='auto';automatic.textContent='AUTO ARRANGE';
 select.append(automatic);
 for(const mount of WARDROBE_MOUNTS.filter(m=>m.kind===kind)){
  const option=document.createElement('option');
  option.value=mount.id;option.textContent=mount.name+' · '+mount.location;
  select.append(option);
 }
 select.addEventListener('change',()=>{
  checkpointAppearance();wardrobeOptions={...wardrobeOptions,mounts:{
   ...wardrobeOptions.mounts,
   [kind]:select.value==='auto'?undefined:select.value
  }};
  syncWardrobe();
 });
}
document.getElementById('wardrobeMagazineOrder')?.addEventListener('change',e=>{
 checkpointAppearance();wardrobeOptions={...wardrobeOptions,mounts:{
  ...wardrobeOptions.mounts,
  magazineOrder:(e.target as HTMLSelectElement).value==='right-left'?
   'right-left':'left-right'
 }};
});
// This library stores style recipes, never personnel health or actual stock.
const LOOKS_KEY='fieldwork.operator-wardrobe.looks.v1';
const outfitSelect=document.getElementById('outfitSelect') as HTMLSelectElement;
const outfitStatus=document.getElementById('outfitStatus') as HTMLOutputElement;
const outfitTransfer=document.getElementById('outfitTransfer') as HTMLTextAreaElement;
const outfitName=document.getElementById('outfitName') as HTMLInputElement;
let savedLooks:WardrobeLook[]=[];
try{savedLooks=readWardrobeLooks(JSON.parse(localStorage.getItem(LOOKS_KEY)??'[]'));}
catch{savedLooks=[];}
function updateSavedLooks(){
 const selected=outfitSelect.value;
 outfitSelect.replaceChildren();
 for(const look of savedLooks){
  const opt=document.createElement('option');opt.value=look.id;
  opt.textContent=look.name;outfitSelect.append(opt);
 }
 if(savedLooks.some(x=>x.id===selected))outfitSelect.value=selected;
}
function persistLooks(){
 try{localStorage.setItem(LOOKS_KEY,JSON.stringify(savedLooks));return true;}
 catch{outfitStatus.textContent='Local storage unavailable';return false;}
}
function applyLook(look:WardrobeLook){
 labKit=look.kit;wardrobeOptions=look.wardrobe;
 (document.getElementById('weapon') as HTMLSelectElement).value=
  look.weaponVisible===false?'none':look.kit.slots.primary.replace(/^primary-/,'');
 labPalette=1;
 syncKit();updateMagazineState();

}
document.getElementById('outfitSave')?.addEventListener('click',()=>{
 const look=makeWardrobeLook(outfitName.value,labKit,wardrobeOptions,
  undefined,(document.getElementById('weapon') as HTMLSelectElement).value!=='none');
 const existing=savedLooks.findIndex(x=>x.id===look.id);
 if(existing>=0)savedLooks[existing]=look;
 else if(savedLooks.length<MAX_WARDROBE_LOOKS)savedLooks.push(look);
 else{outfitStatus.textContent='Maximum 24 outfits';return;}
 persistLooks();updateSavedLooks();outfitSelect.value=look.id;
 outfitStatus.textContent='Outfit recipe saved locally';
});
document.getElementById('outfitLoad')?.addEventListener('click',()=>{
 const look=savedLooks.find(x=>x.id===outfitSelect.value);
 if(!look)return;checkpointAppearance();applyLook(look);outfitStatus.textContent='Outfit loaded';
});
document.getElementById('outfitExport')?.addEventListener('click',()=>{
 const look=savedLooks.find(x=>x.id===outfitSelect.value)??
  makeWardrobeLook(outfitName.value,labKit,wardrobeOptions,
   undefined,(document.getElementById('weapon') as HTMLSelectElement).value!=='none');
 outfitTransfer.value=exportWardrobeLook(look);
 outfitTransfer.focus();outfitTransfer.select();
 outfitStatus.textContent='Copy this outfit JSON to share it';
});
document.getElementById('outfitImport')?.addEventListener('click',()=>{
 const look=importWardrobeLook(outfitTransfer.value);
 if(!look){outfitStatus.textContent='Invalid outfit format';return;}
 const idx=savedLooks.findIndex(x=>x.id===look.id);
 if(idx>=0)savedLooks[idx]=look;
 else if(savedLooks.length<MAX_WARDROBE_LOOKS)savedLooks.push(look);
 else{outfitStatus.textContent='Maximum 24 outfits';return;}
 persistLooks();updateSavedLooks();outfitSelect.value=look.id;
 checkpointAppearance();applyLook(look);outfitStatus.textContent='Outfit imported';
});
updateSavedLooks();
// Legacy item dropdowns are gone; the 3D grid is authoritative.
/** Visual color picker: no universal palette, no color dropdown and no
 * visually repetitive named options. Names are accessible labels and the
 * selected-color confirmation only; the controls themselves are swatches.
 */
const solidChooser=document.getElementById('headwearSolidChooser') as HTMLElement;
const solidGrid=document.getElementById('headwearColorGrid') as HTMLElement;
const solidStatus=document.getElementById('headwearColorChoice') as HTMLOutputElement;
function renderHeadwearSolidSwatches(id:string){
 const colors=headwearColorChoices(id);
 solidChooser.hidden=colors.length===0;
 solidGrid.replaceChildren();
 if(!colors.length){solidStatus.textContent='';return;}
 const selected=resolvedHeadwearSolid(id,wardrobeOptions.headwearColor);
 for(const color of colors){
  const definition=HEADWEAR_SOLID_COLORS[color];
  const button=document.createElement('button');
  button.type='button';
  button.className='headwear-color-swatch';
  button.style.backgroundColor='#'+definition.hex.toString(16).padStart(6,'0');
  button.setAttribute('aria-label',definition.label);
  button.title=definition.label;
  button.setAttribute('aria-pressed',String(selected===color&&!wardrobeOptions.headwearCamo));
  button.dataset.headwearColor=color;
  button.addEventListener('click',()=>{
   checkpointAppearance();wardrobeOptions={...wardrobeOptions,headwearColor:color,headwearCamo:undefined};
   renderHeadwearSolidSwatches(id);
   renderHeadwearCamoSwatches(id);
  });
  solidGrid.append(button);
 }
 solidStatus.textContent=wardrobeOptions.headwearCamo?
  'CAMO ACTIVE · TAP A SOLID TO RESTORE':
  selected?HEADWEAR_SOLID_COLORS[selected].label+' · SOLID':'';
}


const camoChooser=document.getElementById('headwearCamoChooser') as HTMLElement;
const camoGrid=document.getElementById('headwearCamoGrid') as HTMLElement;
const camoCompareGrid=document.getElementById('headwearCamoCompareGrid') as HTMLElement;
const camoCompareDetails=document.getElementById('headwearCamoCompareDetails') as HTMLDetailsElement;
const camoTerrainFilter=document.getElementById('camoTerrainFilter') as HTMLSelectElement;
const camoStyleFilter=document.getElementById('camoStyleFilter') as HTMLSelectElement;
const camoOriginFilter=document.getElementById('camoOriginFilter') as HTMLSelectElement;
const camoSearchFilter=document.getElementById('camoSearchFilter') as HTMLInputElement;
const camoCompatibleFilter=document.getElementById('camoCompatibleFilter') as HTMLInputElement;
const camoFavoriteFilter=document.getElementById('camoFavoriteFilter') as HTMLInputElement;
const camoBrowseSummary=document.getElementById('camoBrowseSummary') as HTMLOutputElement;
const camoBrowseEmpty=document.getElementById('camoBrowseEmpty') as HTMLElement;
const camoRecentRow=document.getElementById('camoRecentRow') as HTMLElement;
let camoFavorites=new Set<HeadwearCamoId>();
let camoRecents:HeadwearCamoId[]=[];
function syncCamoBrowserPreferences(){
 const prefs=readCamoBrowserPrefs();
 camoFavorites=new Set(prefs.favorites);camoRecents=prefs.recents;
}
syncCamoBrowserPreferences();
for(const origin of CAMO_ORIGINS){
 const o=document.createElement('option');o.value=origin;o.textContent=origin.toUpperCase();
 camoOriginFilter.append(o);
}
function currentCamoFilter():CamoFilter{
 return {
  terrain:camoTerrainFilter.value as CamoFilter['terrain'],
  style:camoStyleFilter.value as CamoFilter['style'],
  origin:camoOriginFilter.value as CamoOrigin|'all',
  text:camoSearchFilter.value,
  onlyCompatible:camoCompatibleFilter.checked,
  onlyFavorites:camoFavoriteFilter.checked
 };
}
for(const control of [camoTerrainFilter,camoStyleFilter,camoOriginFilter,
 camoCompatibleFilter,camoFavoriteFilter]){
 control.addEventListener('change',()=>renderHeadwearCamoSwatches(
  resolvedWardrobe(wardrobeOptions,labKit).headwear));
}
camoSearchFilter.addEventListener('input',()=>renderHeadwearCamoSwatches(
 resolvedWardrobe(wardrobeOptions,labKit).headwear));
camoCompareDetails.addEventListener('toggle',()=>{
 if(camoCompareDetails.open)renderHeadwearCamoSwatches(
  resolvedWardrobe(wardrobeOptions,labKit).headwear);
 else camoCompareGrid.replaceChildren();
});

const camoInspector=document.getElementById('headwearCamoInspector') as HTMLElement;
const camoStatus=document.getElementById('headwearCamoChoice') as HTMLOutputElement;
const camoReroll=document.getElementById('headwearCamoReroll') as HTMLButtonElement;
camoReroll.addEventListener('click',()=>{
 if(!wardrobeOptions.headwearCamo)return;
 checkpointAppearance();wardrobeOptions={...wardrobeOptions,
  headwearCamoRoll:nextHeadwearCamoRoll(wardrobeOptions.headwearCamoRoll)};
 renderHeadwearCamoSwatches(resolvedWardrobe(wardrobeOptions,labKit).headwear);
});
/** Nearest-neighbor previews use the exact native 32px/64px RGBA artwork
 * as live material atlas. The right panel is a literal 3x3 repetition.
 * No canvas noise, gradients, bilinear resampling or preview-only art.
 */
function paintHeadwearCamo(canvas:HTMLCanvasElement,id:HeadwearCamoId,repeats:number){
 const source=getCamoPreviewSource(id),tileSize=source.width,size=tileSize*repeats;
 if(canvas.width!==size||canvas.height!==size)canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,size,size);
 for(let row=0;row<repeats;row++)for(let col=0;col<repeats;col++)
  ctx.drawImage(source,col*tileSize,row*tileSize);
}
function applyHeadwearCamoChoice(id:HeadwearCamoId,selected:HeadwearCamoId|null,model:string){
 checkpointAppearance();recordCamoRecent(id);syncCamoBrowserPreferences();
 wardrobeOptions={...wardrobeOptions,headwearCamo:id,
  headwearCamoRoll:selected===id?
   nextHeadwearCamoRoll(wardrobeOptions.headwearCamoRoll):0};
 renderHeadwearSolidSwatches(model);renderHeadwearCamoSwatches(model);
}
/** Compare identical raw/tiled images at fixed CSS dimensions. Only the
 * selected item is rendered in actual 3D using the Lab's shared camera,
 * lighting and pose. This study does not substitute a mock helmet render.
 */
function renderHeadwearCamoComparison(model:string,selected:HeadwearCamoId|null){
 const allowed:readonly HeadwearCamoId[]=headwearCamoChoices(model).filter(id=>id!=='splittertarn-31');
 camoCompareGrid.replaceChildren();
 if(!camoCompareDetails.open)return; // Avoid 60 large canvases on every mobile swatch.
 for(const id of HEADWEAR_CAMO_IDS.filter(id=>id!=='splittertarn-31')){
  const recipe=HEADWEAR_CAMO_RECIPES[id],canApply=allowed.includes(id);
  const button=document.createElement('button');
  button.type='button';button.className='camo-study';
  button.dataset.camoStudy=id;button.disabled=!canApply;
  button.setAttribute('aria-pressed',String(selected===id&&canApply));
  button.setAttribute('aria-label',recipe.label+
   (canApply?' · apply to selected headgear':' · unavailable on selected headgear'));
  const heading=document.createElement('span');heading.className='camo-study-title';
  heading.textContent=recipe.label;
  const views=document.createElement('div');views.className='camo-study-views';
  for(const [repeat,label] of [[1,'RAW'],[3,'TILED']] as const){
   const figure=document.createElement('figure');
   const canvas=document.createElement('canvas');
   canvas.setAttribute('aria-hidden','true');paintHeadwearCamo(canvas,id,repeat);
   const caption=document.createElement('figcaption');caption.textContent=label;
   figure.append(canvas,caption);views.append(figure);
  }
  const density=document.createElement('span');density.className='camo-study-density';
  density.textContent=headwearCamoSize(id)+'px MASTER · '+HEADWEAR_CAMO_DENSITY[id]+
   '× PRINT'+(canApply?'':' · INCOMPATIBLE');
  button.append(heading,views,density);
  if(canApply)button.addEventListener('click',()=>applyHeadwearCamoChoice(id,selected,model));
  camoCompareGrid.append(button);
 }
}
function renderHeadwearCamoSwatches(model:string){
 syncCamoBrowserPreferences();
 const choices:readonly HeadwearCamoId[]=headwearCamoChoices(model).filter(id=>id!=='splittertarn-31');
 const compatible=new Set(choices);
 camoChooser.hidden=choices.length===0;camoGrid.replaceChildren();
 camoInspector.hidden=choices.length===0;
 if(!choices.length){
  camoStatus.textContent='';camoReroll.hidden=true;
  camoRecentRow.replaceChildren();camoRecentRow.hidden=true;
  camoCompareGrid.replaceChildren();return;
 }
 const selected=resolvedHeadwearCamo(model,wardrobeOptions.headwearCamo);
 renderHeadwearCamoComparison(model,selected);
 const filter=currentCamoFilter();
 const filtered=filterCamoCatalog({...filter,text:''},choices,camoFavorites)
  .filter(id=>camoSearchMatches(id,filter.text));
 const visible=browseCamos(filtered,{active:selected,
  reference:wardrobeOptions.fabricCamo?.top??null,
  prefs:{favorites:[...camoFavorites],recents:camoRecents}});
 camoBrowseSummary.textContent=visible.length+' OF '+HEADWEAR_CAMO_IDS.length+
  ' PATTERNS · '+choices.length+' COMPATIBLE'+
  (selected?' · EQUIPPED: '+HEADWEAR_CAMO_RECIPES[selected].label:'');
 camoBrowseEmpty.hidden=visible.length!==0;
 camoRecentRow.replaceChildren();
 for(const id of camoRecents.filter(c=>compatible.has(c)).slice(0,4)){
  const button=document.createElement('button');button.type='button';
  button.textContent=HEADWEAR_CAMO_RECIPES[id].label;
  button.setAttribute('aria-label','Apply recently used '+HEADWEAR_CAMO_RECIPES[id].label);
  button.addEventListener('click',()=>applyHeadwearCamoChoice(id,selected,model));
  camoRecentRow.append(button);
 }
 camoRecentRow.hidden=camoRecentRow.children.length===0;
 let section='';
 for(const id of visible){
  section=appendCamoSectionHeading(camoGrid,camoBrowseSection(id,{
   state:{sort:'smart'},active:selected,reference:wardrobeOptions.fabricCamo?.top??null,
   prefs:{favorites:[...camoFavorites],recents:camoRecents}}),section);
  const recipe=HEADWEAR_CAMO_RECIPES[id],canApply=compatible.has(id);
  const wrapper=document.createElement('div');wrapper.className='camo-card';
  const button=document.createElement('button');button.type='button';
  button.className='camo-entry';button.dataset.headwearCamo=id;
  button.disabled=!canApply;
  button.title=recipe.label+' · '+recipe.description;
  button.setAttribute('aria-label',(canApply?'Apply ':'Unavailable for current headwear: ')+recipe.label);
  button.setAttribute('aria-pressed',String(selected===id));
  const image=document.createElement('canvas');image.width=32;image.height=32;
  image.setAttribute('aria-hidden','true');paintHeadwearCamo(image,id,1);
  const caption=document.createElement('span');caption.textContent=recipe.label;
  button.append(image,caption);
  if(canApply)button.addEventListener('click',()=>applyHeadwearCamoChoice(id,selected,model));
  const favorite=document.createElement('button');
  favorite.type='button';favorite.className='camo-favorite';
  favorite.textContent=camoFavorites.has(id)?'★':'☆';
  favorite.setAttribute('aria-label',(camoFavorites.has(id)?'Unfavorite ':'Favorite ')+recipe.label);
  favorite.setAttribute('aria-pressed',String(camoFavorites.has(id)));
  favorite.addEventListener('click',()=>{
   toggleCamoFavorite(id);renderHeadwearCamoSwatches(model);
  });
  wrapper.append(button,favorite);camoGrid.append(wrapper);
 }
 camoReroll.hidden=!selected;
 const preview=selected??choices[0];
 const origCaption=document.getElementById('headwearCamoOriginalCaption');
 if(origCaption)origCaption.textContent='ORIGINAL · '+headwearCamoSize(preview)+'×'+
  headwearCamoSize(preview)+' PIXELS';
 paintHeadwearCamo(document.getElementById('headwearCamoArt') as HTMLCanvasElement,preview,1);
 paintHeadwearCamo(document.getElementById('headwearCamoTiled') as HTMLCanvasElement,preview,3);
 camoStatus.textContent=HEADWEAR_CAMO_RECIPES[preview].label+
  (selected?' · APPLIED TO LIVE MODEL':' · PREVIEW ONLY — TAP TO APPLY')+
  (selected?' · VARIATION '+((wardrobeOptions.headwearCamoRoll??0)+1):'')+
  ' · '+headwearCamoSize(preview)+'px MASTER · '+
  HEADWEAR_CAMO_DENSITY[preview]+'× PRINT PIXELS / UNIT · '+
  HEADWEAR_CAMO_RECIPES[preview].description;
}

function syncWardrobe(){
 renderFabricPicker();
 const compatible=resolvedWardrobe(wardrobeOptions,labKit);
 renderHeadwearSolidSwatches(compatible.headwear);
 renderHeadwearCamoSwatches(compatible.headwear);
 for(const select of cosmeticMountSelects){
  const slot=select.dataset.wardrobeAccessory as
    typeof WARDROBE_ACCESSORY_SLOTS[number];
  select.value=wardrobeOptions.accessories[slot];
 }
 const weaponId=(document.getElementById('weapon') as HTMLSelectElement).value as WeaponId;
 const realKit=syncPrimaryWeapon(labKit,weaponId);
 const carrying=previewCarry(realKit,weaponId);
 for(const select of mountSelectors){
  const kind=select.dataset.wardrobeMount as 'medical'|'utility';
  const item=carrying.find(c=>c.kind===kind);
  for(const option of Array.from(select.options)){
   const candidate=wardrobeMount(option.value);
   const long=kind==='utility'&&
    ['utility-breach','utility-pry','utility-cutter'].includes(realKit.slots.utility);
   option.disabled=!!candidate&&(!item||candidate.location!==item.location||
    candidate.socket.bone==='pack'&&realKit.slots.backpack==='backpack-none'||
    long&&!candidate.longAllowed);
  }
  const requested=wardrobeOptions.mounts[kind]??'auto';
  select.value=Array.from(select.options).some(o=>o.value===requested&&!o.disabled)?
   requested:'auto';
 }
 (document.getElementById('wardrobeMagazineOrder') as HTMLSelectElement).value=
  wardrobeOptions.mounts.magazineOrder;
 appearanceGrid?.refresh(labKit,wardrobeOptions);
 const sleeveSelect=document.getElementById('wardrobeSleeveState') as HTMLSelectElement;
 sleeveSelect.value=wardrobeOptions.sleeveState;
 sleeveSelect.disabled=sleeveStateOptions(compatible.top).length===1;
 const colors=topColorwayChoices(compatible.top);
 const colorRow=document.getElementById('wardrobeColorwayRow') as HTMLLabelElement;
 const colorSelect=document.getElementById('wardrobeTopColorway') as HTMLSelectElement;
 colorRow.hidden=colors.length===0;
 colorSelect.replaceChildren();
 for(const [id,label] of colors){
  const option=document.createElement('option');option.value=id;
  option.textContent=label;colorSelect.append(option);
 }
 colorSelect.value=resolvedTopColorway(compatible.top,wardrobeOptions.topColorway);
 const hemSelect=document.getElementById('wardrobeTrouserHem') as HTMLSelectElement;
 hemSelect.value=wardrobeOptions.trouserHem;
 hemSelect.disabled=!['bdu-trousers','acu-trousers','gorka-trousers'].includes(compatible.trousers)
  ||compatible.footwear==='bare-feet';
 const incompatible=wardrobeConflicts(wardrobeOptions,labKit);
 document.getElementById('wardrobeCompatibility')!.textContent=incompatible.length?
  'Style unavailable for current kit: '+incompatible.join(', '):
  'Compatible visual styles. Gameplay equipment is unchanged.';
}
document.getElementById('wardrobeTopColorway')?.addEventListener('change',e=>{
 checkpointAppearance();
 const top=resolvedWardrobe(wardrobeOptions,labKit).top;
 const selected=resolvedTopColorway(top,(e.target as HTMLSelectElement).value);
 wardrobeOptions={...wardrobeOptions,topColorway:selected};
 syncWardrobe();
});
for(const [id,field] of [
 ['wardrobeSleeveState','sleeveState'],
 ['wardrobeTrouserHem','trouserHem']
] as const){
 document.getElementById(id)?.addEventListener('change',e=>{
  checkpointAppearance();
  const value=(e.target as HTMLSelectElement).value;
  wardrobeOptions={...wardrobeOptions,[field]:value};
  syncWardrobe();
 });
}
const fabricPickerState:{expanded:boolean;openChannel:null|import('./operator-fabric-camo-policy.ts').FabricCamoChannel;filter:string}={
 expanded:false,openChannel:null,filter:''
};
function renderFabricPicker(){
 const target=document.getElementById('wardrobeFabricCamo');
 if(!target)return;
 target.replaceChildren(createWardrobeFabricCamoPicker(labKit,wardrobeOptions,next=>{
  checkpointAppearance();
  wardrobeOptions=next;syncWardrobe();
 },fabricPickerState));
}
document.getElementById('wardrobeReset')?.addEventListener('click',()=>{
 checkpointAppearance();wardrobeOptions=initialWardrobe();syncWardrobe();
});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-kit-preset]'))
 button.addEventListener('click',()=>{
  checkpointAppearance();labKit=kitPreset(button.dataset.kitPreset??'standard');
  wardrobeOptions=initialWardrobe();
  (document.getElementById('weapon') as HTMLSelectElement).value='carbine';
  updateMagazineState();syncKit();
 });

syncKit();
const choose=<T extends HTMLElement>(id:string)=>
  document.getElementById(id)! as T;
const canvas=choose<HTMLCanvasElement>('preview');
const showLabFailure=(error:unknown)=>{
  const title=choose<HTMLElement>('labStatusTitle');
  const message=choose<HTMLElement>('labStatusMessage');
  title.textContent='OPERATOR LAB COULD NOT START';
  message.textContent=error instanceof Error?error.message:String(error);
  choose<HTMLElement>('labStatus').hidden=false;
  canvas.dataset.ready='error';
};
// Mobile Safari is especially sensitive to large antialiased WebGL
// backbuffers when navigating here from the 3D battle. Keep the operator
// shaded, but avoid allocating an oversized first frame.
const compact=window.matchMedia('(pointer:coarse)').matches||
  window.innerWidth<600;
const renderer=new THREE.WebGLRenderer({
  canvas,antialias:!compact,powerPreference:'low-power',
  alpha:false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,compact?1.5:2));
renderer.shadowMap.enabled=true;renderer.setClearColor(0xc4c5bd);
appearanceGrid=new OperatorAppearanceGrid(
 document.getElementById('appearanceItemBrowser')!,renderer,(slot,id)=>{
  const choice=selectWardrobeItem(labKit,wardrobeOptions,slot,id);
  if(resolvedWardrobe(choice.wardrobe,choice.kit)[slot]!==id)return;
  checkpointAppearance();
  labKit=choice.kit;wardrobeOptions=choice.wardrobe;
  syncKit();
  // Actual 3D thumbnails already expose silhouettes for every item. The
  // chosen model itself continues to use the unmodified Lab camera/IK.
  const status=document.getElementById('headwearReviewStatus');
  if(slot==='headwear'&&status)
   status.textContent=id==='bare'?'UNCOVERED HEAD':
    'SELECTED '+id.replaceAll('-',' ').toUpperCase()+
    ' · original approved headwear model';
 });
appearanceGrid.refresh(labKit,wardrobeOptions);
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-28,28,34,-34,.1,600);
camera.position.set(65,48,68);
const control=new OrbitControls(camera,canvas);
control.enableDamping=true;control.dampingFactor=.11;
control.target.set(0,16,0);control.minZoom=.18;control.maxZoom=7;
scene.add(new THREE.HemisphereLight(0xffffff,0x8f9188,2.2));
const lamp=new THREE.DirectionalLight(0xffffff,2.3);
lamp.position.set(-40,90,45);lamp.castShadow=true;
lamp.shadow.mapSize.set(compact?512:1024,compact?512:1024);lamp.shadow.camera.left=-90;
lamp.shadow.camera.right=90;lamp.shadow.camera.top=90;
lamp.shadow.camera.bottom=-90;scene.add(lamp);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),
  new THREE.MeshStandardMaterial({color:0xaeb1aa,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
scene.add(new THREE.GridHelper(280,28,0x8b9791,0xb4bbb5));
const doorProp=new THREE.Group();
const panel=new THREE.Mesh(new THREE.BoxGeometry(3,37,23),
  new THREE.MeshStandardMaterial({color:0x998262,roughness:.85}));
panel.position.set(28,18.5,0);doorProp.add(panel);
const knob=new THREE.Mesh(new THREE.BoxGeometry(3.4,2.4,2.4),
  new THREE.MeshStandardMaterial({color:0xd6c28e}));
knob.position.set(25.5,20,8);doorProp.add(knob);
scene.add(doorProp);
const operator=choose<HTMLSelectElement>('operator'),
  weapon=choose<HTMLSelectElement>('weapon'),
  injury=choose<HTMLSelectElement>('injury'),
  diagnostic=choose<HTMLSelectElement>('diagnosticLayer'),
  timeline=choose<HTMLInputElement>('timeline'),
  timeOutput=choose<HTMLOutputElement>('timestamp'),
  diagnosticText=choose<HTMLOutputElement>('diagnosticText'),
  playPause=choose<HTMLButtonElement>('playPause'),
  loopButton=choose<HTMLButtonElement>('loopTrack');
const magazineSelector=choose<HTMLSelectElement>('kitMagazines');
const magazineHint=choose<HTMLElement>('magazineHint');
function updateMagazineState(){
 const shotgun=weapon.value==='shotgun',unarmed=weapon.value==='none';
 magazineSelector.disabled=shotgun||unarmed;
 if(unarmed)magazineSelector.value='0';
 magazineHint.textContent=unarmed?'Unarmed inspection: zero carried magazines.':shotgun?
  'SHOTGUN: loose shells; detachable spare magazines are not applicable.':
  'Preview locations use the real equipment carrying ledger.';
}
weapon.addEventListener('change',()=>{
 if(weapon.value!=='none')
  labKit=syncPrimaryWeapon(labKit,weapon.value as WeaponId);
 updateMagazineState();
});
updateMagazineState();
choose<HTMLButtonElement>('unequipAll').addEventListener('click',()=>{
 checkpointAppearance();const empty=unequipLabAppearance();
 labKit=empty.kit;wardrobeOptions=empty.wardrobe;
 weapon.value='none';injury.value='0';
 magazineSelector.value='0';
 choose<HTMLSelectElement>('faceTreatment').value='blank';
 labPalette=1;
 showAllGroups();updateMagazineState();syncKit();
 if(kitComparing)endKitComparison();
 chooseTrack('idle');frameWardrobeSelection();
});
const labWeapon=():WeaponId=>weapon.value==='none'?'carbine':weapon.value as WeaponId;
const COMPARE_POSES:{label:string;mode:Handling;track:LabTrack}[]=[
  {label:'HIGH READY',mode:'high',track:'high-ready'},
  {label:'LOW READY',mode:'low',track:'low-ready'},
  {label:'READY',mode:'ready',track:'ready'},
  {label:'SHORT STOCK',mode:'short',track:'short-stock'},
  {label:'POINT SHOOT',mode:'point',track:'point-shoot'},
  {label:'ACTIVE AIM',mode:'ads',track:'active-aim'},
];
let comparing=false,silhouettes=false,gaitComparing=false;
let gaitCompareRig:OperatorRig|null=null;
let historicalGait:LabHistoricalMotionCache|null=null;
let hybridGait:LabDistanceMotionCache|null=null;
const gaitCompareButton=choose<HTMLButtonElement>('compareGaits');
const gaitCompareStatus=choose<HTMLElement>('gaitCompareStatus');
function clearGaitCompare(){
  if(gaitCompareRig){
    scene.remove(gaitCompareRig.root);gaitCompareRig.dispose();
    gaitCompareRig=null;
  }
  historicalGait=null;hybridGait=null;
}
function ensureGaitCompare(){
  if(!historicalGait||historicalGait.kind!==track)
    historicalGait=new LabHistoricalMotionCache(track);
  if(!hybridGait||hybridGait.kind!==track)
    hybridGait=new LabDistanceMotionCache(track);
  if(!gaitCompareRig){
    gaitCompareRig=createOperatorRig(operator.value,
      operator.value==='hostile'?'red':'blue');
    scene.add(gaitCompareRig.root);
  }
}
let comparisonRigs:OperatorRig[]=[];
let comparisonKey='',comparisonPoseUpdates=0;
const silhouetteColor=new THREE.Color(0x172322);
/** Preserve material identity; restoring original colors must be reversible. */
function applySilhouette(body:OperatorRig,enabled:boolean){
  for(const [material,originalColor] of body.colors)
    material.color.copy(enabled?silhouetteColor:originalColor);
}
const labelLayer=choose<HTMLElement>('compareLabels');

const isolation=choose<HTMLSelectElement>('kitIsolation');
const kitCompareButton=choose<HTMLButtonElement>('compareKit');
let kitComparing=false;
const kitBodies:OperatorRig[]=[];
let variantComparing=false;
let pinnedLook:null|{kit:EquipmentLoadout;wardrobe:WardrobeOptions;
 weapon:WeaponId;weaponVisible:boolean}=null;
const variantBodies:OperatorRig[]=[];
let uniformComparing=false;
const uniformPreviewKit=uniformCompareKit();
const uniformPreviewWardrobes:Record<UniformCompareCut,WardrobeOptions>={
 'bdu-shirt':uniformCompareWardrobe('bdu-shirt'),
 'acu-shirt':uniformCompareWardrobe('acu-shirt')
};
const uniformCompareButton=choose<HTMLButtonElement>('compareBlouses');
const uniformCompareStatus=choose<HTMLOutputElement>('blouseCompareStatus');
const uniformLabels=choose<HTMLElement>('uniformCutLabels');
const uniformLabelA=choose<HTMLElement>('blouseLabelA');
const uniformLabelB=choose<HTMLElement>('blouseLabelB');
for(const [cut,id] of [
 ['bdu-shirt','bduComparisonPrint'],['acu-shirt','acuComparisonPrint']
] as const){
 const select=choose<HTMLSelectElement>(id);
 for(const print of uniformCutCamoChoices(cut)){
  const option=document.createElement('option');
  option.value=print;
  option.textContent=HEADWEAR_CAMO_RECIPES[print].label;
  select.append(option);
 }
 select.value=UNIFORM_COMPARE_DEFAULT_PRINTS[cut];
 select.addEventListener('change',()=>{
  uniformPreviewWardrobes[cut]=uniformCompareWardrobe(cut,
   select.value as HeadwearCamoId);
  refreshUniformCompareLabels();
 });
}
function refreshUniformCompareLabels(){
 const label=(cut:UniformCompareCut)=>{
  const camo=uniformPreviewWardrobes[cut].fabricCamo?.top;
  return UNIFORM_COMPARE_LABELS[cut]+' · '+(camo?
   HEADWEAR_CAMO_RECIPES[camo].label:'SOLID');
 };
 uniformLabelA.textContent=label('bdu-shirt');
 uniformLabelB.textContent=label('acu-shirt');
 if(uniformComparing)uniformCompareStatus.textContent=
  'LEFT: CLASSIC FIELD · RIGHT: MODERN UTILITY · matching scale';
}
const comparePinnedButton=choose<HTMLButtonElement>('comparePinned');
const variantCompareStatus=choose<HTMLOutputElement>('variantCompareStatus');
function endVariantComparison(){
 while(variantBodies.length){
  const body=variantBodies.pop()!;scene.remove(body.root);body.dispose();
 }
 variantComparing=false;
 uniformComparing=false;uniformLabels.hidden=true;
 uniformCompareButton.setAttribute('aria-pressed','false');
 uniformCompareButton.textContent='COMPARE CLASSIC + MODERN';
 uniformCompareStatus.textContent='Open two matching-scale previews with distinct uniforms';
 comparePinnedButton.setAttribute('aria-pressed','false');
 comparePinnedButton.textContent='COMPARE A / B';
 variantCompareStatus.textContent=pinnedLook?'Reference pinned':'';
}
document.getElementById('pinLook')?.addEventListener('click',()=>{
 pinnedLook={kit:{version:1,slots:{...labKit.slots}},
  wardrobe:readWardrobe(wardrobeOptions),
  weapon:labWeapon(),weaponVisible:weapon.value!=='none'};
 comparePinnedButton.disabled=false;
 variantCompareStatus.textContent='Reference pinned. Edit the right-hand outfit.';
});
function beginTwoLookComparison(){
 if(kitComparing)endKitComparison();
 if(comparing){
  comparing=false;clearComparison();labelLayer.hidden=true;
  poseCompareButton.setAttribute('aria-pressed','false');
  document.body.classList.remove('compare-open');
 }
 if(gaitComparing){
  gaitComparing=false;clearGaitCompare();
  gaitCompareButton.setAttribute('aria-pressed','false');
  gaitCompareStatus.hidden=true;
 }
 variantComparing=true;
 for(let i=0;i<2;i++){
  const body=createOperatorRig(operator.value,
   operator.value==='hostile'?'red':'blue');
  variantBodies.push(body);scene.add(body.root);
 }
 fit();
}
comparePinnedButton.addEventListener('click',()=>{
 if(variantComparing){endVariantComparison();fit();return;}
 if(!pinnedLook)return;
 beginTwoLookComparison();
 comparePinnedButton.setAttribute('aria-pressed','true');
 comparePinnedButton.textContent='EXIT A / B';
 variantCompareStatus.textContent='LEFT: PINNED REFERENCE · RIGHT: CURRENT';
});
uniformCompareButton.addEventListener('click',()=>{
 if(uniformComparing){endVariantComparison();fit();return;}
 if(variantComparing)endVariantComparison();
 beginTwoLookComparison();
 uniformComparing=true;
 uniformLabels.hidden=false;
 uniformCompareButton.setAttribute('aria-pressed','true');
 uniformCompareButton.textContent='EXIT BLOUSE COMPARISON';
 refreshUniformCompareLabels();
});

function endKitComparison(){
 while(kitBodies.length){const body=kitBodies.pop()!;
  scene.remove(body.root);body.dispose();}
 kitComparing=false;kitCompareButton.setAttribute('aria-pressed','false');
 kitCompareButton.textContent='COMPARE THREE';
 document.body.classList.remove('kit-compare');
}
let hideSelectedGroup=false;
const hideSelectedButton=choose<HTMLButtonElement>('hideSelected');
const focusSelectedButton=choose<HTMLButtonElement>('focusSelected');
const showAllButton=choose<HTMLButtonElement>('showAll');
const setGroupHidden=(group:THREE.Object3D,hide:boolean)=>{
 if(hide)group.visible=false;
};
function isolateKit(body:OperatorRig){
 const focus=isolation.value;
 if(focus==='all')return;
 const v=body.visualKit;
 const keep=(kind:string)=>hideSelectedGroup?focus!==kind:focus===kind;
 const hide=(kind:string,...groups:THREE.Object3D[])=>{
  if(keep(kind))return;
  for(const group of groups)setGroupHidden(group,true);
 };
 const all=(groups:Record<string,THREE.Object3D>)=>Object.values(groups);
 hide('head',v.helmet,v.cap,v.hair,v.graphicMarks,...v.eyeMarks,
  ...all(v.wardrobeHead.headwear),...all(v.wardrobeHead.facewear),
  ...all(v.wardrobeHead.eyewear),...all(v.wardrobeHead.headset));
 hide('armor',v.softArmor,v.plateCarrier,...all(v.wardrobeGear.armor));
 hide('carry',v.chestRig,v.fieldWebbing,v.belt,
  ...all(v.wardrobeGear.rig),...all(v.wardrobeGear.belt),
  ...all(v.accessories.beltLeft),
  ...all(v.accessories.beltRight),...all(v.accessories.chest));
 if(!keep('carry')){
  for(const section of Object.values(v.magazines))
   for(const mesh of section)mesh.visible=false;
  for(const mesh of [...body.rigPouches,body.beltPouch,
   body.medicalPouch,body.radioUnit,body.utilityTool,
   body.flashCanister])mesh.visible=false;
 }
 hide('pack',body.pack,v.dayPack,v.fieldPack,v.packHarness,
  ...all(v.wardrobeGear.pack),...all(v.accessories.pack));
 hide('clothes',v.jacket,v.lightShirt,
  ...Object.values(v.fieldBlouses).flatMap(b=>[
    b.torso,...b.upper,...b.lower,...b.cuffed,...b.cuffedLower,...b.rolledUpper]),
   ...Object.values(v.newUpper.cuts).flatMap(u=>[
    u.torso,...u.upper,...u.lower,...u.cuffedLower,...u.rolledUpper]),
   ...Object.values(v.fieldTrousers).flatMap(t=>[
    ...t.thigh,...t.bloused,...t.unbloused,...t.cuffed]),
  ...all(v.wardrobeBody.tops),
  ...Object.values(v.wardrobeBody.trousers).flat(),
  ...v.cargoPockets,...v.sleeveCuffs,...v.rolledForearms,...v.rolledCuffs,
  ...v.patches);
 hide('hands',...body.gloveCovers,...all(v.wardrobeBody.wrist));
 hide('knees',...v.kneePanels,
  ...Object.values(v.wardrobeBody.knees).flat());
 hide('feet',...v.bootCuffs,...v.fieldToeCaps,...v.lightInstepPanels);
 // The unarmored body and IK bones remain visible as an inspection
 // mannequin; only item groups are isolated.
}
function showAllGroups(){
 isolation.value='all';hideSelectedGroup=false;
 hideSelectedButton.textContent='HIDE GROUP';
 hideSelectedButton.setAttribute('aria-pressed','false');
 hideSelectedButton.disabled=true;
}
isolation.addEventListener('change',()=>{
 hideSelectedGroup=false;
 hideSelectedButton.textContent='HIDE GROUP';
 hideSelectedButton.setAttribute('aria-pressed','false');
 hideSelectedButton.disabled=isolation.value==='all';
});
hideSelectedButton.disabled=true;
hideSelectedButton.addEventListener('click',()=>{
 if(isolation.value==='all')return;
 hideSelectedGroup=!hideSelectedGroup;
 hideSelectedButton.setAttribute('aria-pressed',String(hideSelectedGroup));
 hideSelectedButton.textContent=hideSelectedGroup?'RESTORE GROUP':'HIDE GROUP';
});
showAllButton.addEventListener('click',()=>{showAllGroups();fit();});
kitCompareButton.addEventListener('click',()=>{
 if(variantComparing)endVariantComparison();
 if(kitComparing){endKitComparison();fit();return;}
 kitComparing=true;
 (document.getElementById('kitPanel') as HTMLDetailsElement).open=true;
 document.body.classList.add('kit-compare');
 kitCompareButton.textContent='EXIT KIT COMPARISON';
 if(comparing){
  comparing=false;clearComparison();
  poseCompareButton.setAttribute('aria-pressed','false');
  labelLayer.hidden=true;document.body.classList.remove('compare-open');
 }
 if(gaitComparing){
  gaitComparing=false;clearGaitCompare();
  gaitCompareButton.setAttribute('aria-pressed','false');
  gaitCompareStatus.hidden=true;
 }
 for(let i=0;i<3;i++){
  const body=createOperatorRig(operator.value,
   operator.value==='hostile'?'red':'blue');
  scene.add(body.root);kitBodies.push(body);
 }
 kitCompareButton.setAttribute('aria-pressed','true');fit();
});

const poseCompareButton=choose<HTMLButtonElement>('comparePose');
const silhouetteButton=choose<HTMLButtonElement>('silhouetteMode');
function clearComparison(){
  comparisonKey='';
  for(const operatorRig of comparisonRigs){
    scene.remove(operatorRig.root);operatorRig.dispose();
  }
  comparisonRigs=[];labelLayer.replaceChildren();
}
function ensureComparison(){
  if(comparisonRigs.length)return;
  for(const [index,info] of COMPARE_POSES.entries()){
    const body=createOperatorRig(operator.value,
      operator.value==='hostile'?'red':'blue');
    const column=index%2,row=Math.floor(index/2);
    body.root.position.set((column-.5)*77,0,(row-1)*70);
    scene.add(body.root);comparisonRigs.push(body);
    const button=document.createElement('button');
    button.textContent=info.label;
    button.title='Inspect '+info.label+' · stock and grip diagnostics';
    button.addEventListener('click',()=>chooseTrack(info.track));
    labelLayer.append(button);
  }
}
const LAB_HANDLING:Partial<Record<LabTrack,Handling>>={
  'high-ready':'high','low-ready':'low','ready':'ready',
  'short-stock':'short','active-aim':'ads','point-shoot':'point'
};
let labSwitch:null|{from:Handling;to:Handling;
  since:number;duration:number;
  fromWeapon:{origin:THREE.Vector3;rotation:THREE.Euler};
  fromProfile:NonNullable<OperatorRig['handlingProfile']>}=null;
let rig:OperatorRig|null=null,track:LabTrack='idle';
const gaitReference=choose<HTMLSelectElement>('gaitReference');
let cache:LabMotionCache|LabHistoricalMotionCache|LabDistanceMotionCache=new LabMotionCache(track);
const newTrackCache=(kind:LabTrack)=>gaitReference.value==='historical'?
  new LabHistoricalMotionCache(kind):gaitReference.value==='candidate'?
  new LabDistanceMotionCache(kind):new LabMotionCache(kind);
gaitReference.addEventListener('change',()=>{
  cache=newTrackCache(track);draw();
});
let clock=0,last=performance.now(),rate=1,playing=true,loop=true;
let cameraFollow={x:0,z:0};
let safeView=safeLabWindow(window.innerWidth,window.innerHeight,90,
 window.innerHeight*.55);
const cameraHalfHeight=36;
let projectionZoom=Number.NaN;
function refreshVisibleWindow(){
 const headerBottom=document.querySelector('header')?.getBoundingClientRect().bottom??90;
 const editorTop=poseFitMode?window.innerHeight*.83:
  document.querySelector('main')?.getBoundingClientRect().top??
  window.innerHeight*.55;
 const overlayBottom=document.getElementById('modelAxisLegend')?.
  getBoundingClientRect().bottom??0;
 safeView=safeLabWindow(window.innerWidth,window.innerHeight,
  headerBottom,editorTop,overlayBottom);
 projectionZoom=Number.NaN;
 updateSafeProjection();
}
function updateSafeProjection(){
 if(projectionZoom===camera.zoom)return;
 const shift=safeLabProjectionShift(safeView,camera.zoom,cameraHalfHeight);
 camera.top=cameraHalfHeight+shift;camera.bottom=-cameraHalfHeight+shift;
 camera.updateProjectionMatrix();projectionZoom=camera.zoom;
}
function cameraFitZoom(mode:LabCameraFraming){
 refreshVisibleWindow();
 camera.zoom=safeLabZoom(mode,safeView,cameraHalfHeight);
 updateSafeProjection();
}

const debug=new THREE.Group();scene.add(debug);
const markerColors=[0xf1b77d,0x7cbbae,0xf2d88b,0xa0a8df];
const markers=Array.from({length:8},(_,i)=>{
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1.45,9,7),
    new THREE.MeshBasicMaterial({color:markerColors[i%4],
      depthTest:false}));
  debug.add(mesh);return mesh;
});
const guideGeometry=new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()]);
const guide=new THREE.Line(guideGeometry,
  new THREE.LineBasicMaterial({color:0xe2a96e,depthTest:false}));
debug.add(guide);
const lanesGeometry=new THREE.BufferGeometry();
lanesGeometry.setAttribute('position',
  new THREE.BufferAttribute(new Float32Array(4*2*3),3));
const lanes=new THREE.LineSegments(lanesGeometry,
  new THREE.LineBasicMaterial({color:0x79a6aa,depthTest:false}));
debug.add(lanes);lanes.visible=false;
const supportBoxes=[0,1].map(()=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(12,1,13),
    new THREE.MeshBasicMaterial({color:0x5eaa9f,wireframe:true,
      depthTest:false}));
  debug.add(mesh);return mesh;
});
const build=()=>{
  if(variantComparing)endVariantComparison();
  labSwitch=null;
  clearComparison();clearGaitCompare();
  if(rig){scene.remove(rig.root);rig.dispose();}
  endKitComparison();
  rig=createOperatorRig(operator.value,operator.value==='hostile'?'red':'blue');
  scene.add(rig.root);
};
operator.addEventListener('change',build);
function fit(next='iso'){
  const center=comparing||kitComparing||variantComparing?new THREE.Vector3():rig?.root.position??
    new THREE.Vector3();
  // Camera presets are defined in the public -Z-forward model space,
  // not arbitrary world X/Z directions. Pivot/turns can't swap front & side.
  const relative=next==='front'?new THREE.Vector3(0,0,-75):
    next==='back'?new THREE.Vector3(0,0,75):
    next==='side'?new THREE.Vector3(75,0,0):
    next==='top'?new THREE.Vector3(.01,0,0):
    new THREE.Vector3(68,0,-65);
  // Use only yaw: injury lean and falling must not spin the camera up/down.
  relative.applyAxisAngle(new THREE.Vector3(0,1,0),
    (rig?.legacyYaw??0)-LEGACY_FRAME_YAW);
  camera.position.set(center.x+relative.x,next==='top'?115:
    ['front','back','side'].includes(next)?16:48,
    center.z+relative.z);
  if(comparing||kitComparing||variantComparing||gaitComparing){
    camera.zoom=comparing?.28:variantComparing?.60:
      kitComparing?.48:.52;
    refreshVisibleWindow();updateSafeProjection();
  }else cameraFitZoom('full');
  control.target.set(center.x,25,center.z);control.update();
  cameraFollow={x:center.x,z:center.z};
}
function chooseTrack(next:LabTrack){
  // Snapshot the actual current presentation, not merely the last named
  // pose. Rapid tap-to-tap retargeting remains continuous mid-transition.
  const target=LAB_HANDLING[next];
  if(target&&rig&&!comparing&&next!==track){
    const previous=LAB_HANDLING[track]??labSwitch?.to??'ready';
    const delta=(target==='ads'||previous==='ads')?.32:
      (target==='short'||previous==='short')?.30:.24;
    labSwitch={from:previous,to:target,since:performance.now()/1000,
      duration:delta,fromWeapon:{
        origin:rig.weapon.position.clone(),
        rotation:rig.weapon.rotation.clone()},
      fromProfile:{...(rig.handlingProfile??HANDLING_PROFILES[previous])}};
  }else labSwitch=null;
  if(comparing){
    comparing=false;
    poseCompareButton.setAttribute('aria-pressed','false');
    document.body.classList.remove('compare-open');
    labelLayer.hidden=true;
    renderer.shadowMap.enabled=true;
    fit();
  }
  track=next;cache=newTrackCache(next);clock=0;playing=true;
  if(gaitComparing){historicalGait=null;hybridGait=null;ensureGaitCompare();}
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-pose]'))
    b.setAttribute('aria-pressed',String(b.dataset.pose===next));
  playPause.textContent='PAUSE';
}
document.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button=>
  button.addEventListener('click',()=>chooseTrack(button.dataset.pose as LabTrack)));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>
  button.addEventListener('click',()=>fit(button.dataset.view)));
choose<HTMLButtonElement>('resetCamera').addEventListener('click',()=>fit());
function frameWardrobeSelection(){
 if(kitComparing)endKitComparison();
 if(comparing){
  comparing=false;clearComparison();labelLayer.hidden=true;
  document.body.classList.remove('compare-open');
  poseCompareButton.setAttribute('aria-pressed','false');
 }
 const focus=isolation.value;
 const focusZone=({head:'head',armor:'chest',carry:'waist',
  pack:'backpack',clothes:'chest',hands:'hand-left',
  knees:'knee-left',feet:'foot-left'} as Partial<Record<string,
  OperatorAttachmentZone>>)[focus];
 const target=rig&&focusZone?
  operatorAttachmentPoint(rig,focusZone):new THREE.Vector3(
    rig?.root.position.x??0,25,rig?.root.position.z??0);
 const {x,z}=target;
 // Match the same canonical model-space 3/4 view as the standard camera.
 // The view follows the actor's facing, rather than hard-coded world +X.
 const threeQuarter=new THREE.Vector3(57,35,-54).applyAxisAngle(
   new THREE.Vector3(0,1,0),(rig?.legacyYaw??0)-LEGACY_FRAME_YAW);
 camera.position.copy(target).add(threeQuarter);
 control.target.copy(target);
 const mode:LabCameraFraming=focus==='head'?'head':
  focus==='armor'||focus==='carry'||focus==='pack'||focus==='clothes'?
    'upper':focus==='hands'?'hands':focus==='knees'?'knees':
    focus==='feet'?'feet':'full';
 cameraFitZoom(mode);control.update();
 cameraFollow={x,z};
}
focusSelectedButton.addEventListener('click',frameWardrobeSelection);
isolation.addEventListener('change',frameWardrobeSelection);
gaitCompareButton.addEventListener('click',()=>{
  if(variantComparing)endVariantComparison();
  if(kitComparing)endKitComparison();
  gaitComparing=!gaitComparing;
  if(gaitComparing){
    comparing=false;labelLayer.hidden=true;
    poseCompareButton.setAttribute('aria-pressed','false');
    document.body.classList.remove('compare-open');
    ensureGaitCompare();
  }else clearGaitCompare();
  gaitCompareButton.setAttribute('aria-pressed',String(gaitComparing));
  gaitCompareStatus.hidden=!gaitComparing;
  fit();
});
poseCompareButton.addEventListener('click',()=>{
  if(variantComparing)endVariantComparison();
  if(kitComparing)endKitComparison();
  comparing=!comparing;
  if(comparing&&gaitComparing){
    gaitComparing=false;clearGaitCompare();
    gaitCompareButton.setAttribute('aria-pressed','false');
    gaitCompareStatus.hidden=true;
  }
  if(comparing){comparisonKey='';ensureComparison();}
  labelLayer.hidden=!comparing;
  poseCompareButton.setAttribute('aria-pressed',String(comparing));
  document.body.classList.toggle('compare-open',comparing);
  renderer.shadowMap.enabled=!comparing;
  fit();
});
choose<HTMLButtonElement>('savePoseView').addEventListener('click',()=>{
  // Keep an exact visual reference across versions without retaining images
  // or GPU render targets in memory; works for the current matched view.
  const button=choose<HTMLButtonElement>('savePoseView');
  try{
    // Render synchronously during the user gesture: mobile WebGL backbuffers
    // may be discarded after normal presentation.
    renderer.render(scene,camera);
    const image=canvas.toDataURL('image/png');
    if(!image.startsWith('data:image/png'))
      throw Error('PNG capture unavailable');
    const link=document.createElement('a');
    link.download='fieldwork-poses-reference.png';
    link.href=image;
    link.click();
    button.textContent='SAVED PNG';
  }catch(error){
    button.textContent='SAVE FAILED';
    button.title=error instanceof Error?error.message:String(error);
  }
});
silhouetteButton.addEventListener('click',()=>{
  silhouettes=!silhouettes;
  silhouetteButton.setAttribute('aria-pressed',String(silhouettes));
});
choose<HTMLButtonElement>('diagnostics').addEventListener('click',()=>{
  diagnostic.value=diagnostic.value==='off'?'anchors':'off';
  choose<HTMLButtonElement>('diagnostics').setAttribute(
    'aria-pressed',String(diagnostic.value!=='off'));
});
diagnostic.addEventListener('change',()=>choose<HTMLButtonElement>(
  'diagnostics').setAttribute('aria-pressed',
  String(diagnostic.value!=='off')));
choose<HTMLButtonElement>('slowMotion').addEventListener('click',e=>{
  rate=rate===.25?1:.25;
  (e.currentTarget as HTMLButtonElement).setAttribute(
    'aria-pressed',String(rate<1));
});
playPause.addEventListener('click',()=>{
  playing=!playing;playPause.textContent=playing?'PAUSE':'PLAY';
});
loopButton.addEventListener('click',()=>{
  loop=!loop;loopButton.setAttribute('aria-pressed',String(loop));
});
choose<HTMLButtonElement>('restartTrack').addEventListener('click',()=>{
  clock=0;playing=true;playPause.textContent='PAUSE';
});
choose<HTMLButtonElement>('stepFrame').addEventListener('click',()=>{
  playing=false;playPause.textContent='PLAY';
  clock=Math.min(TRACK_DURATION,clock+1/60);
});
timeline.addEventListener('input',()=>{
  playing=false;playPause.textContent='PLAY';
  clock=Number(timeline.value)/1000;
  // Render on the input event: seeking must not display an older frame while
  // a busy mobile GPU waits for the next requestAnimationFrame callback.
  draw();
});
function resize(){
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);
  const aspect=w/h;
  camera.left=-cameraHalfHeight*aspect;
  camera.right=cameraHalfHeight*aspect;
  refreshVisibleWindow();
}
window.addEventListener('resize',resize);
if(typeof ResizeObserver!=='undefined'){
 const uiObserver=new ResizeObserver(()=>refreshVisibleWindow());
 for(const selector of ['main','header','#modelAxisLegend']){
  const element=document.querySelector(selector);
  if(element)uiObserver.observe(element);
 }
}
// Orbit/zoom by touch stays user-controlled: a pinch only updates projection
// centering; it never invokes fit() or rewrites the camera's orbit position.
control.addEventListener('change',updateSafeProjection);
const world=new THREE.Vector3(),world2=new THREE.Vector3();
function showDiagnostics(){
  if(!rig)return;
  const layer=diagnostic.value;
  debug.visible=layer!=='off';
  if(!debug.visible){diagnosticText.textContent='';return;}
  const sampled=cache.sample(clock),f=sampled.state.feet;
  const feet=sampled.feet;
  for(const marker of markers)marker.visible=false;
  for(const box of supportBoxes)box.visible=false;
  guide.visible=false;lanes.visible=false;
  if(layer==='garment-fit'){
    // Opt-in reference markers only: do not transform any body part or
    // interfere with headgear, weapon contact or locomotion previews.
    const sewingMarks:readonly GarmentFitAnchorId[]=[
      'collar','shoulder-left','shoulder-right','front-hem',
      'back-hem','waist','knee-left','knee-right'
    ];
    sewingMarks.forEach((id,i)=>{
      markers[i].visible=true;
      garmentFitWorldPoint(rig!.garmentFitAnchors,id,markers[i].position);
    });
    diagnosticText.textContent=garmentFitDiagnosticLines(
      sampleGarmentFit(rig.garmentFitAnchors)).join('\n');
    return;
  }
  const put=(i:number,x:number,y:number,z:number)=>{
    markers[i].visible=true;markers[i].position.set(x,y,z);
  };
  if(layer==='anchors'||layer==='targets'||layer==='support'||
    layer==='lanes'||layer==='balance'||
    layer==='polygon'){
    for(let i=0;i<2;i++){
      const point=layer==='targets'?f[i].swingTo:f[i].plantedAt;
      put(i,point.x,2,point.y);
    }
  }
  if(layer==='lanes'){
    lanes.visible=true;
    const yaw=-sampled.state.pelvisYaw;
    const lateral=lateralAxis(yaw),forward={x:Math.cos(yaw),y:Math.sin(yaw)};
    const coords=lanesGeometry.getAttribute('position') as
      THREE.BufferAttribute;
    const origin=sampled.motion;
    for(let i=0;i<4;i++){
      const distance=[-11,-2.2,2.2,11][i];
      const x=origin.x+lateral.x*distance;
      const z=origin.z+lateral.y*distance;
      coords.setXYZ(i*2,x-forward.x*18,1.2,z-forward.y*18);
      coords.setXYZ(i*2+1,x+forward.x*18,1.2,z+forward.y*18);
    }
    coords.needsUpdate=true;
  }
  if(layer==='balance'){
    rig.root.updateMatrixWorld(true);
    const p=rig.hip.getWorldPosition(new THREE.Vector3());
    put(2,p.x,p.y,p.z);
  }
  if(layer==='support'){
    supportBoxes.forEach((box,i)=>{
      box.visible=true;
      box.position.set(f[i].plantedAt.x,1,f[i].plantedAt.y);
      box.rotation.y=rig!.legacyYaw;
    });
  }
  if(layer==='polygon'){
    const coords=guideGeometry.getAttribute('position') as
      THREE.BufferAttribute;
    const left=f[0].plantedAt,right=f[1].plantedAt;
    coords.setXYZ(0,left.x,2,left.y);
    coords.setXYZ(1,right.x,2,right.y);
    coords.setXYZ(2,rig.root.position.x,2,rig.root.position.z);
    coords.needsUpdate=true;guide.visible=true;
  }
  if(layer==='planes'||layer==='limits'){
    rig.root.updateMatrixWorld(true);
    for(let i=0;i<2;i++){
      rig.feet[i].upper.getWorldPosition(world);
      rig.feet[i].lower.getWorldPosition(world2);
      put(i,world2.x,world2.y,world2.z);
      rig.arms[i].lower.getWorldPosition(world);
      put(i+2,world.x,world.y,world.z);
    }
  }
  if(layer==='weapon'){
    rig.root.updateMatrixWorld(true);
    const g=weaponGrips(labWeapon());
    const coords=[
      [g.stockX,0,0],[g.primaryX,g.primaryY,1.8],
      [g.supportX,g.supportY,-1.6]
    ];
    for(let i=0;i<coords.length;i++){
      const p=rig.weapon.localToWorld(
        new THREE.Vector3(coords[i][0],coords[i][1],coords[i][2]));
      put(i,p.x,p.y,p.z);
    }
    const mode=LAB_HANDLING[track]??labSwitch?.to??'ready';
    const pocket=stockPocket(mode);
    const shoulder=rig.chest.localToWorld(
      new THREE.Vector3(pocket.x,pocket.y,pocket.z));
    put(3,shoulder.x,shoulder.y,shoulder.z);
    const butt=markers[0].position,coords3=
      guideGeometry.getAttribute('position') as THREE.BufferAttribute;
    coords3.setXYZ(0,butt.x,butt.y,butt.z);
    coords3.setXYZ(1,shoulder.x,shoulder.y,shoulder.z);
    coords3.setXYZ(2,shoulder.x,shoulder.y,shoulder.z);
    coords3.needsUpdate=true;guide.visible=true;
    for(let i=0;i<2;i++){
      const sign=i===0?-1:1,hint=elbowCorridor(
        mode,sign as -1|1,rig.handlingProfile??undefined);
      const point=rig.chest.localToWorld(
        new THREE.Vector3(hint.x,hint.y,hint.z));
      put(i+4,point.x,point.y,point.z);
    }
  }
  const trouble=rig.feet.filter(x=>x.outOfReach).length+
    rig.arms.filter(x=>x.outOfReach).length;
  const flex=(a:THREE.Mesh,b:THREE.Mesh)=>{
    const u=new THREE.Vector3(0,1,0).applyQuaternion(
      a.getWorldQuaternion(new THREE.Quaternion()));
    const v=new THREE.Vector3(0,1,0).applyQuaternion(
      b.getWorldQuaternion(new THREE.Quaternion()));
    return Math.acos(Math.min(1,Math.max(-1,u.dot(v))))*180/Math.PI;
  };
  const angles=[...rig.feet.map(x=>flex(x.upper,x.lower)),
    ...rig.arms.map(x=>flex(x.upper,x.lower))];
  const lowerFrame=Math.floor(clock*60+1e-8);
  const alpha=clock*60-lowerFrame;
  const balance=bodyFromContacts({feet,velocity:sampled.motion.speed,
    heading:sampled.motion.heading,travelYaw:sampled.motion.travelYaw,
    turning:sampled.motion.turning,injury:sampled.motion.injury,
    posture:sampled.motion.posture});
  const separated=sideOffset(feet[0].position,feet[1].position,
    -sampled.state.pelvisYaw);
  const crossing=!uncrossed(feet[0].position,feet[1].position,
    -sampled.state.pelvisYaw,3.5);
  rig.root.updateMatrixWorld(true);
  const barrelAxis=new THREE.Vector3(1,0,0).applyQuaternion(
    rig.weapon.getWorldQuaternion(new THREE.Quaternion()));
  const barrelYaw=Math.atan2(barrelAxis.z,barrelAxis.x);
  const aimTruth=weaponTruth(barrelYaw,sampled.motion.heading);
  const measuredRig=rig;
  const feetTruth=footTruth(...([0,1].map(i=>({
    requested:feet[i].position,
    rendered:{x:measuredRig.feet[i].shoe.getWorldPosition(
      new THREE.Vector3()).x,
      y:measuredRig.feet[i].shoe.getWorldPosition(new THREE.Vector3()).z},
    phase:feet[i].phase,contact:feet[i].contact,
    reachError:measuredRig.legGap[i]
  })) as [Parameters<typeof footTruth>[0],Parameters<typeof footTruth>[1]]));
  const reachTruth=feet.map((foot,i)=>{
    const hip=measuredRig.hip.localToWorld(new THREE.Vector3(
      0,0,i===0?-LEG_HIP_SIDE:LEG_HIP_SIDE));
    const ankle=new THREE.Vector3(foot.position.x,
      1.45+foot.height,foot.position.y);
    return legReachTruth({hip,ankle,upper:LEG_UPPER_LENGTH,lower:LEG_LOWER_LENGTH});
  });
  diagnosticText.textContent=[
    'TIME '+clock.toFixed(3)+' / '+TRACK_DURATION.toFixed(2),
    'BARREL '+barrelYaw.toFixed(3)+' / BODY '+sampled.motion.heading.toFixed(3)+
      ' · OFFSET '+aimTruth.aimErrorDeg.toFixed(1)+'°',
    'FOOT TRUTH '+feetTruth.map(f=>f.offset.toFixed(2)).join('/')+
      ' · REACH '+feetTruth.map(f=>f.reach.toFixed(2)).join('/'),
    'GAIT '+sampled.state.mode.toUpperCase()+
      ' · NEXT '+sampled.state.shuffleNext.toUpperCase()+
      ' '+(sampled.state.shuffleLead===0?'LEFT':'RIGHT'),
    'LEFT '+feet[0].phase.toUpperCase()+'  RIGHT '+
      feet[1].phase.toUpperCase(),
    'SPEED '+sampled.motion.speed.toFixed(1)+
      ' · REACH FLAGS '+trouble,
    'CONTACTS '+feet.filter(x=>x.contact).length+
      ' · SEPARATION '+separated.toFixed(1)+
      (crossing?' · CROSSING!':''),
    'PHYSICAL REACH '+reachTruth.map(v=>v.requested.toFixed(1)+'/'+v.maximum.toFixed(1)).join(' / ')+
      ' · EXCESS '+reachTruth.map(v=>v.reachError.toFixed(2)).join(' / '),
    'ANKLE GAP '+rig.legGap.map(v=>v.toFixed(2)).join(' / ')+
      ' · GRIP ERROR '+rig.gripError.toFixed(3)+
       ' · BUTTPLATE GAP '+rig.stockError.toFixed(2)+
       ' · ELBOW SPREAD '+rig.elbowSpread.map(v=>v.toFixed(1)).join('/')+
      ' · SUPPORT '+balance.support.toFixed(2),
    'PELVIS '+sampled.state.pelvisYaw.toFixed(2)+
      ' · LIFT '+balance.pelvisY.toFixed(2),
    'LEFT '+(feet[0].progress??0).toFixed(2)+
      ' PITCH '+(feet[0].pitch??0).toFixed(2)+
      ' · RIGHT '+(feet[1].progress??0).toFixed(2)+
      ' PITCH '+(feet[1].pitch??0).toFixed(2),
    layer==='limits'||layer==='planes'?
      'KNEES '+angles.slice(0,2).map(x=>x.toFixed(0)+'°').join(' / ')+
      ' · ELBOWS '+angles.slice(2).map(x=>x.toFixed(0)+'°').join(' / '):'',
    layer==='replay'?'60Hz FRAME '+lowerFrame+' → '+(lowerFrame+1)+
      ' · α '+alpha.toFixed(3)+' · SEEK-SAFE':'',
    labSwitch?'BLEND '+labSwitch.from+' → '+labSwitch.to+
      ' α '+smoothHandling((performance.now()/1000-labSwitch.since)/
        labSwitch.duration).toFixed(2):'',
    layer==='weapon'?'BUTTPLATE / GRIPS / POCKET / ELBOW HINTS':''
  ].filter(Boolean).join('\n');
}
function draw(){
  if(!rig)return;
  const {motion,feet,state}=cache.sample(clock);
  const previewHandling=LAB_HANDLING;
  const scripted:HandlingTransition|undefined=
    track==='ready-to-ads'?timedHandling('ready','ads',clock,.55,1.15):
    track==='ads-to-low'?timedHandling('ads','low',clock,.55,1.15):
    undefined;
  const alpha=labSwitch?smoothHandling(
    (performance.now()/1000-labSwitch.since)/labSwitch.duration):1;
  const direct:HandlingTransition|undefined=labSwitch?
    {from:labSwitch.from,to:labSwitch.to,alpha,
      fromProfile:labSwitch.fromProfile,
      fromWeapon:labSwitch.fromWeapon}:undefined;
  const transition=direct??scripted;
  if(labSwitch&&alpha>=1)labSwitch=null;
  const selectedHandling=transition?.to??previewHandling[track];
  doorProp.visible=track==='door'||track==='kick';
  rig.root.position.set(poseFitMode?0:motion.x,0,poseFitMode?0:motion.z);
  const selectedPosePreset=poseFitMode?
   FAMILY_PRESETS.find(p=>p.id===poseFitPreset):undefined;
  const currentWeapon=(selectedPosePreset?.weapon??
   (track==='reload-shotgun'?'shotgun':
    weapon.value==='none'?'carbine':weapon.value)) as WeaponId;
  const poseWeaponConfig=selectedPosePreset?
   selectWeaponFamilyPreset(initialWeaponConfiguration(
    selectedPosePreset.weapon),selectedPosePreset.id):undefined;
  const poseFitWardrobe:WardrobeOptions=poseFitMode?
   {...wardrobeOptions,styles:{...wardrobeOptions.styles,
     armorStyle:poseFitArmor,rigStyle:poseFitRig,top:poseFitTop}}:
   wardrobeOptions;
  const currentKit=syncPrimaryWeapon(labKit,currentWeapon);
  const poseFitArmorSlot=poseFitArmor==='armor-bare'?'armor-none':
   poseFitArmor.startsWith('soft-')?'armor-soft':'armor-carrier';
  const poseFitRigSlot=poseFitRig==='no-rig'?'rig-none':
   ['chest-placard','micro-rig','light-rig','chicom-rig','bandolier']
    .includes(poseFitRig)?'rig-light':'rig-full';
  // A Wardrobe look cannot magically override the physically equipped
  // armor/rig. Pose Fit must install the matching real equipment slots;
  // otherwise all selected heavy configurations silently normalize away.
  const poseFitKit=poseFitMode?
   setEquipmentChoice(setEquipmentChoice(currentKit,'armor',
     poseFitArmorSlot),'rig',poseFitRigSlot):currentKit;
  const currentCarry=previewCarry(poseFitKit,currentWeapon);
  if(!comparing)poseOperator(rig,{
    x:poseFitMode?0:motion.x,z:poseFitMode?0:motion.z,
    heading:poseFitMode?0:motion.heading,
    travelYaw:poseFitMode?0:motion.travelYaw,
    seconds:clock,stride:poseFitMode?0:clock*40,
    velocity:poseFitStatic?0:motion.speed,
    posture:poseFitStatic?'stand':motion.posture,
    gait:track==='run'?'run':track==='pie'?'pie':
      track==='squeeze'?'squeeze':'walk',
    injury:Math.max(motion.injury,Number(injury.value),
      track==='reload-wounded'?2:0),
    weapon:currentWeapon,weaponConfiguration:poseWeaponConfig,
    unarmedPreview:!poseFitMode&&weapon.value==='none',
    reload:poseFitStatic?0:motion.reload,reloadDuration:1.8,
    reloadMode:track==='reload-retention'?'retention':
      track==='reload-shotgun'?'shells':'emergency',
    reloadRemoved:track==='reload-interrupt'&&clock>.53,
    reloadInserted:false,
    lastDoorAt:poseFitMode?-100:motion.doorAt,
    lastBashAt:track==='bash'?.75:-100,
    bashRole:track==='bash'?'push':null,
    doorMethod:track==='kick'?'kick':'open',
    doorPoint:track==='door'?{x:25.5,y:8}:undefined,
    lastThrowAt:poseFitMode?-100:motion.throwAt,
    down:!poseFitMode&&(motion.down||Number(injury.value)===3),
    surrender:false,aiming:poseFitStatic?false:motion.aim>.2,
    firing:false,turning:poseFitMode?0:motion.turning,
    aimBlend:poseFitStatic?0:motion.aim,
    handlingOverride:poseFitStatic?'low':selectedHandling,
    poseV3Preview,poseV4ReloadPreview,
    handlingTransition:poseFitMode?undefined:transition,
    replayFeet:poseFitMode?undefined:feet,
    pelvisYaw:poseFitMode?0:state.pelvisYaw,
    hybridSupport:gaitReference.value==='candidate',
    deterministic:true,shotHeading:poseFitMode?0:motion.heading,
     equipment:poseFitKit,appearanceSeed:labPalette,wardrobe:poseFitWardrobe,
     faceStyle:choose<HTMLSelectElement>('faceTreatment').value as
       'blank'|'quiet'|'graphic',
     magazineCarryLocations:currentCarry.filter(p=>p.kind==='magazine')
      .map(p=>p.location),
     medicalCarryLocation:currentCarry.find(p=>p.kind==='medical')?.location,
     utilityCarryLocation:currentCarry.find(p=>p.kind==='utility')?.location,
    downPose:track==='down-back'?'back':
      track==='down-left'?'left':
      track==='down-right'?'right':
      track==='down-slump'?'slump':'forward',
    downProgress:motion.down?Math.max(0,Math.min(1,(clock-.45)/.58)):0,
    hitRegion:track==='wounded'?'torso':undefined,
    hitYaw:motion.heading+Math.PI/2,
    hitAge:track==='wounded'?Math.max(0,clock-.7):undefined,
    hitSeverity:2},0);
  // The shared wardrobe layer controls hair visibility even in unarmed preview.
  if(variantComparing&&rig.lastPose&&(pinnedLook||uniformComparing)){
   for(let i=0;i<variantBodies.length;i++){
    const body=variantBodies[i],reference=i===0;
    const chosen=uniformComparing?{
      kit:uniformPreviewKit,
      wardrobe:uniformPreviewWardrobes[reference?'bdu-shirt':'acu-shirt'],
      weapon:'carbine' as WeaponId,weaponVisible:false
    }:reference?pinnedLook!:{
      kit:labKit,wardrobe:wardrobeOptions,
      weapon:labWeapon(),weaponVisible:weapon.value!=='none'
    };
    const x=(i===0?-17:17);
    body.root.position.set(x,0,0);body.root.visible=true;
    poseOperator(body,{...rig.lastPose,x,z:0,velocity:0,turning:0,
      weapon:chosen.weapon,equipment:chosen.kit,
      wardrobe:chosen.wardrobe,unarmedPreview:!chosen.weaponVisible,
      magazineCarryLocations:[],down:false,injury:0,
      posture:'stand',deterministic:true},0);
    if(silhouettes)applySilhouette(body,true);
   }
  }
  if(!comparing&&!kitComparing&&!variantComparing)isolateKit(rig);
  if(gaitComparing&&rig.lastPose){
    ensureGaitCompare();
    const historical=historicalGait!.sample(clock);
    const hybrid=hybridGait!.sample(clock);
    // Shift recorded world contacts and body by the SAME offset.
    // Never modify the cached reference timelines.
    const footOffset=(targets:typeof historical.feet,dx:number)=>
      targets.map(f=>({...f,position:{x:f.position.x+dx,
        y:f.position.y}})) as typeof historical.feet;
    const pose={...rig.lastPose};
    rig.root.position.set(motion.x-19,0,motion.z);
    poseOperator(rig,{...pose,x:motion.x-19,z:motion.z,
      replayFeet:footOffset(historical.feet,-19),
      pelvisYaw:historical.state.pelvisYaw,
      hybridSupport:false,deterministic:true},0);
    const other=gaitCompareRig!;
    other.root.visible=true;other.root.position.set(motion.x+19,0,motion.z);
    poseOperator(other,{...pose,x:motion.x+19,z:motion.z,
      replayFeet:footOffset(hybrid.feet,19),
      pelvisYaw:hybrid.state.pelvisYaw,
      hybridSupport:true,deterministic:true},0);
    gaitCompareStatus.textContent='LEFT: PRE-180 · RIGHT: HYBRID · '+
      'SYNC '+clock.toFixed(2)+'s';
  }else if(gaitCompareRig)gaitCompareRig.root.visible=false;
  rig.root.visible=!comparing&&!kitComparing&&!variantComparing;
  if(kitComparing&&rig.lastPose){
   const types=['light','standard','heavy'] as const;
   for(let i=0;i<kitBodies.length;i++){
    const body=kitBodies[i],x=(i-1)*31;
    body.root.position.set(x,0,0);
    poseOperator(body,{...rig.lastPose,x,z:0,velocity:0,turning:0,
     equipment:syncPrimaryWeapon(kitPreset(types[i]),labWeapon()),
     appearanceSeed:labPalette+i,wardrobe:wardrobeOptions,
     faceStyle:choose<HTMLSelectElement>('faceTreatment').value as
       'blank'|'quiet'|'graphic',
     magazineCarryLocations:previewCarry(kitPreset(types[i]),
       labWeapon()).filter(p=>p.kind==='magazine')
       .map(p=>p.location),
     down:false,injury:0,posture:'stand',deterministic:true},0);
    if(silhouettes)applySilhouette(body,true);
   }
  }
  // poseOperator restores all original material colors every tick.
  // Keep the silhouette applied *after* each pose, not only on toggle.
  if(!comparing&&silhouettes)applySilhouette(rig,true);
  if(comparing){
    ensureComparison();
    const signature=operator.value+'|'+weapon.value+'|'+silhouettes;
    if(comparisonKey!==signature){
      comparisonKey=signature;
      canvas.dataset.comparePoseUpdates=String(++comparisonPoseUpdates);
      comparisonRigs.forEach((body,i)=>{
      const info=COMPARE_POSES[i],column=i%2,row=Math.floor(i/2);
      const x=(column-.5)*77,z=(row-1)*70;
      body.root.visible=true;body.root.position.set(x,0,z);
      poseOperator(body,{x,z,heading:0,travelYaw:0,seconds:clock,
        stride:0,velocity:0,posture:'stand',injury:0,
        weapon:labWeapon(),
        reload:0,reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
        down:false,surrender:false,aiming:info.mode==='ads',
        firing:false,turning:0,handlingOverride:info.mode,
        deterministic:true},0);
      applySilhouette(body,silhouettes);
      const label=labelLayer.children[i] as HTMLButtonElement;
      label.title=info.label+' · stock '+body.stockError.toFixed(2)+
        ' · grip '+body.gripError.toFixed(2);
      });
    }
  }else for(const body of comparisonRigs)body.root.visible=false;
  const dx=poseFitMode||comparing||kitComparing||variantComparing?
      0:motion.x-cameraFollow.x,
    dz=poseFitMode||comparing||kitComparing||variantComparing?
      0:motion.z-cameraFollow.z;
  camera.position.x+=dx;camera.position.z+=dz;
  control.target.x+=dx;control.target.z+=dz;
  cameraFollow={x:motion.x,z:motion.z};
  timeline.value=String(Math.round(clock*1000));
  timeOutput.textContent=clock.toFixed(2)+'s';
  if(comparing||kitComparing||variantComparing){
    debug.visible=false;
    diagnosticText.textContent=uniformComparing?
      'LEFT: CLASSIC · RIGHT: MODERN · PROPORTIONS LOCKED':variantComparing?
      'LEFT: PINNED · RIGHT: CURRENT · PROPORTIONS LOCKED':kitComparing?
      'LIGHT / STANDARD / HEAVY · PROPORTIONS LOCKED':
      'SIX STANCES · ORBIT / ZOOM TO COMPARE';
  }else showDiagnostics();
  canvas.dataset.compare=String(comparing);
  canvas.dataset.compareGaits=String(gaitComparing);
  canvas.dataset.silhouette=String(silhouettes);
  canvas.dataset.track=track;
  canvas.dataset.weaponHandling=selectedHandling??'automatic';
  canvas.dataset.handlingFrom=transition?.from??'';
  canvas.dataset.handlingTo=transition?.to??'';
  canvas.dataset.handlingBlend=(transition?.alpha??1).toFixed(3);
  canvas.dataset.time=clock.toFixed(3);
  canvas.dataset.contactCount=String(feet.filter(x=>x.contact).length);
  canvas.dataset.gait=state.mode;
  canvas.dataset.gaitReference=gaitReference.value;
  canvas.dataset.promotion=gaitReference.value==='candidate'?'lab-only':'none';
  if(poseFitMode&&poseFitOutput){
   const report=rig.root.userData.lowReadyPoseReport as
    {status:string;mode?:string;penetration:number|null;
     softContact?:number|null;poseQuality?:number|null;
     fittingYaw?:number;torsoAssistYaw?:number;
     candidates:number;weapon?:string;armor?:string;
     rig?:string;top?:string}|null;
   poseFitOutput.textContent=report?
    'STATUS '+report.status.toUpperCase()+
    '\nPOSE '+(report.mode??'unknown')+
    '\nRENDERED '+(report.weapon??'?')+' / '+(report.armor??'?')+
    ' / '+(report.rig??'?')+
    '\nRIGID '+(report.penetration?.toFixed(3)??'N/A')+
    '\nSOFT SHOULDER '+(report.softContact?.toFixed(3)??'N/A')+
    '\nQUALITY '+(report.poseQuality?.toFixed(2)??'N/A')+
    '\nGRIP '+rig.gripError.toFixed(3)+
    '\nSTOCK '+rig.stockError.toFixed(3)+
    '\nCANDIDATES '+report.candidates+
    '\nTORSO ASSIST '+(report.torsoAssistYaw??0).toFixed(3):
    'NO STATIC FAMILY SOLVE';
   canvas.dataset.lowReadyFit=report?.status??'not-applicable';
   canvas.dataset.lowReadyMode=report?.mode??'unresolved';
   // Camera review stays canonical even when chest-local weapon yaw changes.
   canvas.dataset.poseFitYaw=String(
    (report?.fittingYaw??0)+(report?.torsoAssistYaw??0));
   canvas.dataset.poseFitWeaponYaw=String(report?.fittingYaw??'');
   canvas.dataset.torsoAssistYaw=String(report?.torsoAssistYaw??0);
   // During an ACTION the stationary low-ready report is null; read the
   // actual normalized equipment that the renderer just applied instead.
   const actionLook=poseV3Action?
     resolvedWardrobe(poseFitWardrobe,poseFitKit):null;
   canvas.dataset.poseFitArmor=actionLook?.armorStyle??report?.armor??'';
   canvas.dataset.poseFitRig=actionLook?.rigStyle??report?.rig??'';
   canvas.dataset.poseFitTop=actionLook?.top??report?.top??'';
   canvas.dataset.poseFitWeapon=poseFitPreset;
  }
  canvas.dataset.poseV3DynamicReport=JSON.stringify(
    rig.root.userData.poseV3DynamicReport??[]);
  canvas.dataset.poseV3Preview=String(poseV3Preview);
  canvas.dataset.poseV4ReloadPreview=String(poseV4ReloadPreview);
  canvas.dataset.gripError=rig.gripError.toFixed(4);
  canvas.dataset.eyeError=rig.eyeError.toFixed(3);
  canvas.dataset.ankleGap=Math.max(...rig.legGap).toFixed(3);
  canvas.dataset.crossed=String(!uncrossed(feet[0].position,
    feet[1].position,-state.pelvisYaw,3.5));
  control.update();
  updateSafeProjection();
  if(comparing){
    comparisonRigs.forEach((body,i)=>{
      body.root.updateMatrixWorld(true);
      const p=new THREE.Vector3(0,51,0);
      body.root.localToWorld(p);p.project(camera);
      const label=labelLayer.children[i] as HTMLButtonElement;
      label.style.left=((p.x+1)*window.innerWidth/2)+'px';
      label.style.top=((1-p.y)*window.innerHeight/2)+'px';
      label.hidden=p.z>1||p.z< -1;
    });
  }
  renderer.render(scene,camera);
  if(renderer.info.render.calls<1)
    throw Error('3D renderer returned without drawing an operator');
  canvas.dataset.drawCalls=String(renderer.info.render.calls);
  canvas.dataset.triangles=String(renderer.info.render.triangles);
  const stats=choose<HTMLOutputElement>('visualStats');
  const current=renderer.info.render;
  const display='DRAWS '+current.calls+' · TRIS '+
    current.triangles+' · '+(variantComparing?'2 LOOKS':
      kitComparing?'3 KITS':'1 KIT');
  if(stats.textContent!==display)stats.textContent=display;
  canvas.dataset.kitComparison=String(kitComparing);
  canvas.dataset.variantComparison=String(variantComparing);
  if(canvas.dataset.ready!=='true'){
    canvas.dataset.ready='true';
    choose<HTMLElement>('labStatus').hidden=true;
  }
}
function tick(now:number){
  const elapsed=Math.min(.05,Math.max(0,(now-last)/1000));
  last=now;
  if(playing){
    clock+=elapsed*rate;
    if(clock>=TRACK_DURATION){
      if(loop)clock%=TRACK_DURATION;
      else{clock=TRACK_DURATION;playing=false;playPause.textContent='PLAY';}
    }
  }
  try{
    draw();requestAnimationFrame(tick);
  }catch(error){showLabFailure(error);}
}
try{
  build();resize();fit();chooseTrack(poseFitStatic?'low-ready':'idle');
  if(poseFitMode){playing=false;playPause.textContent='PLAY';}
  // Render immediately rather than depending on a delayed first
  // requestAnimationFrame callback on a newly navigated mobile tab.
  draw();requestAnimationFrame(tick);
}catch(error){showLabFailure(error);}
