/** R5.1 operator-only Studio key light and shadow camera.
 * The wardrobe thumbnail scene shares the renderer, so only the main
 * operator key casts; camera-only navigation never invalidates the map.
 */
import * as THREE from 'three';

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
export const STUDIO_KEY_DIRECTION=new THREE.Vector3(.46,.88,.07).normalize();
export const STUDIO_SHADOW_PAD=3;
export function studioShadowMode(search:string):StudioShadowMode{
 const value=new URLSearchParams(search).get('operatorLighting');
 return value==='legacy'?'legacy':'hybrid';
}
export function studioShadowSize(search:string):512|1024{
 return new URLSearchParams(search).get('operatorShadowSize')==='512'?512:1024;
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
 light:THREE.DirectionalLight,root:THREE.Object3D,padding=STUDIO_SHADOW_PAD
):boolean{
 const bounds=visibleOperatorBounds(root);
 if(!bounds)return false;
 const center=bounds.getCenter(new THREE.Vector3());
 const eye=center.clone().addScaledVector(STUDIO_KEY_DIRECTION,100);
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
 private liveEnabled:boolean;
 private readonly renderer:THREE.WebGLRenderer;
 readonly shadowSize:512|1024;
 constructor(scene:THREE.Scene,renderer:THREE.WebGLRenderer,
  search:string,shadowSizeOverride?:512|1024){
  this.renderer=renderer;
  this.mode=studioShadowMode(search);
  this.shadowSize=shadowSizeOverride??studioShadowSize(search);
  const legacy=this.mode==='legacy';
  this.liveEnabled=!legacy;
  const p=STUDIO_INSPECTION_LIGHT;
  this.hemisphere=new THREE.HemisphereLight(p.sky,p.ground,
   legacy?p.legacyHemiIntensity:p.hemiIntensity);
  this.key=new THREE.DirectionalLight(p.key,
   legacy?p.legacyKeyIntensity:p.keyIntensity);
  this.fill=new THREE.DirectionalLight(p.fill,
   legacy?p.legacyFillIntensity:p.fillIntensity);
  this.fill.position.set(-35,23,30);
  this.key.position.copy(STUDIO_KEY_DIRECTION).multiplyScalar(100);
  this.key.castShadow=this.liveEnabled;
  this.key.shadow.mapSize.set(this.shadowSize,this.shadowSize);
  this.key.shadow.bias=-.0001;
  this.key.shadow.normalBias=.02;
  this.key.shadow.radius=1;
  this.renderer.shadowMap.enabled=this.liveEnabled;
  this.renderer.shadowMap.autoUpdate=false;
  this.renderer.shadowMap.type=THREE.BasicShadowMap;
  scene.add(this.hemisphere,this.key,this.fill,this.key.target);
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
  if(fitStudioKeyShadow(this.key,operator)){
   this.renderer.shadowMap.needsUpdate=true;
   this.dirty=false;
  }
 }
 get diagnostics(){
  return {mode:this.mode,shadowSize:this.shadowSize,
   shadowEnabled:this.liveEnabled,dirty:this.dirty};
 }
}
