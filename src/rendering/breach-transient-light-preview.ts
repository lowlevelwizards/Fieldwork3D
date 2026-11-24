/** V7: opt-in fixed, shadowless local illumination budget.
 * Sources come exclusively from already-disclosed recorded visual events.
 * Keep light count constant even while idle: no per-shot shader permutations.
 * Point lights are NOT wall-occluded; this audition is not release-ready.
 */
import * as THREE from 'three';
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
 begin(){this.muzzle.intensity=0;this.flash.intensity=0;this.muzzleId=this.flashId=-Infinity;}
 offer(channel:Channel,id:number,x:number,y:number,z:number,age:number,strength=1){
  if(![id,x,y,z].every(Number.isFinite))return;
  const light=this[channel],intensity=transientLightIntensity(channel,age,strength);
  const previous=channel==='muzzle'?this.muzzleId:this.flashId;
  if(intensity<=0||intensity<light.intensity||intensity===light.intensity&&id<=previous)return;
  light.position.set(x,y,z);light.intensity=intensity;
  if(channel==='muzzle')this.muzzleId=id;else this.flashId=id;
 }
 reset(){this.begin();}
 dispose(){this.begin();this.root.remove(this.muzzle,this.flash);this.muzzle.dispose();this.flash.dispose();}
}
