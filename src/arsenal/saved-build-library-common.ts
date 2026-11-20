/** Shared mechanics for personal weapon recipe libraries.
 * These are named local presets, never owned weapons, inventory or ammunition.
 * Callers retain their separate recipe validators, storage keys and API shapes.
 */
export type SavedRecipeEntry<R>={id:string;name:string;recipe:R};

export const normalizeSavedBuildName=(raw:unknown):string=>
 typeof raw==='string'?raw.trim().replace(/\s+/g,' ').slice(0,32):'';

export function allocateSavedBuildId(entries:readonly {id:string}[],
 prefix:string):string|undefined{
 const used=new Set(entries.map(entry=>entry.id));
 for(let n=1;n<=999999;n++){
  const id=prefix+n;
  if(!used.has(id))return id;
 }
 return undefined;
}

/** Tolerant, versioned decode; malformed records cannot invent issued gear. */
export function parseSavedBuildEntries<R>(raw:unknown,prefix:string,
 max:number,decodeRecipe:(raw:unknown)=>R|null|undefined):SavedRecipeEntry<R>[]{
 let source:unknown=raw;
 if(typeof source==='string'){
  try{source=JSON.parse(source);}catch{return [];}
 }
 if(!source||typeof source!=='object'||Array.isArray(source))return [];
 const library=source as {version?:unknown;builds?:unknown};
 if(library.version!==1||!Array.isArray(library.builds))return [];
 const result:SavedRecipeEntry<R>[]=[],seen=new Set<string>();
 for(const rawEntry of library.builds.slice(0,max*2)){
  if(!rawEntry||typeof rawEntry!=='object'||Array.isArray(rawEntry))continue;
  const entry=rawEntry as {id?:unknown;name?:unknown;recipe?:unknown};
  const name=normalizeSavedBuildName(entry.name);
  if(typeof entry.id!=='string'||!entry.id.startsWith(prefix)||
   !/^[1-9][0-9]{0,5}$/.test(entry.id.slice(prefix.length))||
   seen.has(entry.id)||!name)continue;
  const recipe=decodeRecipe(entry.recipe);
  if(!recipe)continue;
  seen.add(entry.id);
  result.push({id:entry.id,name,recipe});
  if(result.length>=max)break;
 }
 return result;
}

export function readStoredSavedBuilds<T>(key:string,read:(raw:string|null)=>T,
 fallback:()=>T):T{
 try{return read(localStorage.getItem(key));}
 catch{return fallback();}
}

export function writeStoredSavedBuilds<T>(key:string,value:T):boolean{
 try{localStorage.setItem(key,JSON.stringify(value));return true;}
 catch{return false;}
}
