/** Shared compact browser controls for Studio, Quick Play and Campaign.
 * Stateful only for navigation; all actual material eligibility is external.
 */
import {CAMO_ORIGINS,CAMO_STYLES} from './operator-headwear-camo-catalog.ts';
import {CAMO_SORT_OPTIONS,CAMO_ENVIRONMENT_OPTIONS,CAMO_FAMILY_OPTIONS,
 CAMO_ERA_OPTIONS,camoBrowserState,saveCamoBrowserState,
 resetCamoBrowserState,toggleCamoFavorite,type CamoBrowserState} from './operator-material-browser.ts';
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
 const change=(field:keyof CamoBrowserState,value:string)=>{
  (state as unknown as Record<string,string>)[field]=value;
  saveCamoBrowserState(key);onChange();
 };
 basic.append(
  select('SORT',CAMO_SORT_OPTIONS,state.sort,v=>change('sort',v)),
  select('ENVIRONMENT',CAMO_ENVIRONMENT_OPTIONS,state.environment,
   v=>change('environment',v))
 );
 const advanced=document.createElement('details');advanced.className='fw-material-advanced';
 advanced.open=state.advancedOpen;
 advanced.addEventListener('toggle',()=>{
  if(state.advancedOpen===advanced.open)return;
  state.advancedOpen=advanced.open;saveCamoBrowserState(key);
 });
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
 check.addEventListener('change',()=>{
  state.favoritesOnly=check.checked;saveCamoBrowserState(key);onChange();
 });
 favorites.append(check,document.createTextNode(' FAVORITES ONLY'));
 advanced.append(fields,favorites);
 const reset=document.createElement('button');reset.type='button';
 reset.className='fw-material-reset';reset.textContent='RESET FILTERS';
 reset.setAttribute('aria-label','Reset camouflage browsing filters');
 reset.addEventListener('click',()=>{
  resetCamoBrowserState(key);
  search.value=state.search;
  for(const wrap of controls.querySelectorAll<HTMLLabelElement>('.fw-material-filter')){
   const select=wrap.querySelector('select');
   const label=wrap.querySelector('span')?.textContent;
   if(!select||!label)continue;
   const field=({SORT:'sort',ENVIRONMENT:'environment','PATTERN FAMILY':'family',
    COUNTRY:'origin',CONSTRUCTION:'style',PERIOD:'era'} as const)[label as
    'SORT'|'ENVIRONMENT'|'PATTERN FAMILY'|'COUNTRY'|'CONSTRUCTION'|'PERIOD'];
   if(field)select.value=state[field];
  }
  check.checked=state.favoritesOnly;advanced.open=state.advancedOpen;
  onChange();
 });
 controls.append(search,basic,advanced,reset);target.append(controls);
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

/** Reusable headings make family and smart ordering legible, rather than
 * letting the selected/favorite/recent tiers look like a random shuffle. */
export function appendCamoSectionHeading(grid:HTMLElement,section:string,
 lastSection:string):string{
 if(!section||section===lastSection)return lastSection;
 const heading=document.createElement('div');heading.className='fw-camo-section-heading';
 heading.textContent=section;heading.setAttribute('role','heading');
 heading.setAttribute('aria-level','4');grid.append(heading);
 return section;
}
export function createCamoResultSummary(target:HTMLElement){
 const output=document.createElement('output');output.className='fw-camo-results';
 output.setAttribute('aria-live','polite');target.append(output);
 return (visible:readonly HeadwearCamoId[],total:number,
  active?:HeadwearCamoId|null)=>{
  output.textContent=visible.length+' / '+total+' compatible patterns'+
   (active&&!visible.includes(active)?' · EQUIPPED PATTERN HIDDEN BY FILTERS':'');
 };
}
export function syncCamoFavoriteButton(button:HTMLButtonElement,favored:boolean){
 button.textContent=favored?'★':'☆';
 button.title=favored?'Remove favorite':'Add favorite';
 button.setAttribute('aria-label',button.title);
 button.setAttribute('aria-pressed',String(favored));
}
