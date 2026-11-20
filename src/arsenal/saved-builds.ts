/** Arsenal V2 Stage 6: local personal build recipes.
 * Recipes are NOT owned guns, inventory, ammo, serials, or Quick Play loadouts.
 * All operations are pure except explicit read/write storage helpers.
 */
import {readArsenalRecipe,copyArsenalRecipe,type ArsenalRecipeV2}
 from './recipes.ts';
import {normalizeSavedBuildName,allocateSavedBuildId,parseSavedBuildEntries,
 readStoredSavedBuilds,writeStoredSavedBuilds} from './saved-build-library-common.ts';
export const ARSENAL_BUILD_STORAGE_KEY='fieldwork3d.arsenal-recipes.v1';
export const MAX_SAVED_ARSENAL_BUILDS=48;
export interface ArsenalSavedBuild{
 id:string;name:string;recipe:ArsenalRecipeV2;
}
export interface ArsenalBuildLibrary{
 version:1;builds:ArsenalSavedBuild[];
}
export const emptyArsenalBuildLibrary=():ArsenalBuildLibrary=>({version:1,builds:[]});
const cleanName=normalizeSavedBuildName;
/** Validate at the boundary; never materialize untrusted owned equipment. */
export function readArsenalBuildLibrary(raw:unknown):ArsenalBuildLibrary{
 return {version:1,builds:parseSavedBuildEntries(raw,'arsenal-',
  MAX_SAVED_ARSENAL_BUILDS,rawRecipe=>{
   const recipe=readArsenalRecipe(rawRecipe);
   return recipe?copyArsenalRecipe(recipe):null;
  })};
}
export function createSavedArsenalBuild(lib:ArsenalBuildLibrary,
 recipe:ArsenalRecipeV2,name:string):
 {library:ArsenalBuildLibrary;build:ArsenalSavedBuild}|undefined{
 const safe=cleanName(name),valid=readArsenalRecipe(recipe);
 if(!safe||!valid||lib.builds.length>=MAX_SAVED_ARSENAL_BUILDS)return undefined;
 const id=allocateSavedBuildId(lib.builds,'arsenal-');if(!id)return undefined;
 const build:ArsenalSavedBuild={id,name:safe,recipe:copyArsenalRecipe(valid)};
 return {library:{version:1,builds:[...lib.builds,build]},build};
}
export function overwriteSavedArsenalBuild(lib:ArsenalBuildLibrary,
 id:string,recipe:ArsenalRecipeV2):ArsenalBuildLibrary|undefined{
 const valid=readArsenalRecipe(recipe);
 if(!valid||!lib.builds.some(x=>x.id===id))return undefined;
 return {version:1,builds:lib.builds.map(x=>x.id===id?
  {...x,recipe:copyArsenalRecipe(valid)}:x)};
}
export function renameSavedArsenalBuild(lib:ArsenalBuildLibrary,
 id:string,name:string):ArsenalBuildLibrary|undefined{
 const safe=cleanName(name);if(!safe||!lib.builds.some(x=>x.id===id))return undefined;
 return {version:1,builds:lib.builds.map(x=>x.id===id?{...x,name:safe}:x)};
}
export function deleteSavedArsenalBuild(lib:ArsenalBuildLibrary,
 id:string):ArsenalBuildLibrary{
 return {version:1,builds:lib.builds.filter(x=>x.id!==id)};
}
export function duplicateSavedArsenalBuild(lib:ArsenalBuildLibrary,
 id:string):ReturnType<typeof createSavedArsenalBuild>{
 const current=lib.builds.find(x=>x.id===id);if(!current)return undefined;
 return createSavedArsenalBuild(lib,current.recipe,current.name+' Copy');
}
/** Storage failures do not imply success: callers must surface the error. */
export function loadArsenalBuildLibrary():ArsenalBuildLibrary{
 return readStoredSavedBuilds(ARSENAL_BUILD_STORAGE_KEY,readArsenalBuildLibrary,
  emptyArsenalBuildLibrary);
}
export function persistArsenalBuildLibrary(lib:ArsenalBuildLibrary):boolean{
 return writeStoredSavedBuilds(ARSENAL_BUILD_STORAGE_KEY,lib);
}
