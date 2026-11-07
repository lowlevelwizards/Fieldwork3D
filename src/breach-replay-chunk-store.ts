/** Replay R3 G3 — isolated, experimental IndexedDB V2 chunk persistence.
 *
 * V1 replay library remains the production authority. No automatic
 * migration, no live-recorder writes, no expanded recording cap.
 *
 * A staging generation is never visible as a published replay. Each chunk and
 * its progress journal share one atomic transaction; final publication and
 * any replacement cleanup share another transaction. An interrupted/quota
 * failure leaves a named, inspectable draft rather than silently truncating
 * or replacing a user's complete recording.
 */
import {replayArchiveIsValid,type ReplayArchiveV1}
  from './breach-replay-archive.ts';
import type {ReplayFrame} from './breach-replay.ts';
import {ReplayChunkWindow,REPLAY_CHUNK_FRAMES,
  type ReplayChunkBoundary} from './breach-replay-chunks.ts';

const DB='fieldwork-breach-replay-chunks';
const VERSION=1;
const DRAFTS='drafts';
const CHUNKS='chunks';
const PUBLISHED='published';
export const REPLAY_V2_MAX_FRAMES=12000; // remains bounded by V1 recorder
const MAX_PENDING=16;
type Sidecar=Omit<ReplayArchiveV1,'frames'>;
export type ReplayChunkDraft={
  generation:string;id:string;startedAt:number;
  previousGeneration:string|null;
  frameCount:number;chunkFrames:number;writtenFrames:number;
  boundaries:ReplayChunkBoundary[];lastTime:number|null;
  sidecar:Sidecar;
};
export type ReplayChunkPublished={
  id:string;generation:string;frameCount:number;chunkFrames:number;
  boundaries:ReplayChunkBoundary[];sidecar:Sidecar;publishedAt:number;
  storageComplete:true;
};
export type ReplayChunkDraftInfo={
  generation:string;id:string;startedAt:number;
  writtenFrames:number;frameCount:number;chunkCount:number;
  recordingComplete:boolean;
};
export type ReplayChunkReadSession={
  summary:ReplayChunkPublished;
  window:ReplayChunkWindow<ReplayFrame>;
};

function req<T>(request:IDBRequest<T>):Promise<T>{
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error??Error('Replay chunk storage request failed'));
  });
}
function completed(tx:IDBTransaction):Promise<void>{
  // Attach failure handlers immediately; callers sometimes deliberately
  // reject a validation before awaiting the transaction completion.
  const done=new Promise<void>((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onabort=()=>reject(tx.error??Error('Replay chunk transaction aborted'));
    tx.onerror=()=>reject(tx.error??Error('Replay chunk transaction failed'));
  });
  void done.catch(()=>{});
  return done;
}
async function open():Promise<IDBDatabase>{
  if(typeof indexedDB==='undefined')
    throw Error('CHUNK STORAGE IS UNAVAILABLE');
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(DRAFTS))
        db.createObjectStore(DRAFTS,{keyPath:'generation'});
      if(!db.objectStoreNames.contains(CHUNKS))
        db.createObjectStore(CHUNKS,{keyPath:['generation','index']});
      if(!db.objectStoreNames.contains(PUBLISHED))
        db.createObjectStore(PUBLISHED,{keyPath:'id'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error??Error('Cannot open replay chunk database'));
    request.onblocked=()=>reject(Error('Replay chunk database blocked by another tab'));
  });
}
function acceptableChunk(frames:readonly ReplayFrame[],from:number|null){
  if(!frames.length)return false;
  let previous=from??-Infinity;
  for(const f of frames){
    if(!f||!Number.isFinite(f.t)||f.t<previous||
      !Array.isArray(f.actors)||!Array.isArray(f.doors))
      return false;
    previous=f.t;
  }
  return true;
}
/** Persistence completeness is independent of mission recording completeness:
 * a complete disk write may contain a film explicitly marked TRUNCATED.
 */
export async function beginChunkedReplayV2(
  archive:ReplayArchiveV1,options:{replace?:boolean;
    chunkFrames?:number}={}
):Promise<ReplayChunkDraftInfo>{
  if(!replayArchiveIsValid(archive)||archive.frames.length>REPLAY_V2_MAX_FRAMES)
    throw Error('Replay film cannot be staged for V2 chunk storage');
  const chunkFrames=options.chunkFrames??REPLAY_CHUNK_FRAMES;
  if(!Number.isSafeInteger(chunkFrames)||chunkFrames<2||
    chunkFrames>REPLAY_CHUNK_FRAMES)
    throw Error('Invalid bounded replay chunk size');
  if(!globalThis.crypto?.randomUUID)
    throw Error('Secure replay generation identifiers are unavailable');
  const generation=crypto.randomUUID();
  const {frames,...sidecar}=archive;
  const db=await open();
  try{
    const tx=db.transaction([DRAFTS,PUBLISHED],'readwrite');
    const done=completed(tx);
    const store=tx.objectStore(DRAFTS);
    const existing=await req(tx.objectStore(PUBLISHED)
      .get(archive.id) as IDBRequest<ReplayChunkPublished|undefined>);
    if(existing&&!options.replace)
      throw Error('Existing replay requires explicit replacement');
    const outstanding=await req(store.getAllKeys());
    if(outstanding.length>=MAX_PENDING)
      throw Error('Too many interrupted replay writes; inspect drafts first');
    const draft:ReplayChunkDraft={
      generation,id:archive.id,startedAt:Date.now(),
      previousGeneration:existing?.generation??null,
      frameCount:frames.length,chunkFrames,writtenFrames:0,
      boundaries:[],lastTime:null,sidecar
    };
    store.add(draft);
    await done;
    return {generation,id:archive.id,startedAt:draft.startedAt,
      writtenFrames:0,frameCount:frames.length,chunkCount:0,
      recordingComplete:sidecar.completeness.complete};
  }finally{db.close();}
}
/** One and only one contiguous immutable chunk per transaction.
 * Callers may resume after reload using listInterruptedChunkedReplays().
 * A failed transaction must not advance the progress journal.
 */
export async function appendReplayChunkV2(
  generation:string,index:number,frames:readonly ReplayFrame[]
):Promise<ReplayChunkDraftInfo>{
  const db=await open();
  try{
    const tx=db.transaction([DRAFTS,CHUNKS],'readwrite');
    const done=completed(tx);
    const drafts=tx.objectStore(DRAFTS);
    const draft=await req(drafts.get(generation)
      as IDBRequest<ReplayChunkDraft|undefined>);
    if(!draft)throw Error('Replay draft not found');
    const expectedIndex=draft.boundaries.length;
    const expectedCount=Math.min(draft.chunkFrames,
      draft.frameCount-draft.writtenFrames);
    if(index!==expectedIndex||frames.length!==expectedCount||
      !acceptableChunk(frames,draft.lastTime))
      throw Error('Replay chunk order, length or timestamps invalid');
    const first=draft.writtenFrames,endExclusive=first+frames.length;
    const boundary:ReplayChunkBoundary={
      index,first,endExclusive,
      fromTime:frames[0].t,toTime:frames[frames.length-1].t
    };
    // The unique composite key prevents overwrites, even on retry.
    tx.objectStore(CHUNKS).add({
      generation,index,frames:[...frames]
    });
    drafts.put({...draft,writtenFrames:endExclusive,
      lastTime:boundary.toTime,
      boundaries:[...draft.boundaries,boundary]});
    await done;
    return {generation,id:draft.id,startedAt:draft.startedAt,
      writtenFrames:endExclusive,frameCount:draft.frameCount,
      chunkCount:index+1,recordingComplete:draft.sidecar.completeness.complete};
  }finally{db.close();}
}
/** Publish the full film atomically; concurrent writers cannot replace a
 * publication that appeared after their draft was opened.
 */
export async function commitChunkedReplayV2(
  generation:string
):Promise<ReplayChunkPublished>{
  const db=await open();
  try{
    const tx=db.transaction([DRAFTS,CHUNKS,PUBLISHED],'readwrite');
    const done=completed(tx);
    const drafts=tx.objectStore(DRAFTS);
    const draft=await req(drafts.get(generation)
      as IDBRequest<ReplayChunkDraft|undefined>);
    if(!draft)throw Error('Replay draft not found');
    if(draft.writtenFrames!==draft.frameCount||
      draft.boundaries.length!==
        Math.ceil(draft.frameCount/draft.chunkFrames))
      throw Error('Cannot publish an incomplete replay recording');
    const published=tx.objectStore(PUBLISHED);
    const previous=await req(published.get(draft.id)
      as IDBRequest<ReplayChunkPublished|undefined>);
    if((previous?.generation??null)!==draft.previousGeneration)
      throw Error('Replay was replaced during this staged write');
    const release:ReplayChunkPublished={
      id:draft.id,generation,frameCount:draft.frameCount,
      chunkFrames:draft.chunkFrames,boundaries:draft.boundaries,
      sidecar:draft.sidecar,publishedAt:Date.now(),storageComplete:true
    };
    // Both pointer publication and old-generation deletion roll back
    // together if either request or quota commit fails.
    published.put(release);
    drafts.delete(generation);
    if(previous)for(const b of previous.boundaries)
      tx.objectStore(CHUNKS).delete([previous.generation,b.index]);
    await done;
    return release;
  }finally{db.close();}
}
/** Only explicit cleanup removes interrupted recordings. This never
 * deletes published generation data.
 */
export async function discardChunkedReplayDraftV2(
  generation:string
):Promise<boolean>{
  const db=await open();
  try{
    const tx=db.transaction([DRAFTS,CHUNKS],'readwrite');
    const done=completed(tx);
    const draft=await req(tx.objectStore(DRAFTS).get(generation)
      as IDBRequest<ReplayChunkDraft|undefined>);
    if(!draft){await done;return false;}
    for(const b of draft.boundaries)
      tx.objectStore(CHUNKS).delete([generation,b.index]);
    tx.objectStore(DRAFTS).delete(generation);
    await done;
    return true;
  }finally{db.close();}
}
export async function listInterruptedChunkedReplaysV2():
Promise<ReplayChunkDraftInfo[]>{
  const db=await open();
  try{
    const tx=db.transaction(DRAFTS,'readonly');
    const done=completed(tx);
    const drafts=await req(tx.objectStore(DRAFTS)
      .getAll() as IDBRequest<ReplayChunkDraft[]>);
    await done;
    return drafts.map(x=>({
      id:x.id,generation:x.generation,startedAt:x.startedAt,
      writtenFrames:x.writtenFrames,frameCount:x.frameCount,
      chunkCount:x.boundaries.length,
      recordingComplete:x.sidecar.completeness.complete
    })).sort((a,b)=>a.startedAt-b.startedAt||
      a.generation.localeCompare(b.generation));
  }finally{db.close();}
}
export async function getPublishedChunkedReplayV2(
  id:string
):Promise<ReplayChunkPublished|null>{
  const db=await open();
  try{
    const tx=db.transaction(PUBLISHED,'readonly');
    const done=completed(tx);
    const release=await req(tx.objectStore(PUBLISHED).get(id)
      as IDBRequest<ReplayChunkPublished|undefined>);
    await done;
    return release??null;
  }finally{db.close();}
}
async function readReplayChunkV2(generation:string,index:number):
Promise<readonly ReplayFrame[]>{
  const db=await open();
  try{
    const tx=db.transaction(CHUNKS,'readonly'),done=completed(tx);
    const data=await req(tx.objectStore(CHUNKS).get([generation,index])
      as IDBRequest<{generation:string;index:number;
        frames:ReplayFrame[]}|undefined>);
    await done;
    if(!data||data.index!==index||data.generation!==generation||
      !Array.isArray(data.frames)||
      !data.frames.every(f=>f&&Array.isArray(f.actors)&&
        Array.isArray(f.doors)))
      throw Error('Replay chunk missing or malformed: '+index);
    return data.frames;
  }finally{db.close();}
}
/** G3+G2 form an on-demand playback storage boundary; the caller chooses
 * when to decode frames, rather than allocating a full V1 archive on load.
 * G4 will wire this into the transport/UI once journals and access gates pass.
 */
export async function openChunkedReplayV2(id:string):
Promise<ReplayChunkReadSession>{
  const summary=await getPublishedChunkedReplayV2(id);
  if(!summary||!summary.storageComplete||summary.frameCount<2)
    throw Error('No complete V2 replay publication');
  const window=new ReplayChunkWindow<ReplayFrame>(
    summary.boundaries,i=>readReplayChunkV2(summary.generation,i),
    {maxResidentChunks:3,maxFramesPerChunk:summary.chunkFrames});
  if(window.totalFrames!==summary.frameCount)
    throw Error('Published replay chunk count does not match index');
  return {summary,window};
}
/** G3 integration helper: consumes a complete existing V1 film in
 * bounded IndexedDB transactions. NOT a live incremental writer; the
 * in-memory recorder limit stays unchanged until G4/G5.
 */
export async function stageExistingReplayAsChunksV2(
  archive:ReplayArchiveV1,options:{replace?:boolean;
    chunkFrames?:number}={}
):Promise<ReplayChunkPublished>{
  const draft=await beginChunkedReplayV2(archive,options);
  const chunkFrames=options.chunkFrames??REPLAY_CHUNK_FRAMES;
  for(let first=0,index=0;first<archive.frames.length;
    first+=chunkFrames,index++){
    await appendReplayChunkV2(draft.generation,index,
      archive.frames.slice(first,first+chunkFrames));
  }
  return commitChunkedReplayV2(draft.generation);
}
