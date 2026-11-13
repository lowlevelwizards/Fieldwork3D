/** A1 authored pose sequences. Editor-only schema; runtime sees only
 * time-sampled gesture values and the existing IK/pose-output contracts. */
import {sampleChoreography,validateChoreography,
 type ChoreographyClip,type ChoreographyMarker}
 from './breach-animation-choreography.ts';
import {cloneWorkbenchPose,interpolateWorkbenchPose,readWorkbenchPose,
 type WorkbenchPose} from './operator-pose-workbench.ts';
export type WorkbenchChoreography=ChoreographyClip<WorkbenchPose>&{
 readonly format:'fieldwork-pose-choreography';
 readonly preset:string;
};
export function createWorkbenchChoreography(
 baseline:WorkbenchPose,final:WorkbenchPose,duration=1.2
):WorkbenchChoreography{
 if(baseline.weapon!==final.weapon||baseline.preset!==final.preset)
  throw Error('A1: poses must use the same weapon preset');
 const clip:WorkbenchChoreography={
  version:1,format:'fieldwork-pose-choreography',
  id:'authored-'+final.preset,preset:final.preset,duration,
  keys:[{at:0,value:cloneWorkbenchPose(baseline)},
        {at:duration,value:cloneWorkbenchPose(final)}],
  markers:[]
 };
 validateChoreography(clip);
 return clip;
}
export function sampleWorkbenchChoreography(
 clip:WorkbenchChoreography,time:number
):WorkbenchPose{
 // Existing workbench interpolation applies its ease exactly once.
 return sampleChoreography(clip,time,interpolateWorkbenchPose);
}
export function upsertWorkbenchKey(
 clip:WorkbenchChoreography,time:number,pose:WorkbenchPose
):WorkbenchChoreography{
 if(pose.preset!==clip.preset||pose.weapon!==clip.keys[0].value.weapon)
  throw Error('A1: keyframe weapon mismatch');
 const at=Math.round(Math.max(0,Math.min(clip.duration,time))*1000)/1000;
 const keys=clip.keys.filter(k=>Math.abs(k.at-at)>.005)
  .map(k=>({at:k.at,value:cloneWorkbenchPose(k.value)}));
 keys.push({at,value:cloneWorkbenchPose(pose)});
 keys.sort((a,b)=>a.at-b.at);
 // Workbench sequences always have absolute endpoints.
 if(keys[0].at!==0||keys[keys.length-1].at!==clip.duration)
  throw Error('A1: cannot remove start/end key');
 const result={...clip,keys};
 validateChoreography(result);
 return result;
}
export function removeWorkbenchKey(
 clip:WorkbenchChoreography,time:number
):WorkbenchChoreography{
 const keys=clip.keys.filter(k=>k.at===0||k.at===clip.duration||
  Math.abs(k.at-time)>.015);
 const result={...clip,keys};
 validateChoreography(result);
 return result;
}
export function addWorkbenchMarker(
 clip:WorkbenchChoreography,at:number,kind:ChoreographyMarker['kind'],
 name:string
):WorkbenchChoreography{
 const marker={at:Math.round(Math.max(0,Math.min(clip.duration,at))*1000)/1000,
  kind,name:name.trim().slice(0,80)};
 const markers=[...(clip.markers??[]),marker]
   .sort((a,b)=>a.at-b.at||a.name.localeCompare(b.name));
 const result={...clip,markers};
 validateChoreography(result);
 return result;
}
/** Version/shape/size validation before any editor mutation. No imports
 * from JSON may execute code or alter the active combat animation. */
export function readWorkbenchChoreography(source:string):
 WorkbenchChoreography{
 if(source.length>100000)throw Error('A1: choreography JSON too large');
 const obj:unknown=JSON.parse(source);
 if(!obj||typeof obj!=='object')throw Error('A1: expected object');
 const raw=obj as Record<string,unknown>;
 if(raw.version!==1||raw.format!=='fieldwork-pose-choreography'||
  typeof raw.preset!=='string'||!Array.isArray(raw.keys))
  throw Error('A1: unsupported choreography format');
 const keys=raw.keys.map(k=>{
  if(!k||typeof k!=='object')throw Error('A1: invalid key');
  const key=k as Record<string,unknown>;
  return {at:key.at as number,ease:key.ease as 'linear'|'smooth'|'hold'|undefined,
   value:readWorkbenchPose(JSON.stringify(key.value))};
 });
 const markers=Array.isArray(raw.markers)?raw.markers.map(m=>{
  if(!m||typeof m!=='object')throw Error('A1: invalid cue');
  const marker=m as Record<string,unknown>;
  return {at:marker.at as number,kind:marker.kind as 'cue'|'contact',
   name:marker.name as string};
 }):raw.markers===undefined?[]:null;
 if(markers===null)throw Error('A1: invalid cue list');
 const clip:WorkbenchChoreography={
  version:1,format:'fieldwork-pose-choreography',
  id:raw.id as string,preset:raw.preset,
  duration:raw.duration as number,keys,markers
 };
 validateChoreography(clip);
 if(keys.some(k=>k.value.preset!==clip.preset||
  k.value.weapon!==keys[0].value.weapon))
  throw Error('A1: mixed weapon/preset sequence');
 return clip;
}
