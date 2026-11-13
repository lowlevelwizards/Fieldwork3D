/** A1 visual-only choreography kernel.
 * A clip is an immutable-by-convention description sampled at an existing
 * simulation or preview timestamp. This is NOT a clock or gameplay event bus.
 * No Three.js scene writers, collisions, actions, muzzle or inventory. */
export type ChoreographyEase='linear'|'smooth'|'hold';
export type ChoreographyKey<T>={
 readonly at:number;readonly value:T;readonly ease?:ChoreographyEase
};
export type ChoreographyMarker={
 readonly at:number;readonly kind:'cue'|'contact';readonly name:string
};
export type ChoreographyClip<T>={
 readonly version:1;readonly id:string;readonly duration:number;
 readonly keys:readonly ChoreographyKey<T>[];
 readonly markers?:readonly ChoreographyMarker[];
};
const clamp01=(value:number)=>Math.max(0,Math.min(1,value));
export function validateChoreography<T>(clip:ChoreographyClip<T>):void{
 if(!clip||clip.version!==1||
   typeof clip.id!=='string'||!clip.id||clip.id.length>100||
   !Number.isFinite(clip.duration)||clip.duration<=0||
   clip.duration>60||!Array.isArray(clip.keys)||
   clip.keys.length<2||clip.keys.length>64)
  throw Error('A1: invalid choreography clip');
 if(Math.abs(clip.keys[0].at)>1e-8||
   Math.abs(clip.keys[clip.keys.length-1].at-clip.duration)>1e-8)
  throw Error('A1: clip requires start/end keys');
 let previous=-Infinity;
 for(const key of clip.keys){
  if(!key||!Number.isFinite(key.at)||key.at<=previous||
   key.at<0||key.at>clip.duration||
   key.value===undefined||
   key.ease!==undefined&&!['linear','smooth','hold'].includes(key.ease))
   throw Error('A1: keys must be ordered and in range');
  previous=key.at;
 }
 if(clip.markers){
  if(!Array.isArray(clip.markers)||clip.markers.length>128)
   throw Error('A1: too many markers');
  previous=-Infinity;
  for(const marker of clip.markers){
   if(!marker||!Number.isFinite(marker.at)||marker.at<previous||
    marker.at<0||marker.at>clip.duration||
    !['cue','contact'].includes(marker.kind)||
    typeof marker.name!=='string'||!marker.name||
    marker.name.length>80)
    throw Error('A1: invalid marker');
   previous=marker.at;
  }
 }
}
export function sampleChoreography<T>(
 clip:ChoreographyClip<T>,time:number,
 interpolate:(a:T,b:T,alpha:number)=>T
):T{
 const keys=clip.keys;
 if(!Number.isFinite(time)||time<=0)return keys[0].value;
 if(time>=clip.duration)return keys[keys.length-1].value;
 let left=0,right=keys.length-1;
 while(right-left>1){
  const mid=(left+right)>>1;
  if(keys[mid].at<=time)left=mid;else right=mid;
 }
 const a=keys[left],b=keys[right];
 const raw=clamp01((time-a.at)/(b.at-a.at));
 const t=a.ease==='hold'?0:a.ease==='smooth'?
  raw*raw*(3-2*raw):raw;
 return interpolate(a.value,b.value,t);
}
/** Forward-only crossing query for visual inspection/export. Seek and replay
 * never emit simulated events; callers only read these markers as metadata. */
export function choreographyMarkersBetween<T>(
 clip:ChoreographyClip<T>,from:number,to:number
):readonly ChoreographyMarker[]{
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return [];
 return (clip.markers??[]).filter(m=>m.at>from&&m.at<=to);
}
export type ThrowSupportOffset={forward:number;lift:number};
export const THROW_SUPPORT_GESTURE:ChoreographyClip<ThrowSupportOffset>={
 version:1,id:'throw-support-v1',duration:.70,
 keys:[
  {at:0,value:{forward:0,lift:0}},
  {at:.10,value:{forward:-1.1,lift:-.7},ease:'smooth'},
  {at:.25,value:{forward:4.2,lift:5.8},ease:'smooth'},
  {at:.36,value:{forward:8,lift:8.2},ease:'smooth'},
  {at:.47,value:{forward:6.5,lift:6.3},ease:'smooth'},
  {at:.70,value:{forward:0,lift:0}}
 ],
 // Informational ONLY. The gameplay throw/release timing is unchanged.
 markers:[{at:.36,kind:'cue',name:'visual-release-peak'}]
};
const lerpThrow=(a:ThrowSupportOffset,b:ThrowSupportOffset,t:number):
 ThrowSupportOffset=>({
 forward:a.forward+(b.forward-a.forward)*t,
 lift:a.lift+(b.lift-a.lift)*t
});
export const throwSupportGesture=(age:number):ThrowSupportOffset=>
 sampleChoreography(THROW_SUPPORT_GESTURE,age,lerpThrow);
