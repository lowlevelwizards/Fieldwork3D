/** R5.1 operator-only Studio key light and shadow camera.
 * The wardrobe thumbnail scene shares the renderer, so only the main
 * operator key casts; camera-only navigation never invalidates the map.
 */
import * as THREE from 'three';
import {requestedStudioRenderQuality}
 from './operator-studio-render-quality.ts';

export type StudioShadowMode='legacy'|'hybrid';
/** Shared presentation constants: full-size operator and all appearance cards
 * must not independently select backgrounds or key/fill light values. */
export const STUDIO_INSPECTION_BACKGROUND=0xc4c7bd;
export const STUDIO_INSPECTION_LIGHT={
 sky:0xffffff,ground:0x798a7f,
 key:0xfff2d6,fill:0xaec5c2,
 keyIntensity:2.35,fillIntensity:.45,hemiIntensity:1.20,
 legacyKeyIntensity:2.8,legacyFillIntensity:1.0,
 legacyHemiIntensity:2.0
} as const;
/** R7 experimental colored shadow-side fill: no extra shadow pass, no
 * changes to the neutral baked contact/occlusion masks. Disabled by default.
 * The actual scene shadow map remains the single source of cast occlusion. */
export type StudioShadowColor='neutral'|'steel'|'slate'|'plum'|'dusk'|'plum-plus'|'plum-noir';
const STUDIO_SHADOW_PALETTES:Record<StudioShadowColor,
 {ground:number;fill:number}>={
 neutral:{ground:STUDIO_INSPECTION_LIGHT.ground,fill:STUDIO_INSPECTION_LIGHT.fill},
 steel:{ground:0x65748f,fill:0x96adc6},
 slate:{ground:0x58717c,fill:0x99bdc2},
 plum:{ground:0x786786,fill:0xb8a7ca},
 'plum-plus':{ground:0x5b466c,fill:0xd1a2ed},
 'plum-noir':{ground:0x473755,fill:0xd5a3ed},
 dusk:{ground:0x686986,fill:0x9b9fbf}
};
/** Shared values for Studio, Arsenal and tactical presentation.
 * Does not expose Studio render quality or shadow resolution. */
export function studioShadowPalette(name:StudioShadowColor){
 return STUDIO_SHADOW_PALETTES[name];
}
export function requestedStudioShadowColor(search:string):StudioShadowColor{
 const v=new URLSearchParams(search).get('operatorShadowColor');
 return v==='steel'||v==='slate'||v==='plum'||v==='dusk'||
  v==='plum-plus'||v==='plum-noir'?v:'neutral';
}
export function studioShadowFill(search:string){
 return STUDIO_SHADOW_PALETTES[requestedStudioShadowColor(search)];
}
export const STUDIO_KEY_DIRECTION=new THREE.Vector3(.46,.88,.07).normalize();
export const STUDIO_SHADOW_PAD=3;
export function studioShadowMode(search:string):StudioShadowMode{
 const value=new URLSearchParams(search).get('operatorLighting');
 return value==='legacy'?'legacy':'hybrid';
}
export function studioShadowSize(search:string):512|1024|2048{
 const value=new URLSearchParams(search).get('studioShadowSize')??
  new URLSearchParams(search).get('operatorShadowSize');
 return value==='1024'?1024:value==='512'?512:2048;
}
export function visibleOperatorBounds(root:THREE.Object3D):THREE.Box3|null{
 root.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3();
 const partBox=new THREE.Box3();
 root.traverse(node=>{
  if(!(node instanceof THREE.Mesh)||(!node.castShadow&&!node.receiveShadow))return;
  let parent:THREE.Object3D|null=node;
  while(parent){
   if(!parent.visible)return;
   if(parent===root)break;
   parent=parent.parent;
  }
  const geo=node.geometry as THREE.BufferGeometry;
  if(!geo.getAttribute('position'))return;
  if(!geo.boundingBox)geo.computeBoundingBox();
  if(!geo.boundingBox||geo.boundingBox.isEmpty())return;
  partBox.copy(geo.boundingBox).applyMatrix4(node.matrixWorld);
  bounds.union(partBox);
 });
 return bounds.isEmpty()?null:bounds;
}
/** One fixed model-space direction, no camera-following highlight or rear
 * light mirroring. Frustum fitted to TRUE visible mesh bounds, not hidden
 * alternate wardrobe prototypes. Works independently of orbit/zoom.
 */
export function fitStudioKeyShadow(
 light:THREE.DirectionalLight,root:THREE.Object3D,padding=STUDIO_SHADOW_PAD,
 direction:THREE.Vector3=STUDIO_KEY_DIRECTION
):boolean{
 const bounds=visibleOperatorBounds(root);
 if(!bounds)return false;
 const center=bounds.getCenter(new THREE.Vector3());
 const eye=center.clone().addScaledVector(direction,100);
 light.position.copy(eye);
 light.target.position.copy(center);
 light.target.updateMatrixWorld();
 const view=new THREE.Matrix4().lookAt(eye,center,new THREE.Vector3(0,1,0)).invert();
 const min=new THREE.Vector3(Infinity,Infinity,Infinity);
 const max=new THREE.Vector3(-Infinity,-Infinity,-Infinity);
 const corners=[
  [bounds.min.x,bounds.min.y,bounds.min.z],[bounds.min.x,bounds.min.y,bounds.max.z],
  [bounds.min.x,bounds.max.y,bounds.min.z],[bounds.min.x,bounds.max.y,bounds.max.z],
  [bounds.max.x,bounds.min.y,bounds.min.z],[bounds.max.x,bounds.min.y,bounds.max.z],
  [bounds.max.x,bounds.max.y,bounds.min.z],[bounds.max.x,bounds.max.y,bounds.max.z]
 ];
 for(const c of corners){
  const point=new THREE.Vector3(c[0],c[1],c[2]).sub(eye).applyMatrix4(view);
  min.min(point);max.max(point);
 }
 const camera=light.shadow.camera as THREE.OrthographicCamera;
 camera.left=min.x-padding;camera.right=max.x+padding;
 camera.bottom=min.y-padding;camera.top=max.y+padding;
 camera.near=Math.max(.1,-max.z-padding);
 camera.far=Math.max(camera.near+1,-min.z+padding);
 camera.updateProjectionMatrix();
 light.shadow.needsUpdate=true;
 return true;
}
export class OperatorStudioLighting{
 readonly hemisphere:THREE.HemisphereLight;
 readonly key:THREE.DirectionalLight;
 readonly fill:THREE.DirectionalLight;
 readonly mode:StudioShadowMode;
 private dirty=true;
 private keyAngle=0;
 private readonly keyDirection=STUDIO_KEY_DIRECTION.clone();
 private liveEnabled:boolean;
 private readonly renderer:THREE.WebGLRenderer;
 readonly shadowSize:512|1024|2048;
 constructor(scene:THREE.Scene,renderer:THREE.WebGLRenderer,
  search:string,shadowSizeOverride?:512|1024|2048){
  this.renderer=renderer;
  this.mode=studioShadowMode(search);
  this.shadowSize=shadowSizeOverride??studioShadowSize(search);
  const legacy=this.mode==='legacy';
  const quality=requestedStudioRenderQuality(search);
  this.liveEnabled=!legacy&&quality.liveShadows;
  const p=STUDIO_INSPECTION_LIGHT;
  const shadowFill=studioShadowFill(search);
  this.hemisphere=new THREE.HemisphereLight(p.sky,shadowFill.ground,
   legacy?p.legacyHemiIntensity:p.hemiIntensity);
  this.key=new THREE.DirectionalLight(p.key,
   legacy?p.legacyKeyIntensity:p.keyIntensity);
  this.fill=new THREE.DirectionalLight(shadowFill.fill,
   legacy?p.legacyFillIntensity:p.fillIntensity);
  this.fill.position.set(-35,23,30);
  this.key.position.copy(STUDIO_KEY_DIRECTION).multiplyScalar(100);
  this.key.castShadow=this.liveEnabled;
  this.key.shadow.mapSize.set(this.shadowSize,this.shadowSize);
  this.key.shadow.bias=quality.shadowBias==='legacy'?-.0001:.00008;
  this.key.shadow.normalBias=quality.shadowBias==='legacy'?.02:.042;
  this.key.shadow.radius=1;
  this.renderer.shadowMap.enabled=this.liveEnabled;
  this.renderer.shadowMap.autoUpdate=false;
  this.renderer.shadowMap.type=quality.shadowFilter==='hard'?
   THREE.BasicShadowMap:quality.shadowFilter==='soft'?
   THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
  scene.add(this.hemisphere,this.key,this.fill,this.key.target);
 }
 /** Retint only existing hemisphere ground + fill lights; never change
  * neutral baked AO, authored print colors or shadow-map occlusion. */
 setShadowColor(color:StudioShadowColor):void{
  const palette=STUDIO_SHADOW_PALETTES[color];
  this.hemisphere.groundColor.setHex(palette.ground);
  this.fill.color.setHex(palette.fill);
  const legacy=this.mode==='legacy';
  const p=STUDIO_INSPECTION_LIGHT;
  this.fill.intensity=(legacy?p.legacyFillIntensity:p.fillIntensity)*
   (color==='plum-plus'?1.35:color==='plum-noir'?1.5:1);
 }
 /** Lab-only orbit. The approved zero-angle key is restored on A/B compare. */
 setKeyAngle(degrees:number){
  const angle=THREE.MathUtils.clamp(degrees,-180,180);
  if(angle===this.keyAngle)return;
  this.keyAngle=angle;
  this.keyDirection.copy(STUDIO_KEY_DIRECTION)
   .applyAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(angle));
  this.key.position.copy(this.keyDirection).multiplyScalar(100);
  this.invalidateGeometry();
 }
 invalidateGeometry(){this.dirty=true;}
 setLiveShadows(enabled:boolean){
  if(this.mode==='legacy')return;
  this.liveEnabled=enabled;
  this.key.castShadow=enabled;
  this.renderer.shadowMap.enabled=enabled;
  this.invalidateGeometry();
 }
 beforeRender(operator:THREE.Object3D|null){
  if(!operator||!this.liveEnabled||!this.dirty)return;
  if(fitStudioKeyShadow(this.key,operator,STUDIO_SHADOW_PAD,this.keyDirection)){
   this.renderer.shadowMap.needsUpdate=true;
   this.dirty=false;
  }
 }
 get diagnostics(){
  return {mode:this.mode,shadowSize:this.shadowSize,
   shadowEnabled:this.liveEnabled,dirty:this.dirty};
 }
}
