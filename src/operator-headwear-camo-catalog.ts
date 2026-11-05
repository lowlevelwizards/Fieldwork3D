/** Metadata used only to organize the historical/modern headwear art catalog.
 * Terrain is a browsing category, not a tactical bonus or material property.
 * Art is an original stylized interpretation of its named historical family.
 */
import {HEADWEAR_CAMO_IDS,type HeadwearCamoId} from './operator-headwear-camo.ts';
export type CamoTerrain='woodland'|'arid'|'multi'|'universal';
export type CamoStyle='organic'|'brushstroke'|'fleck'|'digital'|'geometric'|'raindrop';
export type CamoOrigin='USA'|'Germany'|'Britain'|'Canada'|'Russia'|'China'|'India'|
 'Australia'|'Italy'|'Belgium'|'Sweden'|'Switzerland'|'Poland'|'Finland'|'Rhodesia'|'Ukraine';
export type CamoCatalogEntry={terrain:CamoTerrain;style:CamoStyle;origin:CamoOrigin;era:'historic'|'modern'};
const w=(terrain:CamoTerrain,style:CamoStyle,origin:CamoOrigin,era:'historic'|'modern'='modern'):CamoCatalogEntry=>
 ({terrain,style,origin,era});
export const CAMO_CATALOG:Readonly<Record<HeadwearCamoId,CamoCatalogEntry>>={
 'm81-woodland':w('woodland','organic','USA','historic'),
 'three-color-desert':w('arid','organic','USA','historic'),
 'tiger-stripe':w('woodland','brushstroke','USA','historic'),
 ucp:w('universal','digital','USA','historic'),
 multicam:w('multi','organic','USA'),
 flecktarn:w('woodland','fleck','Germany'),
 'woodland-dpm':w('woodland','brushstroke','Britain','historic'),
 'swedish-m90':w('woodland','geometric','Sweden'),
 'six-color-desert':w('arid','organic','USA','historic'),
 'woodland-marpat':w('woodland','digital','USA'),
 alpenflage:w('woodland','organic','Switzerland','historic'),
 'desert-marpat':w('arid','digital','USA'),
 'erdl-lowland':w('woodland','organic','USA','historic'),
 'finnish-m05':w('woodland','organic','Finland'),
 'polish-pantera':w('woodland','organic','Poland'),
 'russian-flora':w('woodland','brushstroke','Russia','historic'),
 'rhodesian-brushstroke':w('arid','brushstroke','Rhodesia','historic'),
 'desert-tropentarn':w('arid','fleck','Germany'),
 'belgian-jigsaw':w('woodland','organic','Belgium','historic'),
 'east-german-strichtarn':w('woodland','raindrop','Germany','historic'),
 'mitchell-leaf':w('woodland','organic','USA','historic'),
 'splittertarn-31':w('woodland','geometric','Germany','historic'),
 'australian-dpcu':w('woodland','organic','Australia','historic'),
 'italian-vegetato':w('woodland','organic','Italy'),
 'scorpion-w2':w('multi','organic','USA'),
 'russian-emr':w('woodland','digital','Russia'),
 'pla-xingkong':w('multi','digital','China'),
 'cadpat-tw':w('woodland','digital','Canada','historic'),
 'british-mtp':w('multi','organic','Britain'),
 'indian-digital-2022':w('multi','digital','India'),
 'atacs-fg':w('woodland','organic','USA'),
 'ukrainian-mm14':w('multi','digital','Ukraine'),
 aor2:w('woodland','digital','USA'),
 'multicam-tropic':w('woodland','organic','USA'),
 'atacs-au':w('arid','organic','USA'),
 'ss-leto':w('woodland','organic','Russia'),
 aor1:w('arid','digital','USA'),
 'multicam-arid':w('arid','organic','USA')
};
export const CAMO_TERRAINS:ReadonlyArray<CamoTerrain>=['woodland','arid','multi','universal'];
export const CAMO_STYLES:ReadonlyArray<CamoStyle>=
 ['organic','brushstroke','fleck','digital','geometric','raindrop'];
export const CAMO_ORIGINS:readonly CamoOrigin[]=[
 'USA','Britain','Germany','Russia','Canada','China','India','Australia','Italy',
 'Belgium','Sweden','Switzerland','Poland','Finland','Rhodesia','Ukraine'
];
export const CAMO_CATALOG_IDS:readonly HeadwearCamoId[]=HEADWEAR_CAMO_IDS;
export type CamoFilter={
 terrain:CamoTerrain|'all';style:CamoStyle|'all';origin:CamoOrigin|'all';
 text:string;onlyCompatible:boolean;onlyFavorites:boolean;
};
export function filterCamoCatalog(filter:CamoFilter,
 compatible:readonly HeadwearCamoId[],favorites:ReadonlySet<HeadwearCamoId>):HeadwearCamoId[]{
 const allowed=new Set(compatible);
 const query=filter.text.trim().toLowerCase();
 return HEADWEAR_CAMO_IDS.filter(id=>{
  const info=CAMO_CATALOG[id];
  if(filter.terrain!=='all'&&info.terrain!==filter.terrain)return false;
  if(filter.style!=='all'&&info.style!==filter.style)return false;
  if(filter.origin!=='all'&&info.origin!==filter.origin)return false;
  if(filter.onlyCompatible&&!allowed.has(id))return false;
  if(filter.onlyFavorites&&!favorites.has(id))return false;
  if(query){
   const label=id.replace(/-/g,' ').toLowerCase();
   const options=[label,info.origin.toLowerCase(),info.style,info.terrain];
   if(!options.some(x=>x.includes(query)))return false;
  }
  return true;
 });
}
