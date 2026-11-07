/** Gallery thumbnails are renders of the SAME actual weapon geometry.
 * A single reused WebGL context handles both card and hero snapshots.
 * No separate, misleading illustration assets or per-card WebGL renderers.
 */
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../breach-weapon-accessories.ts';
import {weaponVisualLayout} from '../weapons/geometry/weapon-visual-layout.ts';
import {workbenchFitDistance} from '../weapons/geometry/weapon-workbench-camera-fit.ts';
import {arsenalRecipeToLegacy,type ArsenalRecipeV2} from './recipes.ts';

export class ArsenalThumbnailer{
 private renderer:THREE.WebGLRenderer|null=null;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.PerspectiveCamera(37,2.4,.1,300);
 private readonly steel=new THREE.MeshStandardMaterial({color:0x707875,roughness:.78,flatShading:true});
 private readonly dark=new THREE.MeshStandardMaterial({color:0x303a38,roughness:.84,flatShading:true});
 private readonly cache=new Map<string,string>();
 private unavailable=false;
 constructor(){
  this.scene.background=new THREE.Color(0x162723);
  this.scene.add(new THREE.HemisphereLight(0xe2e9d9,0x253c36,2.3));
  const key=new THREE.DirectionalLight(0xf8d8a8,2.6);
  key.position.set(30,55,70);this.scene.add(key);
 }
 render(recipe:ArsenalRecipeV2,size:'card'|'hero'='card'):string|undefined{
  const id=[recipe.platformId,recipe.weapon,...Object.values(recipe.parts),
   ...Object.values(recipe.accessories),size].join('/');
  const cached=this.cache.get(id);if(cached)return cached;
  const config=arsenalRecipeToLegacy(recipe);
  if(!config||this.unavailable)return undefined;
  try{
   if(!this.renderer){
    this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,
     preserveDrawingBuffer:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(1);
   }
   const width=size==='hero'?900:400,height=size==='hero'?350:160;
   this.renderer.setSize(width,height,false);
   this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
   const body=buildWeaponSilhouette(config.weapon,this.steel,this.dark,config);
   const extras=buildWeaponAccessories(config,this.steel,this.dark);
   const gun=new THREE.Group();
   gun.add(body,extras);
   gun.scale.x=weaponVisualLayout(config).longitudinalScale;
   this.scene.add(gun);gun.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(gun);
   const center=bounds.getCenter(new THREE.Vector3());
   const distance=workbenchFitDistance(bounds,width,height,37,.72,
    config.build?.parts.receiver==='hk-mp5k-stockless');
   this.camera.position.set(center.x,center.y,distance);
   this.camera.lookAt(center);this.camera.updateProjectionMatrix();
   this.renderer.render(this.scene,this.camera);
   const encoded=this.renderer.domElement.toDataURL('image/webp',.74);
   this.scene.remove(gun);
   clearWeaponSilhouette(body);
   extras.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
   extras.clear();
   if(this.cache.size>100)this.cache.clear();
   this.cache.set(id,encoded);
   return encoded;
  }catch{
   this.unavailable=true;
   return undefined;
  }
 }
 dispose(){
  this.renderer?.dispose();this.renderer?.forceContextLoss();this.renderer=null;
  this.steel.dispose();this.dark.dispose();this.cache.clear();
 }
}
