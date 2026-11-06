/** Replay R3: durable local replay library.
 * Metadata stays separate from heavyweight film blobs. IndexedDB stores a
 * structured clone (including Map/Set); localStorage and JSON.stringify
 * must NEVER be used to persist the actual replay film.
 */
import {
  replayArchiveIsValid,type ReplayArchiveV1
} from './breach-replay-archive.ts';

export const REPLAY_LIBRARY_LIMIT=24;
const DB_NAME='fieldwork-breach-replay-library';
const DB_VERSION=1;
const RECORDINGS='recordings';
const INDEX='index';
export type SavedReplaySummary={
  id:string;createdAt:number;siteName:string;
  missionType:string;duration:number;
  frameCount:number;shotCount:number;
  complete:boolean;favorite:boolean;
};
export function replayLibrarySummary(
  archive:ReplayArchiveV1,favorite=false
):SavedReplaySummary{
  return {
    id:archive.id,createdAt:archive.createdAt,
    siteName:archive.manifest.site?.name??'UNKNOWN SITE',
    missionType:archive.manifest.missionType,
    duration:archive.frames.at(-1)?.t??0,
    frameCount:archive.frames.length,
    shotCount:archive.shots.length,
    complete:archive.completeness.complete,
    favorite
  };
}
export function sortReplayLibrary(
  items:readonly SavedReplaySummary[]
):SavedReplaySummary[]{
  return [...items].sort((a,b)=>Number(b.favorite)-Number(a.favorite)||
    b.createdAt-a.createdAt||a.id.localeCompare(b.id));
}

export function replayLibrarySupported():boolean{
  return typeof indexedDB!=='undefined'&&
    typeof indexedDB.open==='function';
}
function requestValue<T>(request:IDBRequest<T>):Promise<T>{
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error??Error('Replay storage request failed'));
  });
}
function transactionDone(tx:IDBTransaction):Promise<void>{
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onabort=()=>reject(tx.error??Error('Replay storage write aborted'));
    tx.onerror=()=>reject(tx.error??Error('Replay storage transaction failed'));
  });
}
function openLibrary():Promise<IDBDatabase>{
  if(!replayLibrarySupported())
    return Promise.reject(Error('LOCAL REPLAY STORAGE IS UNAVAILABLE'));
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(RECORDINGS))
        db.createObjectStore(RECORDINGS,{keyPath:'id'});
      if(!db.objectStoreNames.contains(INDEX))
        db.createObjectStore(INDEX,{keyPath:'id'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error??Error('Could not open replay library'));
    request.onblocked=()=>reject(Error('Replay library is locked by another tab'));
  });
}
export async function listSavedReplays():Promise<SavedReplaySummary[]>{
  const db=await openLibrary();
  try{
    const tx=db.transaction(INDEX,'readonly');
    const done=transactionDone(tx);
    const rows=await requestValue(tx.objectStore(INDEX)
      .getAll() as IDBRequest<SavedReplaySummary[]>);
    await done;
    return sortReplayLibrary(rows);
  }finally{db.close();}
}
export async function saveReplayArchive(archive:ReplayArchiveV1):Promise<void>{
  if(!replayArchiveIsValid(archive))
    throw Error('Replay recording is invalid or incompatible');
  const db=await openLibrary();
  try{
    const tx=db.transaction([INDEX,RECORDINGS],'readwrite');
    const done=transactionDone(tx);
    const index=tx.objectStore(INDEX);
    const existing=await requestValue(index.getAllKeys());
    if(existing.length>=REPLAY_LIBRARY_LIMIT&&!existing.includes(archive.id)){
      tx.abort();
      try{await done;}catch{/* intentional rollback */}
      throw Error('REPLAY LIBRARY FULL — DELETE A RECORDING TO SAVE');
    }
    const prior=await requestValue(index.get(archive.id) as IDBRequest<
      SavedReplaySummary|undefined>);
    index.put(replayLibrarySummary(archive,prior?.favorite??false));
    tx.objectStore(RECORDINGS).put(archive);
    await done;
  }finally{db.close();}
}
export async function loadSavedReplay(id:string):Promise<ReplayArchiveV1>{
  const db=await openLibrary();
  try{
    const tx=db.transaction(RECORDINGS,'readonly');
    const done=transactionDone(tx);
    const data:unknown=await requestValue(tx.objectStore(RECORDINGS).get(id));
    await done;
    if(!replayArchiveIsValid(data))
      throw Error('Saved replay missing, incompatible or corrupted');
    return data;
  }finally{db.close();}
}
export async function setSavedReplayFavorite(id:string,favorite:boolean):Promise<void>{
  const db=await openLibrary();
  try{
    const tx=db.transaction(INDEX,'readwrite');
    const done=transactionDone(tx);
    const store=tx.objectStore(INDEX);
    const existing=await requestValue(store.get(id) as
      IDBRequest<SavedReplaySummary|undefined>);
    if(!existing){
      tx.abort();try{await done;}catch{}
      throw Error('Replay not found');
    }
    store.put({...existing,favorite});
    await done;
  }finally{db.close();}
}
export async function deleteSavedReplay(id:string):Promise<void>{
  const db=await openLibrary();
  try{
    const tx=db.transaction([INDEX,RECORDINGS],'readwrite');
    const done=transactionDone(tx);
    tx.objectStore(INDEX).delete(id);
    tx.objectStore(RECORDINGS).delete(id);
    await done;
  }finally{db.close();}
}
