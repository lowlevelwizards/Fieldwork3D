/** Shared compact browser controls for Studio, Quick Play and Campaign.
 * Stateful only for navigation; all actual material eligibility is external.
 */
import {CAMO_ORIGINS,CAMO_STYLES} from './operator-headwear-camo-catalog.ts';
import {CAMO_SORT_OPTIONS,CAMO_ENVIRONMENT_OPTIONS,CAMO_FAMILY_OPTIONS,
 CAMO_ERA_OPTIONS,camoBrowserState,toggleCamoFavorite,
 type CamoBrowserState} from './operator-material-browser.ts';
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
import './operator-material-browser.css';

const select=(label:string,values:readonly (readonly [string,string])[],
 value:string,changed:(value:string)=>void)=>{
 const wrap=document.createElement('label');wrap.className='fw-material-filter';
 const name=document.createElement('span');name.textContent=label;
 const field=document.createElement('select');field.setAttribute('aria-label',label);
 for(const [id,title] of values){
  const option=document.createElement('option');option.value=id;
  option.textContent=title;field.append(option);
 }
 field.value=value;field.addEventListener('change',()=>changed(field.value));
 wrap.append(name,field);return wrap;
};
export function createCamoBrowseControls(target:HTMLElement,key:string,
 onChange:()=>void):CamoBrowserState{
 const state=camoBrowserState(key),controls=document.createElement('div');
 controls.className='fw-material-browser';
 const search=document.createElement('input');search.type='search';
 search.className='fw-material-search';search.placeholder='Pattern, nickname, country…';
 search.setAttribute('aria-label','Search camouflage by name, alias or country');
 search.value=state.search;search.addEventListener('input',()=>{
  state.search=search.value;onChange();
 });
 const basic=document.createElement('div');basic.className='fw-material-filter-row';
 const change=(key:keyof CamoBrowserState,value:string)=>{
  (state as unknown as Record<string,string>)[key]=value;onChange();
 };
 basic.append(
  select('SORT',CAMO_SORT_OPTIONS,state.sort,v=>change('sort',v)),
  select('ENVIRONMENT',CAMO_ENVIRONMENT_OPTIONS,state.environment,
   v=>change('environment',v))
 );
 const advanced=document.createElement('details');advanced.className='fw-material-advanced';
 const heading=document.createElement('summary');heading.textContent='MORE FILTERS';
 advanced.append(heading);
 const fields=document.createElement('div');fields.className='fw-material-filter-row';
 fields.append(
  select('PATTERN FAMILY',CAMO_FAMILY_OPTIONS.map(x=>[x,x==='all'?'ALL FAMILIES':x] as const),
   state.family,v=>change('family',v)),
  select('COUNTRY',[['all','ALL COUNTRIES'],...CAMO_ORIGINS.map(x=>[x,x] as const)],
   state.origin,v=>change('origin',v)),
  select('CONSTRUCTION',[['all','ALL STYLES'],...CAMO_STYLES.map(x=>[x,x.toUpperCase()] as const)],
   state.style,v=>change('style',v)),
  select('PERIOD',CAMO_ERA_OPTIONS.map(x=>[x,x==='all'?'ALL PERIODS':x.toUpperCase()] as const),
   state.era,v=>change('era',v))
 );
 const favorites=document.createElement('label');favorites.className='fw-material-favorites-only';
 const check=document.createElement('input');check.type='checkbox';
 check.checked=state.favoritesOnly;
 check.addEventListener('change',()=>{state.favoritesOnly=check.checked;onChange();});
 favorites.append(check,document.createTextNode(' FAVORITES ONLY'));
 advanced.append(fields,favorites);
 controls.append(search,basic,advanced);target.append(controls);
 return state;
}
export function createCamoFavoriteButton(id:HeadwearCamoId,isFavorite:boolean,
 onChange:()=>void,disabled=false):HTMLButtonElement{
 const button=document.createElement('button');button.type='button';
 button.className='fw-material-favorite';
 button.textContent=isFavorite?'★':'☆';
 button.title=isFavorite?'Remove favorite':'Add favorite';
 button.setAttribute('aria-label',button.title);
 button.setAttribute('aria-pressed',String(isFavorite));
 button.disabled=disabled;
 button.addEventListener('click',()=>{
  toggleCamoFavorite(id);onChange();
 });
 return button;
}
