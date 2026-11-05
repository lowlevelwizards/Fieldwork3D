/** Unified, non-gameplay material browser metadata and deterministic ordering.
 * All compatibility decisions stay with the garment/headwear authenticity policy.
 * No changes to original pixel masters, density, cut placements or equipment.
 */
import {CAMO_CATALOG,type CamoOrigin,type CamoStyle} from './operator-headwear-camo-catalog.ts';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,type HeadwearCamoId}
 from './operator-headwear-camo.ts';
import {GARMENT_SOLID_COLORS,type GarmentSolidId}
 from './operator-garment-color-policy.ts';
import {HEADWEAR_SOLID_COLORS,type HeadwearSolidColorId}
 from './operator-headwear-colors.ts';
import {FABRIC_CAMO_POLICY} from './operator-fabric-camo-policy.ts';

export type CamoEnvironment='all'|'woodland'|'jungle'|'arid'|'transitional'|'urban'|'winter';
export type CamoSort='smart'|'alphabetical'|'family'|'origin'|'era'|'lightness'|'recent';
export const CAMO_SORT_OPTIONS:readonly (readonly [CamoSort,string])[]=[
 ['smart','SMART SORT'],['alphabetical','A–Z'],['family','PATTERN FAMILY'],
 ['origin','COUNTRY'],['era','ERA'],['lightness','LIGHT → DARK'],['recent','RECENT']
];
export const CAMO_ENVIRONMENT_OPTIONS:readonly (readonly [CamoEnvironment,string])[]=[
 ['all','ALL ENVIRONMENTS'],['woodland','WOODLAND'],['jungle','JUNGLE / TROPICAL'],
 ['arid','ARID / DESERT'],['transitional','TRANSITIONAL'],
 ['urban','URBAN / DARK'],['winter','WINTER / SNOW']
];
export const CAMO_FAMILY_OPTIONS:readonly string[]=[
 'all','MultiCam','MARPAT','AOR','A-TACS','Pencott','Kryptek',
 'DPM','Flecktarn','Digital','Other'
];
export const CAMO_ERA_OPTIONS=['all','historic','transition','modern'] as const;
export type CamoEra=typeof CAMO_ERA_OPTIONS[number];
export type CamoBrowserState={
 sort:CamoSort;environment:CamoEnvironment;family:string;origin:CamoOrigin|'all';
 style:CamoStyle|'all';era:CamoEra;search:string;favoritesOnly:boolean;
 advancedOpen:boolean;
};
export const defaultCamoBrowserState=():CamoBrowserState=>({
 sort:'smart',environment:'all',family:'all',origin:'all',style:'all',
 era:'all',search:'',favoritesOnly:false,advancedOpen:false
});
/** Browsing preferences persist by surface/channel, without persisting temporary
 * search text that would reopen a picker with mysteriously hidden swatches.
 * The saved format is independent of wardrobe/campaign state. */
export const CAMO_FILTER_STORAGE_KEY='fieldwork.material.browser.filters.v2';
const browserStates=new Map<string,CamoBrowserState>();
let hydrated=false;
const validOption=<T extends string>(value:unknown,values:readonly T[]):value is T=>
 typeof value==='string'&&values.includes(value as T);
function hydrateCamoBrowserStates(){
 if(hydrated)return;hydrated=true;
 try{
  if(typeof localStorage==='undefined')return;
  const stored=JSON.parse(localStorage.getItem(CAMO_FILTER_STORAGE_KEY)??'{}') as
   Record<string,Partial<CamoBrowserState>>;
  if(!stored||typeof stored!=='object'||Array.isArray(stored))return;
  for(const [key,record] of Object.entries(stored).slice(0,32)){
   if(!record||typeof record!=='object'||Array.isArray(record))continue;
   const state=defaultCamoBrowserState();
   if(validOption(record.sort,CAMO_SORT_OPTIONS.map(x=>x[0])))state.sort=record.sort;
   if(validOption(record.environment,CAMO_ENVIRONMENT_OPTIONS.map(x=>x[0])))
    state.environment=record.environment;
   if(validOption(record.family,CAMO_FAMILY_OPTIONS))state.family=record.family;
   if(validOption(record.origin,['all',...Object.values(CAMO_CATALOG).map(x=>x.origin)]))
    state.origin=record.origin;
   if(validOption(record.style,['all',...Object.values(CAMO_CATALOG).map(x=>x.style)]))
    state.style=record.style;
   if(validOption(record.era,CAMO_ERA_OPTIONS))state.era=record.era;
   state.favoritesOnly=record.favoritesOnly===true;
   state.advancedOpen=record.advancedOpen===true;
   browserStates.set(key,state);
  }
 }catch{/* Local storage may be disabled, corrupt or unavailable. */}
}
export function camoBrowserState(key:string):CamoBrowserState{
 hydrateCamoBrowserStates();
 let state=browserStates.get(key);
 if(!state){state=defaultCamoBrowserState();browserStates.set(key,state);}
 return state;
}
export function saveCamoBrowserState(key:string){
 hydrateCamoBrowserStates();
 camoBrowserState(key);
 try{
  if(typeof localStorage==='undefined')return;
  const saved:Record<string,Partial<CamoBrowserState>>={};
  for(const [id,value] of browserStates){
   const {sort,environment,family,origin,style,era,favoritesOnly,advancedOpen}=value;
   saved[id]={sort,environment,family,origin,style,era,favoritesOnly,advancedOpen};
  }
  // Protect against excessive picker/session keys.
  const entries=Object.entries(saved).slice(-32);
  localStorage.setItem(CAMO_FILTER_STORAGE_KEY,
   JSON.stringify(Object.fromEntries(entries)));
 }catch{/* Browsing still works in private browsing. */}
}
export function resetCamoBrowserState(key:string){
 const state=camoBrowserState(key);
 Object.assign(state,defaultCamoBrowserState());
 saveCamoBrowserState(key);
}
export const CAMO_BROWSER_STORAGE_KEY='fieldwork.headwear.camo.browser.v1';
export type CamoBrowserPrefs={favorites:HeadwearCamoId[];recents:HeadwearCamoId[]};
const validId=(v:unknown):v is HeadwearCamoId=>
 typeof v==='string'&&(HEADWEAR_CAMO_IDS as readonly string[]).includes(v)&&
 v!=='splittertarn-31';
export function readCamoBrowserPrefs():CamoBrowserPrefs{
 try{
  if(typeof localStorage==='undefined')return {favorites:[],recents:[]};
  const parsed=JSON.parse(localStorage.getItem(CAMO_BROWSER_STORAGE_KEY)??'{}') as {
   favorites?:unknown;recents?:unknown;
  };
  const clean=(values:unknown,limit:number)=>Array.isArray(values)?
   [...new Set(values.filter(validId))].slice(0,limit):[];
  return {favorites:clean(parsed.favorites,54),recents:clean(parsed.recents,8)};
 }catch{return {favorites:[],recents:[]};}
}
export function saveCamoBrowserPrefs(prefs:CamoBrowserPrefs){
 try{if(typeof localStorage!=='undefined')
  localStorage.setItem(CAMO_BROWSER_STORAGE_KEY,JSON.stringify(prefs));
 }catch{/* Private browsing may disable persistence. */}
}
export function recordCamoRecent(id:HeadwearCamoId){
 if(!validId(id))return;
 const prefs=readCamoBrowserPrefs();
 prefs.recents=[id,...prefs.recents.filter(x=>x!==id)].slice(0,8);
 saveCamoBrowserPrefs(prefs);
}
export function toggleCamoFavorite(id:HeadwearCamoId):boolean{
 const prefs=readCamoBrowserPrefs();
 if(!validId(id))return false;
 const isFavorite=prefs.favorites.includes(id);
 prefs.favorites=isFavorite?prefs.favorites.filter(x=>x!==id):
  [...prefs.favorites,id];
 saveCamoBrowserPrefs(prefs);
 return !isFavorite;
}
/** User-recognizable families; other entries keep their catalog identity. */
export function camoFamily(id:HeadwearCamoId):string{
 if(id==='multicam'||id.startsWith('multicam-')||id==='scorpion-w2'||
   id==='british-mtp')return 'MultiCam';
 if(id.endsWith('marpat'))return 'MARPAT';
 if(id==='aor1'||id==='aor2')return 'AOR';
 if(id.startsWith('atacs-'))return 'A-TACS';
 if(id.startsWith('pencott-'))return 'Pencott';
 if(id.startsWith('kryptek-'))return 'Kryptek';
 if(id.includes('dpm'))return 'DPM';
 if(id.includes('flecktarn')||id.includes('tropentarn'))return 'Flecktarn';
 if(CAMO_CATALOG[id].style==='digital')return 'Digital';
 return 'Other';
}
const ALIASES:Partial<Record<HeadwearCamoId,readonly string[]>>={
 'm81-woodland':['m81','us woodland'],
 'three-color-desert':['dc u','dcu','3 color desert'],
 'six-color-desert':['chocolate chip','6 color desert'],
 'woodland-dpm':['british dpm','uk dpm'],
 'desert-night':['dnc','desert night camouflage'],
 'scorpion-w2':['ocp','operational camouflage pattern'],
 'polish-pantera':['wz93','wz 93','pantera'],
 'british-mtp':['mtp','multi terrain pattern'],
 'cadpat-tw':['cadpat','temperate woodland'],
 'jgsdf-type2':['jgsdf','japanese type 2'],
 'norwegian-m98':['m98','norwegian m98'],
 'ukrainian-mm14':['mm14','mm 14'],
 'south-african-s2000':['s2000','soldier 2000'],
 'east-german-strichtarn':['strichtarn','rain pattern'],
 'russian-emr':['emr','digital flora'],
 'pla-xingkong':['xingkong','starry sky','type 19']
};
const normalized=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
export function camoSearchMatches(id:HeadwearCamoId,query:string):boolean{
 const q=normalized(query);if(!q)return true;
 const meta=CAMO_CATALOG[id],recipe=HEADWEAR_CAMO_RECIPES[id];
 const terms=[id,recipe.label,recipe.description,meta.origin,meta.style,
  meta.terrain,camoFamily(id),...(ALIASES[id]??[])].map(normalized);
 return terms.some(x=>x.includes(q));
}
export function camoEnvironments(id:HeadwearCamoId):readonly CamoEnvironment[]{
 const meta=CAMO_CATALOG[id],environments:CamoEnvironment[]=[];
 if(meta.terrain==='woodland')environments.push('woodland');
 if(meta.terrain==='arid')environments.push('arid');
 if(meta.terrain==='multi')environments.push('transitional','woodland','arid');
 if(meta.terrain==='universal')environments.push('transitional');
 if(/tropic|jgsdf|flora|greenzone|erdl|tiger|vegetato|aor2|cadpat|jungle/.test(id))
  environments.push('jungle');
 if(/urban|metropolis|typhon|black|ucp|aor2/.test(id))environments.push('urban');
 if(/alpine|winter/.test(id))environments.push('winter');
 return [...new Set(environments)];
}
/** Historically categorized periods come from the existing material policy,
 * not guessed issue dates from a print's perceived appearance. */
export function camoSortEra(id:HeadwearCamoId):CamoEra{
 return FABRIC_CAMO_POLICY[id].period;
}
const srgb=(v:number)=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};
/** Perceptual OKLab lightness. Sorting never modifies swatches or camouflage. */
export function colorLightness(hex:number):number{
 const r=srgb((hex>>>16)&255),g=srgb((hex>>>8)&255),b=srgb(hex&255);
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
 const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
 const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return .2104542553*l+.793617785*m-.0040720468*s;
}
function camoLightness(id:HeadwearCamoId):number{
 const recipe=HEADWEAR_CAMO_RECIPES[id];
 const total=recipe.colors.reduce((sum,_,i)=>sum+(recipe.targetCoverage[i]??0),0);
 if(!total)return colorLightness(0x6a7866);
 return recipe.colors.reduce((sum,c,i)=>sum+colorLightness(
  c[0]*65536+c[1]*256+c[2])*(recipe.targetCoverage[i]??0),0)/total;
}
/** Display headings explain why a print is nearby rather than presenting one
 * long flat list. These headings are navigation-only, not eligibility rules. */
export function camoBrowseSection(id:HeadwearCamoId,options:CamoBrowserOptions):string{
 const sort=options.state?.sort??'smart';
 if(sort==='family')return camoFamily(id)==='Other'?'OTHER PATTERNS':camoFamily(id).toUpperCase();
 if(sort!=='smart')return '';
 if(id===options.active)return 'CURRENT SELECTION';
 const prefs=options.prefs??readCamoBrowserPrefs();
 if(prefs.favorites.includes(id))return 'FAVORITES';
 if(prefs.recents.includes(id))return 'RECENTLY USED';
 if(options.reference&&camoFamily(id)===camoFamily(options.reference))
  return 'RELATED TO YOUR UNIFORM · '+camoFamily(id).toUpperCase();
 return 'OTHER COMPATIBLE PATTERNS';
}
export type CamoBrowserOptions={
 state?:Partial<CamoBrowserState>;active?:HeadwearCamoId|null;
 reference?:HeadwearCamoId|null;prefs?:CamoBrowserPrefs;
};
export function browseCamos(compatible:readonly HeadwearCamoId[],
 options:CamoBrowserOptions={}):HeadwearCamoId[]{
 const state={...defaultCamoBrowserState(),...options.state};
 const prefs=options.prefs??readCamoBrowserPrefs();
 const allowed=new Set(compatible);
 const favorites=new Set(prefs.favorites);
 const recents=new Map(prefs.recents.map((id,i)=>[id,i]));
 const visible=HEADWEAR_CAMO_IDS.filter(id=>{
  if(!allowed.has(id)||id==='splittertarn-31')return false;
  const meta=CAMO_CATALOG[id];
  if(state.environment!=='all'&&!camoEnvironments(id).includes(state.environment))return false;
  if(state.family!=='all'&&camoFamily(id)!==state.family)return false;
  if(state.origin!=='all'&&meta.origin!==state.origin)return false;
  if(state.style!=='all'&&meta.style!==state.style)return false;
  if(state.era!=='all'&&camoSortEra(id)!==state.era)return false;
  if(state.favoritesOnly&&!favorites.has(id))return false;
  return camoSearchMatches(id,state.search);
 });
 const label=(id:HeadwearCamoId)=>HEADWEAR_CAMO_RECIPES[id].label;
 const smartRank=(id:HeadwearCamoId)=>{
  if(id===options.active)return 0;
  if(favorites.has(id))return 1;
  if(recents.has(id))return 2;
  if(options.reference&&camoFamily(id)===camoFamily(options.reference))return 3;
  return 4;
 };
 return visible.sort((a,b)=>{
  let diff=0;
  switch(state.sort){
   case 'smart':diff=smartRank(a)-smartRank(b);
    if(!diff&&recents.has(a)&&recents.has(b))
     diff=recents.get(a)!-recents.get(b)!;
    break;
   case 'recent':diff=(recents.get(a)??Infinity)-(recents.get(b)??Infinity);break;
   case 'origin':diff=CAMO_CATALOG[a].origin.localeCompare(CAMO_CATALOG[b].origin);break;
   case 'family':diff=camoFamily(a).localeCompare(camoFamily(b));break;
   case 'era':diff=camoSortEra(a).localeCompare(camoSortEra(b));break;
   case 'lightness':diff=camoLightness(b)-camoLightness(a);break;
  }
  return diff||label(a).localeCompare(label(b));
 });
}
export type SolidFamily='green'|'sand'|'brown'|'gray'|'black'|'white';
const GREEN=new Set<GarmentSolidId>([
 'olive-drab','ranger-green','forest-green','field-green','sage','foliage']);
const SAND=new Set<GarmentSolidId>(['khaki','sand','tan']);
const BROWN=new Set<GarmentSolidId>(['coyote','brown','nutria-brown']);
export function solidFamily(id:GarmentSolidId):SolidFamily{
 if(GREEN.has(id))return 'green';
 if(SAND.has(id))return 'sand';
 if(BROWN.has(id))return 'brown';
 if(id==='black')return 'black';
 if(id==='off-white')return 'white';
 return 'gray';
}
const SOLID_ORDER:readonly SolidFamily[]=['green','sand','brown','gray','black','white'];
export function sortGarmentSolids(values:readonly GarmentSolidId[],
 recommended:readonly GarmentSolidId[]=[]):GarmentSolidId[]{
 const recommendedRank=new Map(recommended.map((id,i)=>[id,i]));
 return [...new Set(values)].sort((a,b)=>{
  const ra=recommendedRank.get(a),rb=recommendedRank.get(b);
  if(ra!==undefined||rb!==undefined){
   if(ra===undefined)return 1;if(rb===undefined)return -1;
   if(ra!==rb)return ra-rb;
  }
  const group=SOLID_ORDER.indexOf(solidFamily(a))-SOLID_ORDER.indexOf(solidFamily(b));
  return group||colorLightness(GARMENT_SOLID_COLORS[b].hex)-
   colorLightness(GARMENT_SOLID_COLORS[a].hex)||
   GARMENT_SOLID_COLORS[a].label.localeCompare(GARMENT_SOLID_COLORS[b].label);
 });
}

/** Same perceptual ordering for the independent helmet/shell palette. */
export function sortHeadwearSolids(values:readonly HeadwearSolidColorId[],
 preferred?:HeadwearSolidColorId):HeadwearSolidColorId[]{
 const groups=(id:HeadwearSolidColorId)=>{
  if(/green|olive|soviet|postwar|foliage/.test(id))return 0;
  if(/tan|coyote/.test(id))return 1;
  if(/navy|urban|charcoal/.test(id))return 2;
  if(id==='black')return 3;
  return 4;
 };
 return [...new Set(values)].sort((a,b)=>{
  if(preferred&&(a===preferred||b===preferred))
   return a===preferred?-1:1;
  return groups(a)-groups(b)||
   colorLightness(HEADWEAR_SOLID_COLORS[b].hex)-
    colorLightness(HEADWEAR_SOLID_COLORS[a].hex)||
   HEADWEAR_SOLID_COLORS[a].label.localeCompare(HEADWEAR_SOLID_COLORS[b].label);
 });
}
