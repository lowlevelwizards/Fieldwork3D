/** Gallery thumbnails are renders of the SAME actual weapon geometry.
 * A single reused WebGL context handles both card and hero snapshots.
 * No separate, misleading illustration assets or per-card WebGL renderers.
 */
import * as THREE from 'three';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER} from '../weapons/geometry/weapon-visual-palette.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {configureGraphicRendererOutput} from '../rendering/graphic-lighting-profile.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../breach-weapon-accessories.ts';
import {weaponVisualLayout} from '../weapons/geometry/weapon-visual-layout.ts';
import {workbenchFitDistance} from '../weapons/geometry/weapon-workbench-camera-fit.ts';
import {arsenalRecipeToLegacy,type ArsenalRecipeV2} from './recipes.ts';
import {MOUNTABLE_SLOTS} from '../weapons/geometry/weapon-mount-selections.ts';
import {ArsenalWeaponGeometryPool} from './weapon-geometry-pool.ts';

export class ArsenalThumbnailer{
 private renderer:THREE.WebGLRenderer|null=null;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.PerspectiveCamera(37,2.4,.1,300);
 private readonly steel=WEAPON_ACCESSORY_STEEL;
 private readonly dark=WEAPON_ACCESSORY_POLYMER;
 private readonly cache=new Map<string,string>();
 private readonly geometryPool=new ArsenalWeaponGeometryPool();
 private readonly poolEnabled=new URLSearchParams(location.search)
  .get('e626Weapon')==='1';
 private unavailable=false;
 constructor(){
  addArsenalInspectionLighting(this.scene);
 }
 render(recipe:ArsenalRecipeV2,size:'card'|'hero'='card'):string|undefined{
  const id=[recipe.platformId,recipe.weapon,...Object.values(recipe.parts),
   ...Object.values(recipe.accessories),
   ...MOUNTABLE_SLOTS.map(slot=>{
    const m=recipe.mountSelections?.[slot];
    return m?[m.attachmentId,m.ownerPartId,m.surfaceId,m.face,
     m.standard,m.position].join(':'):'auto';
   }),size].join('/');
  const cached=this.cache.get(id);if(cached)return cached;
  const config=arsenalRecipeToLegacy(recipe);
  if(!config||this.unavailable)return undefined;
  let body:THREE.Group|null=null,extras:THREE.Group|null=null,gun:THREE.Group|null=null;
  try{
   if(!this.renderer){
    this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,
     preserveDrawingBuffer:true,powerPreference:'low-power'});
    configureGraphicRendererOutput(this.renderer);
   this.renderer.setPixelRatio(1);
   }
   const width=size==='hero'?900:400,height=size==='hero'?350:160;
   this.renderer.setSize(width,height,false);
   this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
   body=buildWeaponSilhouette(config.weapon,this.steel,this.dark,config);
   if(this.poolEnabled){
    const stats=this.geometryPool.adopt(body);
    // Browser A/B evidence only. No new DOM panels or persistent controls.
    document.body.dataset.e626GalleryHits=String(stats.hits);
    document.body.dataset.e626GalleryGeometries=String(stats.geometries);
   }
   extras=buildWeaponAccessories(config,this.steel,this.dark);
   gun=new THREE.Group();
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
   if(this.cache.size>100)this.cache.clear();
   this.cache.set(id,encoded);
   return encoded;
  }catch{
   this.unavailable=true;
   return undefined;
  }finally{
   // A failed screenshot must not strand the shared geometry lease or leave
   // an invisible model attached to the reused thumbnail WebGL scene.
   if(gun)this.scene.remove(gun);
   if(body){
    if(this.poolEnabled)this.geometryPool.release(body);
    else clearWeaponSilhouette(body);
   }
   if(extras){
    extras.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
    extras.clear();
   }
  }
 }
 dispose(){
  this.renderer?.dispose();this.renderer?.forceContextLoss();this.renderer=null;
  // Finish materials belong to the registry, buffers to this WebGL viewer.
  this.geometryPool.clear();this.cache.clear();
 }
}
