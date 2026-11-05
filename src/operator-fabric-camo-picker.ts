/** Shared historically constrained uniform/fabric camo browser. Reuses the
 * approved headwear artwork bytes but never changes headwear selection.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {resolvedWardrobe,setWardrobeFabricCamo,
 rerollWardrobeFabricCamo,matchWardrobeUniformCamo,type WardrobeOptions}
 from './operator-wardrobe-data.ts';
import {fabricCamoChoices,FABRIC_CAMO_CHANNELS,FABRIC_CAMO_POLICY,
 type FabricCamoChannel} from './operator-fabric-camo-policy.ts';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,
 headwearCamoPixels,headwearCamoSize,type HeadwearCamoId}
 from './operator-headwear-camo.ts';
import {browseCamos,camoBrowserState,readCamoBrowserPrefs,recordCamoRecent}
 from './operator-material-browser.ts';
import {createCamoBrowseControls,createCamoFavoriteButton}
 from './operator-material-browser-ui.ts';

type FabricPickerState={expanded:boolean;openChannel?:FabricCamoChannel|null;
 filter:string};
const label:Readonly<Record<FabricCamoChannel,string>>={
 top:'JACKET / SHIRT',trousers:'TROUSERS',armor:'ARMOR FABRIC',
 gear:'WEBBING / POUCHES',pack:'BACKPACK FABRIC'
};
export function createWardrobeFabricCamoPicker(
 kit:EquipmentLoadout,wardrobe:WardrobeOptions,
 onChange:(next:WardrobeOptions)=>void,
 state:FabricPickerState={expanded:false,filter:''},
 disabled=false):HTMLDetailsElement{
 const outfit=resolvedWardrobe(wardrobe,kit);
 const panel=document.createElement('details');
 panel.className='fw-headwear-picker fw-fabric-picker';
 panel.dataset.fabricCamoPicker='true';
 panel.open=state.expanded;
 panel.addEventListener('toggle',()=>{state.expanded=panel.open;});
 const heading=document.createElement('summary');heading.textContent='AUTHENTIC UNIFORM / FABRIC PRINTS';
 panel.append(heading);
 const hint=document.createElement('p');hint.className='fw-headwear-hint';
 hint.textContent='Approved original prints only · verified garment categories. No procedural palette or placeholder patterns.';
 panel.append(hint);
 const match=document.createElement('div');match.className='fw-fabric-match';
 const pair=HEADWEAR_CAMO_IDS.filter(id=>
  fabricCamoChoices('top',outfit).includes(id)&&
  fabricCamoChoices('trousers',outfit).includes(id));
 const choose=document.createElement('select');
 choose.setAttribute('aria-label','Select a camouflage for matching uniform top and trousers');
 for(const id of browseCamos(pair,{active:wardrobe.fabricCamo?.top??null})){
  const option=document.createElement('option');
  option.value=id;option.textContent=HEADWEAR_CAMO_RECIPES[id].label;
  choose.append(option);
 }
 choose.value=pair.includes(wardrobe.fabricCamo?.top as HeadwearCamoId)?
  wardrobe.fabricCamo!.top!:pair[0]??'';
 const apply=document.createElement('button');apply.type='button';
 apply.textContent='MATCH UNIFORM';apply.disabled=disabled||!pair.length;
 apply.addEventListener('click',()=>onChange(matchWardrobeUniformCamo(
  wardrobe,outfit,choose.value as HeadwearCamoId)));
 match.append(choose,apply);panel.append(match);
 for(const channel of FABRIC_CAMO_CHANNELS){
  const options=fabricCamoChoices(channel,outfit);
  const selected=wardrobe.fabricCamo?.[channel]??null;
  const row=document.createElement('details');row.className='fw-headwear-camos fw-fabric-channel';
  row.dataset.fabricChannel=channel;
  row.open=state.openChannel===channel;
  row.addEventListener('toggle',()=>{
   if(row.open)state.openChannel=channel;
   else if(state.openChannel===channel)state.openChannel=null;
   if(row.open)draw();
  });
  const title=document.createElement('summary');
  title.textContent=label[channel]+' · '+(selected?
   HEADWEAR_CAMO_RECIPES[selected].label :'BASE FABRIC');
  row.append(title);
  if(!options.length){
   const reason=document.createElement('p');reason.className='fw-headwear-hint';
   reason.textContent=selected?
    'Saved print hidden until a compatible item is equipped. This item was never verified in that print.':
    'No documented camouflage printing for the current equipment cut.';
   row.append(reason);panel.append(row);continue;
  }
  const control=document.createElement('div');control.className='fw-fabric-actions';
  const clear=document.createElement('button');clear.type='button';clear.textContent='REMOVE PRINT';
  clear.disabled=disabled||!selected;
  clear.addEventListener('click',()=>onChange(setWardrobeFabricCamo(
   wardrobe,channel,null,outfit)));
  control.append(clear);
  if(selected&&options.includes(selected)){
   const reroll=document.createElement('button');reroll.type='button';
   reroll.disabled=disabled;reroll.textContent='↻ REROLL THIS PIECE';
   reroll.addEventListener('click',()=>onChange(
    rerollWardrobeFabricCamo(wardrobe,channel,outfit)));
   control.append(reroll);
  }
  row.append(control);
  const key='fabric-'+channel;
  const browser=camoBrowserState(key);
  if(!browser.search&&state.filter)browser.search=state.filter;
  createCamoBrowseControls(row,key,()=>{
   state.filter=browser.search;draw();
  });
  const grid=document.createElement('div');grid.className='fw-headwear-camo-grid';
  row.append(grid);
  const draw=()=>{
   if(!row.open)return;
   grid.replaceChildren();
   const prefs=readCamoBrowserPrefs();
   const visible=browseCamos(options,{state:browser,active:selected,
    reference:wardrobe.fabricCamo?.top??null,prefs});
   for(const id of visible){
    const definition=HEADWEAR_CAMO_RECIPES[id];
    const profile=FABRIC_CAMO_POLICY[id];
    const wrap=document.createElement('div');wrap.className='fw-camo-choice-wrap';
    const button=document.createElement('button');button.type='button';
    button.className='fw-headwear-camo-choice';
    button.disabled=disabled;button.setAttribute('aria-pressed',String(selected===id));
    button.setAttribute('aria-label','Apply '+definition.label+' to '+label[channel]);
    button.title=profile.note;
    const canvas=document.createElement('canvas');
    const size=headwearCamoSize(id);canvas.width=size;canvas.height=size;
    canvas.setAttribute('aria-hidden','true');
    const context=canvas.getContext('2d');
    if(context){
     const image=context.createImageData(size,size);
     image.data.set(headwearCamoPixels(id));
     context.putImageData(image,0,0);
    }
    const text=document.createElement('span');text.textContent=definition.label;
    button.append(canvas,text);
    button.addEventListener('click',()=>{
     recordCamoRecent(id);
     onChange(setWardrobeFabricCamo(wardrobe,channel,id,outfit));
    });
    wrap.append(button,createCamoFavoriteButton(id,prefs.favorites.includes(id),
     ()=>draw(),disabled));
    grid.append(wrap);
   }
   if(!grid.children.length){const empty=document.createElement('p');
    empty.className='fw-headwear-hint';empty.textContent='No verified match';
    grid.append(empty);}
  };
  panel.append(row);if(row.open)draw();
 }
 return panel;
}
