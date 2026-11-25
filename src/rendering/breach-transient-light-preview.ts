/** Fixed, shadowless local illumination budget.
 * Sources come exclusively from already-disclosed recorded visual events.
 * V17.3a bounds the point-light sphere by the nearest opaque surface.
 * Directional receiver-side extension through openings is a later stage.
 */
import * as THREE from 'three';
import {safeTransientLightRange,type TransientLightWorld} from './breach-transient-light-geometry.ts';
import type {Door} from '../breach-core.ts';
export const TRANSIENT_LIGHT_LIMIT=2;
type Channel='muzzle'|'flash';
const settings={muzzle:{color:0xffd5a0,range:24,peak:180,life:.09},
 flash:{color:0xfff1ce,range:58,peak:1150,life:.24}} as const;
export function transientLightIntensity(channel:Channel,age:number,strength=1):number{
 const p=settings[channel];
 if(!Number.isFinite(age)||age<0||age>=p.life||!Number.isFinite(strength))return 0;
 const t=1-age/p.life;
 return p.peak*t*t*Math.max(0,Math.min(1,strength));
}
export class TransientLightPreview{
 readonly muzzle=new THREE.PointLight(settings.muzzle.color,0,settings.muzzle.range,2);
 readonly flash=new THREE.PointLight(settings.flash.color,0,settings.flash.range,2);
 private muzzleId=-Infinity;private flashId=-Infinity;
 private readonly root:THREE.Object3D;
 constructor(root:THREE.Object3D){
  this.root=root;
  for(const light of [this.muzzle,this.flash]){
   light.castShadow=false;
   light.userData.fieldworkRenderCategory='effects';
   root.add(light);
  }
 }
 begin(){this.muzzle.intensity=0;this.flash.intensity=0;this.muzzleId=this.flashId=-Infinity;
  this.muzzle.distance=settings.muzzle.range;this.flash.distance=settings.flash.range;}
 offer(channel:Channel,id:number,x:number,y:number,z:number,age:number,strength=1){
  if(!Number.isFinite(id)||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))return;
  const light=this[channel],intensity=transientLightIntensity(channel,age,strength);
  const previous=channel==='muzzle'?this.muzzleId:this.flashId;
  if(intensity<=0||intensity<light.intensity||intensity===light.intensity&&id<=previous)return;
  light.position.set(x,y,z);light.intensity=intensity;
  if(channel==='muzzle')this.muzzleId=id;else this.flashId=id;
 }
 /** Call once after selecting eligible events, never once per candidate.
  * Fail closed instead of allowing the Three.js distance=0 infinite range.
  */
 confine(world:TransientLightWorld,doors:readonly Door[]){
  for(const channel of ['muzzle','flash'] as const){
   const light=this[channel];if(light.intensity<=0)continue;
   const distance=safeTransientLightRange(world,doors,
    {x:light.position.x,y:light.position.z},settings[channel].range);
   light.distance=Math.max(.001,distance);
   if(distance<=.001)light.intensity=0;
  }
 }
 reset(){this.begin();}
 dispose(){this.begin();this.root.remove(this.muzzle,this.flash);this.muzzle.dispose();this.flash.dispose();}
}
