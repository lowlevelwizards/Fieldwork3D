/** Secondary Arsenal build library. These are PRESETS, never issued ammo,
 * magazine serials or a second source of operator inventory authority.
 * Explicit versioning prevents forged / stale magazine arrangements.
 */
import {isGlockAppearanceId,type GlockAppearanceId} from
 '../weapons/geometry/glock-family-silhouettes.ts';
import type {SecondaryHolster,SecondaryMagazineLocation}
 from '../secondary-equipment.ts';
import {defaultGlockCustomization,readGlockCustomization,
 type GlockCustomization} from '../weapons/geometry/glock-customization.ts';
export type GlockRecipe=Readonly<{version:1;model:GlockAppearanceId;
 holster:SecondaryHolster;spares:readonly SecondaryMagazineLocation[];
 customization:GlockCustomization}>;
export type GlockSavedBuild=Readonly<{id:string;name:string;recipe:GlockRecipe}>;
export type GlockBuildLibrary=Readonly<{version:1;builds:readonly GlockSavedBuild[]}>;
export const GLOCK_BUILDS_KEY='fieldwork3d.arsenal-secondary-recipes.v1';
export const MAX_GLOCK_SAVES=48;
export const emptyGlockLibrary=():GlockBuildLibrary=>({version:1,builds:[]});
export const factoryGlockRecipe=(model:GlockAppearanceId):GlockRecipe=>({
 version:1,model,holster:'belt-right',spares:['belt','belt'],
 customization:defaultGlockCustomization()
});
export function readGlockRecipe(raw:unknown):GlockRecipe|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const r=raw as Record<string,unknown>;
 if(r.version!==1||typeof r.model!=='string'||!isGlockAppearanceId(r.model)||
 (r.holster!=='belt-right'&&r.holster!=='belt-left')||
 !Array.isArray(r.spares)||r.spares.length>6||
 !r.spares.every(x=>['rig','belt','backpack','pocket','overflow'].includes(x)))
  return null;
 const customization=r.customization===undefined?defaultGlockCustomization():
  readGlockCustomization(r.model,r.customization);
 if(!customization)return null;
 return {version:1,model:r.model,holster:r.holster,
  spares:[...(r.spares as SecondaryMagazineLocation[])],customization};
}
export function readGlockLibrary(raw:unknown):GlockBuildLibrary{
 let data:unknown=raw;
 if(typeof data==='string')try{data=JSON.parse(data);}catch{return emptyGlockLibrary();}
 if(!data||typeof data!=='object'||Array.isArray(data))return emptyGlockLibrary();
 const source=data as {version?:unknown;builds?:unknown};
 if(source.version!==1||!Array.isArray(source.builds))return emptyGlockLibrary();
 const builds:GlockSavedBuild[]=[],seen=new Set<string>();
 for(const item of source.builds.slice(0,MAX_GLOCK_SAVES*2)){
  if(!item||typeof item!=='object'||Array.isArray(item))continue;
  const b=item as Record<string,unknown>;
  const name=typeof b.name==='string'?
   b.name.trim().replace(/\s+/g,' ').slice(0,32):'';
  const recipe=readGlockRecipe(b.recipe);
  if(typeof b.id!=='string'||!/^glock-build-[1-9]\d{0,5}$/.test(b.id)||
   seen.has(b.id)||!name||!recipe)continue;
  seen.add(b.id);builds.push({id:b.id,name,recipe});
  if(builds.length>=MAX_GLOCK_SAVES)break;
 }
 return {version:1,builds};
}
export function createGlockSavedBuild(lib:GlockBuildLibrary,
 raw:GlockRecipe,name:string):{library:GlockBuildLibrary;build:GlockSavedBuild}|null{
 const recipe=readGlockRecipe(raw),clean=name.trim().replace(/\s+/g,' ').slice(0,32);
 if(!recipe||!clean||lib.builds.length>=MAX_GLOCK_SAVES)return null;
 const used=new Set(lib.builds.map(b=>b.id));
 let n=1;while(used.has('glock-build-'+n))n++;
 if(n>999999)return null;
 const build={id:'glock-build-'+n,name:clean,recipe};
 return {library:{version:1,builds:[...lib.builds,build]},build};
}
export function renameGlockSavedBuild(lib:GlockBuildLibrary,id:string,name:string):
 GlockBuildLibrary|null{
 const clean=name.trim().replace(/\s+/g,' ').slice(0,32);
 return !clean||!lib.builds.some(b=>b.id===id)?null:
  {version:1,builds:lib.builds.map(b=>b.id===id?{...b,name:clean}:b)};
}
export function replaceGlockSavedBuild(lib:GlockBuildLibrary,id:string,recipe:GlockRecipe):
 GlockBuildLibrary|null{
 const valid=readGlockRecipe(recipe);
 return !valid||!lib.builds.some(b=>b.id===id)?null:
  {version:1,builds:lib.builds.map(b=>b.id===id?{...b,recipe:valid}:b)};
}
export const deleteGlockSavedBuild=(lib:GlockBuildLibrary,id:string):GlockBuildLibrary=>({
 version:1,builds:lib.builds.filter(b=>b.id!==id)
});
export const duplicateGlockSavedBuild=(lib:GlockBuildLibrary,id:string)=>
 lib.builds.find(b=>b.id===id)?
 createGlockSavedBuild(lib,lib.builds.find(b=>b.id===id)!.recipe,
  lib.builds.find(b=>b.id===id)!.name+' Copy'):null;
export function loadGlockLibrary():GlockBuildLibrary{
 try{return readGlockLibrary(localStorage.getItem(GLOCK_BUILDS_KEY));}
 catch{return emptyGlockLibrary();}
}
export function saveGlockLibrary(lib:GlockBuildLibrary):boolean{
 try{localStorage.setItem(GLOCK_BUILDS_KEY,JSON.stringify(lib));return true;}
 catch{return false;}
}
