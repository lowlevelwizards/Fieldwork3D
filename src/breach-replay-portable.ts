/** Replay R3 portable archive: full evidence, not summary JSON.
 * Compressed with standard gzip; limits protect import against oversized data.
 * This is a playback artifact and never an executable mission checkpoint.
 */
import {replayArchiveIsValid,type ReplayArchiveV1}
  from './breach-replay-archive.ts';
export const REPLAY_FILE_SUFFIX='.fieldwork-replay.json.gz';
export const MAX_REPLAY_FILE_BYTES=48*1024*1024;
export const MAX_REPLAY_JSON_BYTES=64*1024*1024;

function encodeCollection(_key:string,value:unknown):unknown{
  if(value instanceof Map)
    return {$fwReplayCollection:'Map',entries:[...value.entries()]};
  if(value instanceof Set)
    return {$fwReplayCollection:'Set',entries:[...value.values()]};
  return value;
}
function decodeCollection(_key:string,value:unknown):unknown{
  if(!value||typeof value!=='object')return value;
  const tag=value as { $fwReplayCollection?:string;entries?:unknown };
  if(tag.$fwReplayCollection==='Map'&&Array.isArray(tag.entries))
    return new Map(tag.entries);
  if(tag.$fwReplayCollection==='Set'&&Array.isArray(tag.entries))
    return new Set(tag.entries);
  return value;
}
async function limitedBytes(
  stream:ReadableStream<Uint8Array>,max:number
):Promise<Uint8Array>{
  const reader=stream.getReader(),chunks:Uint8Array[]=[];
  let length=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      length+=value.byteLength;
      if(length>max)throw Error('Replay file exceeds safe decompressed size');
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const result=new Uint8Array(length);
  let cursor=0;
  for(const part of chunks){result.set(part,cursor);cursor+=part.byteLength;}
  return result;
}
export function portableReplaySupported():boolean{
  return typeof CompressionStream!=='undefined'&&
    typeof DecompressionStream!=='undefined';
}
export async function exportPortableReplay(
  archive:ReplayArchiveV1
):Promise<Blob>{
  if(!replayArchiveIsValid(archive))
    throw Error('Cannot export invalid replay film');
  if(!portableReplaySupported())
    throw Error('This browser does not support compressed replay files');
  const json=JSON.stringify(archive,encodeCollection);
  if(json.length>MAX_REPLAY_JSON_BYTES)
    throw Error('Replay is too large for portable export');
  const blob=await new Response(new Blob([json]).stream()
    .pipeThrough(new CompressionStream('gzip'))).blob();
  if(blob.size>MAX_REPLAY_FILE_BYTES)
    throw Error('Compressed replay exceeds the export limit');
  return blob;
}
export async function importPortableReplay(blob:Blob):Promise<ReplayArchiveV1>{
  if(!portableReplaySupported())
    throw Error('This browser cannot import compressed replay files');
  if(blob.size<16||blob.size>MAX_REPLAY_FILE_BYTES)
    throw Error('Replay file size is invalid');
  const magic=new Uint8Array(await blob.slice(0,2).arrayBuffer());
  if(magic[0]!==0x1f||magic[1]!==0x8b)
    throw Error('Not a compressed Fieldwork replay');
  const decoded=await limitedBytes(blob.stream()
    .pipeThrough(new DecompressionStream('gzip')),MAX_REPLAY_JSON_BYTES);
  let data:unknown;
  try{data=JSON.parse(new TextDecoder().decode(decoded),decodeCollection);}
  catch{throw Error('Replay file content is unreadable');}
  if(!replayArchiveIsValid(data))
    throw Error('Unsupported or corrupt Fieldwork replay');
  return data;
}
