/** Arsenal V2 Stage 6: local personal build recipes.
 * Recipes are NOT owned guns, inventory, ammo, serials, or Quick Play loadouts.
 * All operations are pure except explicit read/write storage helpers.
 */
import {readArsenalRecipe,copyArsenalRecipe,type ArsenalRecipeV2}
 from './recipes.ts';
export const ARSENAL_BUILD_STORAGE_KEY='fieldwork3d.arsenal-recipes.v1';
export const MAX_SAVED_ARSENAL_BUILDS=48;
const MAX_NAME_LENGTH=32;
const RECORD_ID=/^arsenal-[1-9][0-9]{0,5}$/;
export interface ArsenalSavedBuild{
 id:string;name:string;recipe:ArsenalRecipeV2;
}
export interface ArsenalBuildLibrary{
 version:1;builds:ArsenalSavedBuild[];
}
export const emptyArsenalBuildLibrary=():ArsenalBuildLibrary=>({version:1,builds:[]});
const cleanName=(raw:unknown):string=>
 typeof raw==='string'?raw.trim().replace(/\s+/g,' ').slice(0,MAX_NAME_LENGTH):'';
/** Validate at the boundary; never materialize untrusted owned equipment. */
export function readArsenalBuildLibrary(raw:unknown):ArsenalBuildLibrary{
 let source:unknown=raw;
 if(typeof source==='string'){
  try{source=JSON.parse(source);}catch{return emptyArsenalBuildLibrary();}
 }
 if(!source||typeof source!=='object'||Array.isArray(source))return emptyArsenalBuildLibrary();
 const value=source as {version?:unknown;builds?:unknown};
 if(value.version!==1||!Array.isArray(value.builds))return emptyArsenalBuildLibrary();
 const builds:ArsenalSavedBuild[]=[],ids=new Set<string>();
 for(const rawRecord of value.builds.slice(0,MAX_SAVED_ARSENAL_BUILDS*2)){
  if(!rawRecord||typeof rawRecord!=='object'||Array.isArray(rawRecord))continue;
  const rec=rawRecord as {id?:unknown;name?:unknown;recipe?:unknown};
  const name=cleanName(rec.name);
  if(typeof rec.id!=='string'||!RECORD_ID.test(rec.id)||ids.has(rec.id)||!name)
   continue;
  const recipe=readArsenalRecipe(rec.recipe);
  if(!recipe)continue;
  builds.push({id:rec.id,name,recipe:copyArsenalRecipe(recipe)});
  ids.add(rec.id);
  if(builds.length>=MAX_SAVED_ARSENAL_BUILDS)break;
 }
 return {version:1,builds};
}
const nextId=(lib:ArsenalBuildLibrary):string|undefined=>{
 const ids=new Set(lib.builds.map(b=>b.id));
 for(let n=1;n<=999999;n++)if(!ids.has('arsenal-'+n))return 'arsenal-'+n;
 return undefined;
};
export function createSavedArsenalBuild(lib:ArsenalBuildLibrary,
 recipe:ArsenalRecipeV2,name:string):
 {library:ArsenalBuildLibrary;build:ArsenalSavedBuild}|undefined{
 const safe=cleanName(name),valid=readArsenalRecipe(recipe);
 if(!safe||!valid||lib.builds.length>=MAX_SAVED_ARSENAL_BUILDS)return undefined;
 const id=nextId(lib);if(!id)return undefined;
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
 try{return readArsenalBuildLibrary(localStorage.getItem(ARSENAL_BUILD_STORAGE_KEY));}
 catch{return emptyArsenalBuildLibrary();}
}
export function persistArsenalBuildLibrary(lib:ArsenalBuildLibrary):boolean{
 try{localStorage.setItem(ARSENAL_BUILD_STORAGE_KEY,JSON.stringify(lib));return true;}
 catch{return false;}
}
