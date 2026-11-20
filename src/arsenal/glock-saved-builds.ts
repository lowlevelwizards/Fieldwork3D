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
import {normalizeSavedBuildName,allocateSavedBuildId,parseSavedBuildEntries,
 readStoredSavedBuilds,writeStoredSavedBuilds} from './saved-build-library-common.ts';
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
 return {version:1,builds:parseSavedBuildEntries(raw,'glock-build-',
  MAX_GLOCK_SAVES,readGlockRecipe)};
}
export function createGlockSavedBuild(lib:GlockBuildLibrary,
 raw:GlockRecipe,name:string):{library:GlockBuildLibrary;build:GlockSavedBuild}|null{
 const recipe=readGlockRecipe(raw),clean=normalizeSavedBuildName(name);
 if(!recipe||!clean||lib.builds.length>=MAX_GLOCK_SAVES)return null;
 const id=allocateSavedBuildId(lib.builds,'glock-build-');
 if(!id)return null;
 const build={id,name:clean,recipe};
 return {library:{version:1,builds:[...lib.builds,build]},build};
}
export function renameGlockSavedBuild(lib:GlockBuildLibrary,id:string,name:string):
 GlockBuildLibrary|null{
 const clean=normalizeSavedBuildName(name);
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
 return readStoredSavedBuilds(GLOCK_BUILDS_KEY,readGlockLibrary,emptyGlockLibrary);
}
export function saveGlockLibrary(lib:GlockBuildLibrary):boolean{
 return writeStoredSavedBuilds(GLOCK_BUILDS_KEY,lib);
}
