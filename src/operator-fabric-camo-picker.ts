/** Shared historically constrained uniform/fabric camo browser. Reuses the
 * approved headwear artwork bytes but never changes headwear selection.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {readWardrobe,resolvedWardrobe,setWardrobeFabricCamo,
 rerollWardrobeFabricCamo,matchWardrobeUniformCamo,type WardrobeOptions}
 from './operator-wardrobe-data.ts';
import {fabricCamoChoices,FABRIC_CAMO_CHANNELS,FABRIC_CAMO_POLICY,
 type FabricCamoChannel} from './operator-fabric-camo-policy.ts';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,
 headwearCamoPixels,headwearCamoSize,type HeadwearCamoId}
 from './operator-headwear-camo.ts';

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
 hint.textContent='Approved 30 prints · only verified garment types. Original legacy fabrics remain in the separate pattern controls. Prints never grant equipment.';
 panel.append(hint);
 const match=document.createElement('div');match.className='fw-fabric-match';
 const pair=HEADWEAR_CAMO_IDS.filter(id=>
  fabricCamoChoices('top',outfit).includes(id)&&
  fabricCamoChoices('trousers',outfit).includes(id));
 const choose=document.createElement('select');
 choose.setAttribute('aria-label','Select a camouflage for matching uniform top and trousers');
 for(const id of pair){
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
   HEADWEAR_CAMO_RECIPES[selected].label:'LEGACY / SOLID');
  row.append(title);
  if(!options.length){
   const reason=document.createElement('p');reason.className='fw-headwear-hint';
   reason.textContent=selected?
    'Saved print hidden until a compatible item is equipped. This item was never verified in that print.':
    'No documented camouflage printing for the current equipment cut.';
   row.append(reason);panel.append(row);continue;
  }
  const control=document.createElement('div');control.className='fw-fabric-actions';
  const clear=document.createElement('button');clear.type='button';clear.textContent='USE LEGACY / SOLID';
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
  const search=document.createElement('input');search.type='search';
  search.className='fw-fabric-search';search.placeholder='Search print / country';
  search.setAttribute('aria-label','Search compatible '+label[channel]+' camouflage');
  search.value=state.filter;row.append(search);
  const grid=document.createElement('div');grid.className='fw-headwear-camo-grid';
  row.append(grid);
  let drawn=false;
  const draw=()=>{
   if(!row.open||drawn&&grid.dataset.filter===search.value)return;
   drawn=true;grid.dataset.filter=search.value;grid.replaceChildren();
   const q=search.value.toLowerCase().trim();
   for(const id of HEADWEAR_CAMO_IDS){
    if(!options.includes(id))continue;
    const definition=HEADWEAR_CAMO_RECIPES[id];
    const profile=FABRIC_CAMO_POLICY[id];
    if(q&&!([definition.label,profile.note,id].some(v=>
     v.toLowerCase().includes(q))))continue;
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
    button.addEventListener('click',()=>onChange(setWardrobeFabricCamo(
     wardrobe,channel,id,outfit)));
    grid.append(button);
   }
   if(!grid.children.length){const empty=document.createElement('p');
    empty.className='fw-headwear-hint';empty.textContent='No verified match';
    grid.append(empty);}
  };
  search.addEventListener('input',()=>{state.filter=search.value;draw();});
  panel.append(row);if(row.open)draw();
 }
 return panel;
}
