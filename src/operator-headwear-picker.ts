/** Shared, equipment-aware headgear color picker for Campaign and Quick Play.
 * Uses the approved 30-print artwork without changing any texture recipe.
 * Styling never changes item ownership, protection or equipment classes.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {resolvedWardrobe,type WardrobeOptions} from './operator-wardrobe-data.ts';
import {HEADWEAR_SOLID_COLORS,headwearColorChoices,resolvedHeadwearSolid,
 type HeadwearSolidColorId} from './operator-headwear-colors.ts';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,headwearCamoChoices,
 headwearCamoPixels,headwearCamoSize,resolvedHeadwearCamo,
 nextHeadwearCamoRoll,type HeadwearCamoId} from './operator-headwear-camo.ts';
import {CAMO_CATALOG,type CamoTerrain} from './operator-headwear-camo-catalog.ts';

export const headwearAppearanceModel=(id:string)=>
 id==='high-cut-rails'?'high-cut':id;

export function selectHeadwearSolid(w:WardrobeOptions,model:string,
 requested:unknown):WardrobeOptions{
 const id=headwearAppearanceModel(model);
 if(typeof requested!=='string'||!headwearColorChoices(id).includes(
  requested as HeadwearSolidColorId))return w;
 return {...w,headwearColor:requested as HeadwearSolidColorId,
  headwearCamo:undefined};
}
export function selectHeadwearCamo(w:WardrobeOptions,model:string,
 requested:unknown):WardrobeOptions{
 if(typeof requested!=='string'||!headwearCamoChoices(model).filter(id=>id!=='splittertarn-31').includes(
  requested as HeadwearCamoId))return w;
 const id=requested as HeadwearCamoId;
 return {...w,headwearCamo:id,
  headwearCamoRoll:w.headwearCamo===id?
   nextHeadwearCamoRoll(w.headwearCamoRoll):0};
}
export function rerollHeadwearCamo(w:WardrobeOptions,model:string):WardrobeOptions{
 const selected=resolvedHeadwearCamo(model,w.headwearCamo);
 return selected?selectHeadwearCamo(w,model,selected):w;
}
type PickerOptions={
 disabled?:boolean;expanded?:boolean;camoExpanded?:boolean;
 onExpandedChange?:(open:boolean)=>void;
 onCamoExpandedChange?:(open:boolean)=>void;
};
const make=<K extends keyof HTMLElementTagNameMap>(tag:K,cls='')=>{
 const element=document.createElement(tag);element.className=cls;return element;
};
/** Build swatches only on opening the pattern browser: no repeated 30-canvas
 * construction for every reserve operator while the armory is closed.
 */
export function createHeadwearAppearancePicker(kit:EquipmentLoadout,
 wardrobe:WardrobeOptions,onChange:(wardrobe:WardrobeOptions)=>void,
 options:PickerOptions={}):HTMLDetailsElement{
 const model=resolvedWardrobe(wardrobe,kit).headwear;
 const canon=headwearAppearanceModel(model);
 const solids=headwearColorChoices(canon),camos=headwearCamoChoices(model).filter(id=>id!=='splittertarn-31');
 const panel=make('details','fw-headwear-picker');
 panel.dataset.headwearAppearancePicker=model;
 panel.open=options.expanded===true;
 panel.addEventListener('toggle',()=>options.onExpandedChange?.(panel.open));
 const heading=make('summary');heading.textContent='HEADGEAR COLOR / CAMOUFLAGE';
 panel.append(heading);
 if(!solids.length&&!camos.length){
  const message=make('p','fw-headwear-hint');
  message.textContent='This headgear has no separate swatches. Choose a supported cap or helmet for material colors.';
  panel.append(message);return panel;
 }
 const label=make('p','fw-headwear-hint');
 label.textContent=model.replaceAll('-',' ').toUpperCase()+
  ' · Only compatible fabric and shell finishes are selectable';
 panel.append(label);
 if(solids.length){
  const caption=make('div','fw-headwear-section-title');
  caption.textContent='SOLID FINISH';
  const grid=make('div','fw-headwear-solids');
  for(const id of solids){
   const definition=HEADWEAR_SOLID_COLORS[id];
   const button=make('button','fw-headwear-solid');
   button.type='button';button.disabled=options.disabled===true;
   button.title=definition.label;button.setAttribute('aria-label',definition.label);
   button.setAttribute('aria-pressed',String(
    !resolvedHeadwearCamo(model,wardrobe.headwearCamo)&&
    resolvedHeadwearSolid(canon,wardrobe.headwearColor)===id));
   button.style.backgroundColor='#'+definition.hex.toString(16).padStart(6,'0');
   button.addEventListener('click',()=>onChange(selectHeadwearSolid(wardrobe,model,id)));
   grid.append(button);
  }
  panel.append(caption,grid);
 }
 if(!camos.length)return panel;
 const selected=resolvedHeadwearCamo(model,wardrobe.headwearCamo);
 const camoDetails=make('details','fw-headwear-camos');
 camoDetails.open=options.camoExpanded===true;
 const summary=make('summary');
 summary.textContent='CAMOUFLAGE · '+(selected?
  HEADWEAR_CAMO_RECIPES[selected].label:'CHOOSE PATTERN');
 camoDetails.append(summary);
 const description=make('p','fw-headwear-hint');
 description.textContent='Approved original prints; tapping the current pattern rerolls placement, never scale.';
 camoDetails.append(description);
 if(selected){
  const reroll=make('button','fw-headwear-reroll');
  reroll.type='button';reroll.disabled=options.disabled===true;
  reroll.textContent='↻ REROLL FABRIC CUT · '+((wardrobe.headwearCamoRoll??0)+1);
  reroll.addEventListener('click',()=>onChange(rerollHeadwearCamo(wardrobe,model)));
  camoDetails.append(reroll);
 }
 const controls=make('div','fw-headwear-filter');
 const terrain=make('select');
 terrain.setAttribute('aria-label','Filter camouflage by environment');
 for(const value of ['all','woodland','arid','multi','universal'] as const){
  const option=make('option');option.value=value;
  option.textContent=value==='all'?'ALL ENVIRONMENTS':value.toUpperCase();
  terrain.append(option);
 }
 const search=make('input');search.type='search';search.placeholder='Find pattern or origin';
 search.setAttribute('aria-label','Find camouflage pattern');
 controls.append(terrain,search);camoDetails.append(controls);
 const grid=make('div','fw-headwear-camo-grid');
 grid.setAttribute('role','group');grid.setAttribute('aria-label','Compatible camouflage prints');
 camoDetails.append(grid);
 let painted=false;
 const render=()=>{
  if(!camoDetails.open)return;
  grid.replaceChildren();painted=true;
  const filter=terrain.value as CamoTerrain|'all';
  const query=search.value.trim().toLowerCase();
  for(const id of HEADWEAR_CAMO_IDS.filter(id=>id!=='splittertarn-31')){
   if(!camos.includes(id))continue;
   const meta=CAMO_CATALOG[id],recipe=HEADWEAR_CAMO_RECIPES[id];
   if(filter!=='all'&&meta.terrain!==filter)continue;
   if(query&&!([recipe.label,meta.origin,meta.style,meta.terrain].some(v=>
    v.toLowerCase().includes(query))))continue;
   const button=make('button','fw-headwear-camo-choice');
   button.type='button';button.disabled=options.disabled===true;
   button.setAttribute('aria-label','Apply '+recipe.label);
   button.setAttribute('aria-pressed',String(id===selected));
   const canvas=make('canvas');const size=headwearCamoSize(id);
   canvas.width=size;canvas.height=size;canvas.setAttribute('aria-hidden','true');
   const context=canvas.getContext('2d');
   if(context){
    const pixels=context.createImageData(size,size);
    pixels.data.set(headwearCamoPixels(id));context.putImageData(pixels,0,0);
   }
   const title=make('span');title.textContent=recipe.label;
   button.append(canvas,title);
   button.addEventListener('click',()=>onChange(selectHeadwearCamo(wardrobe,model,id)));
   grid.append(button);
  }
  if(!grid.children.length){
   const empty=make('p','fw-headwear-hint');empty.textContent='No compatible prints match your filter.';
   grid.append(empty);
  }
 };
 camoDetails.addEventListener('toggle',()=>{
  options.onCamoExpandedChange?.(camoDetails.open);
  if(camoDetails.open&&!painted)render();
 });
 terrain.addEventListener('change',render);
 search.addEventListener('input',render);
 if(camoDetails.open)render();
 panel.append(camoDetails);
 return panel;
}
